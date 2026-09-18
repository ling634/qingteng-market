// ---------------------------------------------------------------
// Vercel Serverless Function：私信 WxPusher 微信推送
// POST /api/notify-message
//
// 触发链路：
//   用户A发私信 → 前端 sendMessage 成功后 fire-and-forget 调用本接口
//   → 校验A的登录凭证 → 读消息确认发送者 → 找接收方B → 风控判断 → 推送
//
// 风控保护（WxPusher 限制：发送 QPS ≤ 1，单 UID 日收 2000 条）：
//   1. 同一接收用户 10 秒内最多推送 1 次（按实际推送尝试计）
//   2. 全局 1 秒内只允许 1 次推送尝试（贴合 QPS≤1；serverless 并发下是软限制）
//   3. 网络错误/超时最多重试 1 次；拿到业务响应码绝不重试
//   4. 每次请求 5 秒超时；请求体与 WxPusher 完整返回 JSON 写入 push_logs
//
// 环境变量（在 Vercel 项目后台配置，严禁出现在前端代码）：
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / WXPUSHER_APP_TOKEN
// ---------------------------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdmin, getCallerId, wxSend, WX_OK, SITE_URL, type Json } from './_wxpusher';

const RATE_LIMIT_SECONDS = 10; // 同一接收者的推送间隔
const GLOBAL_MIN_INTERVAL_MS = 1000; // 全局最小推送间隔（WxPusher QPS≤1）

/** 写推送日志（失败只告警，不影响主流程） */
async function writeLog(admin: SupabaseClient, entry: Json): Promise<void> {
  const { error } = await admin.from('push_logs').insert(entry);
  if (error) console.error('[notify] push_logs 写入失败：', error.message);
}

export default async function handler(
  req: { method?: string; headers: Record<string, string | undefined>; body?: Json },
  res: { status: (code: number) => { json: (body: Json) => void } },
): Promise<void> {
  const respond = (code: number, body: Json) => res.status(code).json(body);

  if (req.method !== 'POST') {
    respond(405, { ok: false, msg: 'Method Not Allowed' });
    return;
  }
  const { WXPUSHER_APP_TOKEN } = process.env;
  if (!WXPUSHER_APP_TOKEN) {
    console.error('[notify] 缺少 WXPUSHER_APP_TOKEN 环境变量');
    respond(500, { ok: false, msg: '服务端未配置推送服务' });
    return;
  }
  const admin = getAdmin();
  if (!admin) {
    console.error('[notify] 缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 环境变量');
    respond(500, { ok: false, msg: '服务端未配置环境变量' });
    return;
  }

  // 1. 鉴权：必须是登录用户，且只能触发「自己发的消息」的推送
  const callerId = await getCallerId(admin, req);
  if (!callerId) {
    respond(401, { ok: false, msg: '未登录' });
    return;
  }

  // 2. 读消息：确认真实存在、发送者是调用者本人、非系统消息
  const messageId = req.body?.messageId;
  if (typeof messageId !== 'string' || !messageId) {
    respond(400, { ok: false, msg: '缺少 messageId' });
    return;
  }
  const { data: msg } = await admin
    .from('messages')
    .select('id, conversation_id, sender_id, type')
    .eq('id', messageId)
    .maybeSingle();
  if (!msg) {
    respond(404, { ok: false, msg: '消息不存在' });
    return;
  }
  if (msg.sender_id !== callerId) {
    respond(403, { ok: false, msg: '只能触发自己发送的消息' });
    return;
  }
  if (msg.type !== 'text') {
    // 系统消息（确认收货等）不推送
    respond(200, { ok: true, pushed: false, reason: 'system_message' });
    return;
  }

  // 3. 会话 → 确定接收方（角色无关：不是发送者的那一方）
  const { data: conv } = await admin
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', msg.conversation_id)
    .maybeSingle();
  if (!conv) {
    respond(404, { ok: false, msg: '会话不存在' });
    return;
  }
  const recipientId = conv.buyer_id === callerId ? conv.seller_id : conv.buyer_id;

  const logBase = {
    recipient_id: recipientId,
    sender_id: callerId,
    message_id: messageId,
    conversation_id: msg.conversation_id,
  };

  // 4. 接收方未绑定微信推送 → 直接跳过
  const { data: priv } = await admin
    .from('profile_private')
    .select('wxpusher_uid')
    .eq('user_id', recipientId)
    .maybeSingle();
  const uid = priv?.wxpusher_uid as string | null | undefined;
  if (!uid) {
    await writeLog(admin, { ...logBase, status: 'no_token' });
    respond(200, { ok: true, pushed: false, reason: 'no_token' });
    return;
  }

  // 5a. 限流：同一接收者 10 秒内已有实际推送尝试（sent/failed/error）→ 丢弃并记日志
  const since10s = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
  const { data: recent } = await admin
    .from('push_logs')
    .select('id')
    .eq('recipient_id', recipientId)
    .in('status', ['sent', 'failed', 'error'])
    .gte('created_at', since10s)
    .limit(1);
  if (recent && recent.length > 0) {
    console.log(`[notify] 限流拦截：recipient=${recipientId} 10秒内已推送过`);
    await writeLog(admin, { ...logBase, status: 'rate_limited' });
    respond(200, { ok: true, pushed: false, reason: 'rate_limited' });
    return;
  }

  // 5b. 全局限流：1 秒内已有任何推送尝试 → 丢弃（贴合 WxPusher QPS≤1；
  //     serverless 多实例并发下无法严格保证，作为软限制即可，接收人级 10s 才是主防线）
  const since1s = new Date(Date.now() - GLOBAL_MIN_INTERVAL_MS).toISOString();
  const { data: globalRecent } = await admin
    .from('push_logs')
    .select('id')
    .in('status', ['sent', 'failed', 'error'])
    .gte('created_at', since1s)
    .limit(1);
  if (globalRecent && globalRecent.length > 0) {
    console.log('[notify] 全局限流：1 秒内已有推送尝试');
    await writeLog(admin, { ...logBase, status: 'rate_limited' });
    respond(200, { ok: true, pushed: false, reason: 'rate_limited' });
    return;
  }

  // 6. 组装推送内容（summary 是微信卡片标题，content 是点开后的正文）
  const { data: senderProfile } = await admin
    .from('profiles')
    .select('nickname')
    .eq('id', callerId)
    .maybeSingle();
  const senderNickname = (senderProfile?.nickname as string | undefined) ?? '有用户';
  const pushBody: Json = {
    appToken: WXPUSHER_APP_TOKEN,
    content: `用户${senderNickname}给你发送了一条私信，点击查看对话`,
    summary: '【青藤集市】收到新私信',
    contentType: 1,
    url: `${SITE_URL}/messages?conv=${msg.conversation_id}`,
    uids: [uid],
    verifyPayType: 0,
  };

  // 7. 发起推送（日志中 appToken/uid 打码，其余完整记录）
  const maskedBody = {
    ...pushBody,
    appToken: 'AT_***',
    uids: [`${uid.slice(0, 10)}***`],
  };
  console.log(`[notify] 触发推送 sender=${callerId} recipient=${recipientId} 请求体：${JSON.stringify(maskedBody)}`);
  const result = await wxSend(pushBody);

  if (!result.json) {
    // 网络异常/超时，已重试 1 次仍失败
    console.error(`[notify] 推送网络失败（${result.attempts} 次尝试）：${result.error}`);
    await writeLog(admin, {
      ...logBase,
      status: 'error',
      request_body: maskedBody,
      response_body: { error: result.error ?? 'unknown', attempts: result.attempts },
    });
    respond(200, { ok: false, pushed: false, reason: 'network_error' });
    return;
  }

  const code = result.json.code as number | undefined;
  console.log(`[notify] WxPusher 返回（HTTP ${result.httpStatus}）：${JSON.stringify(result.json)}`);
  await writeLog(admin, {
    ...logBase,
    status: code === WX_OK ? 'sent' : 'failed',
    request_body: maskedBody,
    response_code: code ?? result.httpStatus,
    response_body: result.json,
  });
  respond(200, { ok: true, pushed: code === WX_OK, wxCode: code ?? null });
}
