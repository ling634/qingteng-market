// ---------------------------------------------------------------
// Vercel Serverless Function：创建微信推送绑定二维码
// POST /api/wxpusher-qrcode（需登录）
//
// 用 appToken 创建带参二维码（extra = 当前用户 ID，有效期 10 分钟），
// 用户微信扫码并关注「WxPusher」公众号后，前端轮询 /api/wxpusher-bind 完成绑定。
// 返回 { code, qrUrl }：code 用于轮询，qrUrl 为二维码图片地址。
// ---------------------------------------------------------------

import { fetchJson, getAdmin, getCallerId, WXPUSHER_API, type Json } from './_wxpusher';

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
    console.error('[wxpusher-qrcode] 缺少 WXPUSHER_APP_TOKEN 环境变量');
    respond(500, { ok: false, msg: '服务端未配置推送服务' });
    return;
  }
  const admin = getAdmin();
  if (!admin) {
    respond(500, { ok: false, msg: '服务端未配置数据库' });
    return;
  }
  const callerId = await getCallerId(admin, req);
  if (!callerId) {
    respond(401, { ok: false, msg: '未登录' });
    return;
  }

  const r = await fetchJson(`${WXPUSHER_API}/api/fun/create/qrcode`, {
    method: 'POST',
    body: { appToken: WXPUSHER_APP_TOKEN, extra: callerId, validTime: 600 },
  });
  const data = r.json?.data as Json | undefined;
  if (!r.json || r.json.code !== 1000 || !data?.code || !data?.url) {
    console.error(`[wxpusher-qrcode] 创建失败：${JSON.stringify(r.json)} ${r.error ?? ''}`);
    respond(502, { ok: false, msg: '二维码创建失败，请稍后重试' });
    return;
  }
  respond(200, { ok: true, code: data.code, qrUrl: data.url });
}
