// ---------------------------------------------------------------
// Vercel Serverless Function：轮询扫码结果并完成微信推送绑定
// POST /api/wxpusher-bind（需登录），body: { code }
//
// 查询 WxPusher「扫码用户 UID」接口：
//   - 用户还没扫码 → { bound: false }（前端继续轮询，间隔 ≥ 10 秒）
//   - 已扫码 → 校验二维码 extra 与当前用户一致后，写入 profile_private.wxpusher_uid
//     → { bound: true }
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
  const code = req.body?.code;
  if (typeof code !== 'string' || !code) {
    respond(400, { ok: false, msg: '缺少 code' });
    return;
  }

  const r = await fetchJson(
    `${WXPUSHER_API}/api/fun/scan-qrcode-uid?code=${encodeURIComponent(code)}`,
  );
  if (!r.json) {
    console.error(`[wxpusher-bind] 查询扫码状态网络失败：${r.error}`);
    respond(200, { ok: true, bound: false });
    return;
  }
  const data = r.json.data as Json | undefined;
  const uid = data?.uid as string | undefined;
  if (r.json.code !== 1000 || !uid) {
    // 正常情况：用户还没扫码
    respond(200, { ok: true, bound: false });
    return;
  }
  // 防串号：二维码里的 extra 必须等于当前登录用户（二维码本就是为他生成的）
  if (data.extra !== callerId) {
    console.error(`[wxpusher-bind] extra 不匹配：qr.extra=${data.extra} caller=${callerId}`);
    respond(403, { ok: false, msg: '二维码与当前账号不匹配，请刷新二维码重试' });
    return;
  }

  const { error } = await admin
    .from('profile_private')
    .update({ wxpusher_uid: uid })
    .eq('user_id', callerId);
  if (error) {
    console.error(`[wxpusher-bind] 写入 wxpusher_uid 失败：${error.message}`);
    respond(500, { ok: false, msg: '绑定失败，请稍后重试' });
    return;
  }
  console.log(`[wxpusher-bind] 绑定成功 user=${callerId} uid=${uid.slice(0, 10)}***`);
  respond(200, { ok: true, bound: true, uid });
}
