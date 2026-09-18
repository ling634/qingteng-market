// ---------------------------------------------------------------
// Vercel Serverless Function：轮询扫码结果并完成微信推送绑定
// POST /api/wxpusher-bind（需登录），body: { code }
//
// 查询 WxPusher「扫码用户 UID」接口：
//   - 用户还没扫码 → { bound: false }（前端继续轮询，间隔 ≥ 10 秒）
//   - 已扫码 → 校验二维码 extra 与当前用户一致后，写入 profile_private.wxpusher_uid
//     → { bound: true, uid }
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
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[wxpusher-bind] 缺少 SUPABASE 环境变量');
    respond(500, { ok: false, msg: '服务端未配置数据库' });
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

  const code = req.body?.code;
  if (typeof code !== 'string' || !code) {
    respond(400, { ok: false, msg: '缺少 code' });
    return;
  }

  let json: Json | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `${WXPUSHER_API}/api/fun/scan-qrcode-uid?code=${encodeURIComponent(code)}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    json = (await resp.json().catch(() => null)) as Json | null;
  } catch (e) {
    console.error(`[wxpusher-bind] 查询扫码状态异常：${e instanceof Error ? e.message : e}`);
  }
  if (!json) {
    // 网络失败按「未扫码」处理，前端继续轮询
    respond(200, { ok: true, bound: false });
    return;
  }
  const data = json.data as Json | undefined;
  const uid = data?.uid as string | undefined;
  if (json.code !== 1000 || !uid) {
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
