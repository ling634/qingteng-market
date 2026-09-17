// ---------------------------------------------------------------
// Vercel Serverless Function：私信 PushPlus 微信推送
// POST /api/notify-message
//
// 触发链路：
//   用户A发私信 → 前端 sendMessage 成功后 fire-and-forget 调用本接口
//   → 校验A的登录凭证 → 读消息确认发送者 → 找接收方B → 风控判断 → 推送
//
// 风控保护（防止 PushPlus 999 服务端验证错误）：
//   1. 同一接收用户 10 秒内最多调用 1 次 PushPlus（按实际推送尝试计）
//   2. 网络错误/超时最多重试 1 次；拿到业务响应码（含 999/900）绝不重试
//   3. 每次请求 5 秒超时，超时即中止，不循环重试
//   4. 请求体与 PushPlus 完整返回 JSON 均写入 push_logs 表（仅管理员可见）
//
// 环境变量（在 Vercel 项目后台配置，严禁出现在前端代码）：
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// ---------------------------------------------------------------

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PUSHPLUS_API = 'https://www.pushplus.plus/send';
const SITE_URL = 'https://qingtengmarket.xyz';
const PUSH_TIMEOUT_MS = 5000; // 单次请求超时
const MAX_ATTEMPTS = 2; // 首次 + 最多重试 1 次
const RATE_LIMIT_SECONDS = 10; // 同一接收者的推送间隔

type Json = Record<string, unknown>;

/** 调用 PushPlus：网络异常/超时允许重试，拿到业务响应（无论成败）立即返回 */
async function callPushPlus(body: Json): Promise<{
  json: Json | null;
  httpStatus: number | null;
  attempts: number;
  error?: string;
}> {
  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
      const resp = await fetch(PUSHPLUS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const json = (await resp.json().catch(() => null)) as Json | null;
      // 拿到 HTTP 响应即止：999/900 等业务错误码绝不重试
      return { json, httpStatus: resp.status, attempts: attempt };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[notify] 第 ${attempts} 次请求 PushPlus 异常：${lastError}`);
    }
  }
  return { json: null, httpStatus: null, attempts: MAX_ATTEMPTS, error: lastError };
}

/** 写推送日志（失败只告警，不影响主流程） */
async function writeLog(
  admin: SupabaseClient,
  entry: Json,
): Promise<void> {
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
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[notify] 缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 环境变量');
    respond(500, { ok: false, msg: '服务端未配置环境变量' });
    return;
  }

  // 1. 鉴权：必须是登录用户，且只能触发「自己发的消息」的推送
  const accessToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!accessToken) {
    respond(401, { ok: false, msg: '未登录' });
    return;
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !userData.user) {
    respond(401, { ok: false, msg: '登录状态无效' });
    return;
  }
  const callerId = userData.user.id;

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

  // 4. 接收方未绑定 token → 直接跳过
  const { data: priv } = await admin
    .from('profile_private')
    .select('pushplus_token')
    .eq('user_id', recipientId)
    .maybeSingle();
  const pushToken = priv?.pushplus_token as string | null | undefined;
  if (!pushToken) {
    await writeLog(admin, { ...logBase, status: 'no_token' });
    respond(200, { ok: true, pushed: false, reason: 'no_token' });
    return;
  }

  // 5. 限流：同一接收者 10 秒内已有实际推送尝试（sent/failed/error）→ 丢弃并记日志
  const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
  const { data: recent } = await admin
    .from('push_logs')
    .select('id')
    .eq('recipient_id', recipientId)
    .in('status', ['sent', 'failed', 'error'])
    .gte('created_at', since)
    .limit(1);
  if (recent && recent.length > 0) {
    console.log(`[notify] 限流拦截：recipient=${recipientId} 10秒内已推送过`);
    await writeLog(admin, { ...logBase, status: 'rate_limited' });
    respond(200, { ok: true, pushed: false, reason: 'rate_limited' });
    return;
  }

  // 6. 组装推送内容
  const { data: senderProfile } = await admin
    .from('profiles')
    .select('nickname')
    .eq('id', callerId)
    .maybeSingle();
  const senderNickname = (senderProfile?.nickname as string | undefined) ?? '有用户';
  const pushBody: Json = {
    token: pushToken,
    title: '【青藤集市】收到新私信',
    content: `用户${senderNickname}给你发送了一条私信，点击查看对话`,
    template: 'html',
    url: `${SITE_URL}/messages?conv=${msg.conversation_id}`,
  };

  // 7. 发起推送（日志中 token 打码，其余完整记录）
  const maskedBody = { ...pushBody, token: `${pushToken.slice(0, 6)}***` };
  console.log(`[notify] 触发推送 sender=${callerId} recipient=${recipientId} 请求体：${JSON.stringify(maskedBody)}`);
  const result = await callPushPlus(pushBody);

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
  console.log(`[notify] PushPlus 返回（HTTP ${result.httpStatus}）：${JSON.stringify(result.json)}`);
  if (code === 900 || code === 999) {
    // 风控错误码：记日志，不重试（重试只会加重封禁）
    console.error(`[notify] PushPlus 风控 code=${code}，已终止不重试：${JSON.stringify(result.json)}`);
  }
  await writeLog(admin, {
    ...logBase,
    status: code === 200 ? 'sent' : 'failed',
    request_body: maskedBody,
    response_code: code ?? result.httpStatus,
    response_body: result.json,
  });
  respond(200, { ok: true, pushed: code === 200, pushplusCode: code ?? null });
}
