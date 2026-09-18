// ---------------------------------------------------------------
// Vercel Serverless Function：创建微信推送绑定二维码
// POST /api/wxpusher-qrcode（需登录）
//
// 用 appToken 创建带参二维码（extra = 当前用户 ID，有效期 10 分钟），
// 用户微信扫码并关注「WxPusher」公众号后，前端轮询 /api/wxpusher-bind 完成绑定。
// 返回 { code, qrUrl }：code 用于轮询，qrUrl 为二维码图片地址。
//
// 注意：api/ 下的函数不做本地文件互相 import（Vercel 打包会崩），
// 公共代码在各函数内联维护。
// ---------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

const WXPUSHER_API = 'https://wxpusher.zjiecode.com';

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
    console.error('[wxpusher-qrcode] 缺少环境变量（SUPABASE / WXPUSHER_APP_TOKEN）');
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

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${WXPUSHER_API}/api/fun/create/qrcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appToken: WXPUSHER_APP_TOKEN, extra: callerId, validTime: 600 }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = (await resp.json().catch(() => null)) as Json | null;
    const data = json?.data as Json | undefined;
    if (!json || json.code !== 1000 || !data?.code || !data?.url) {
      console.error(`[wxpusher-qrcode] 创建失败：${JSON.stringify(json)}`);
      respond(502, { ok: false, msg: '二维码创建失败，请稍后重试' });
      return;
    }
    respond(200, { ok: true, code: data.code, qrUrl: data.url });
  } catch (e) {
    console.error(`[wxpusher-qrcode] 请求异常：${e instanceof Error ? e.message : e}`);
    respond(502, { ok: false, msg: '推送服务连接失败，请稍后重试' });
  }
}
