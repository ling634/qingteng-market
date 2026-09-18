// ---------------------------------------------------------------
// Vercel Serverless Function：发送微信推送测试消息
// POST /api/wxpusher-test（需登录）
//
// 向当前登录用户绑定的 WxPusher UID 发送一条测试消息。
// appToken 只存在于服务端，前端无法直接调用 WxPusher 发送接口。
//
// 注意：api/ 下的函数不做本地文件互相 import（Vercel 打包会崩），
// 公共代码在各函数内联维护。
// ---------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

const WXPUSHER_API = 'https://wxpusher.zjiecode.com';
const SITE_URL = 'https://qingtengmarket.xyz';
const WX_OK = 1000; // WxPusher 业务成功码

type Json = Record<string, unknown>;

export default async function handler(
  req: { method?: string; headers: Record<string, string | undefined>; body?: Json },
  res: { status: (code: number) => { json: (body: Json) => void } },
): Promise<void> {
  const respond = (code: number, body: Json) => res.status(code).json(body);

  if (req.method !== 'POST') {
    respond(405, { ok: false, msg: 'Method Not Allowed' });
    return;
  }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WXPUSHER_APP_TOKEN } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WXPUSHER_APP_TOKEN) {
    console.error('[wxpusher-test] 缺少环境变量');
    respond(500, { ok: false, msg: '服务端未配置推送服务' });
    return;
  }
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

  const { data: priv } = await admin
    .from('profile_private')
    .select('wxpusher_uid')
    .eq('user_id', callerId)
    .maybeSingle();
  const uid = priv?.wxpusher_uid as string | null | undefined;
  if (!uid) {
    respond(400, { ok: false, msg: '尚未绑定微信推送' });
    return;
  }

  // 带时间戳避免相同内容拦截
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const pushBody: Json = {
    appToken: WXPUSHER_APP_TOKEN,
    content: `测试消息：青藤集市微信推送已绑定成功，新私信通知会推送到这里。\n发送时间：${now}`,
    summary: '青藤集市绑定测试',
    contentType: 1,
    url: SITE_URL,
    uids: [uid],
    verifyPayType: 0,
  };

  let json: Json | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${WXPUSHER_API}/api/send/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pushBody),
      signal: controller.signal,
    });
    clearTimeout(timer);
    json = (await resp.json().catch(() => null)) as Json | null;
  } catch (e) {
    console.error(`[wxpusher-test] 请求异常：${e instanceof Error ? e.message : e}`);
  }
  if (!json) {
    respond(502, { ok: false, msg: '推送服务连接失败，请稍后重试' });
    return;
  }
  const code = json.code as number | undefined;
  console.log(`[wxpusher-test] 返回：${JSON.stringify(json)}`);
  if (code === WX_OK) {
    respond(200, { ok: true, msg: '发送成功' });
  } else {
    respond(200, { ok: false, msg: `[${code}] ${(json.msg as string) ?? '发送失败'}` });
  }
}
