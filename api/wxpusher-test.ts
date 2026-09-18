// ---------------------------------------------------------------
// Vercel Serverless Function：发送微信推送测试消息
// POST /api/wxpusher-test（需登录）
//
// 向当前登录用户绑定的 WxPusher UID 发送一条测试消息。
// appToken 只存在于服务端，前端无法直接调用 WxPusher 发送接口。
// ---------------------------------------------------------------

import { getAdmin, getCallerId, wxSend, WX_OK, SITE_URL, type Json } from './_wxpusher';

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
  const admin = getAdmin();
  if (!WXPUSHER_APP_TOKEN || !admin) {
    respond(500, { ok: false, msg: '服务端未配置推送服务' });
    return;
  }
  const callerId = await getCallerId(admin, req);
  if (!callerId) {
    respond(401, { ok: false, msg: '未登录' });
    return;
  }

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
  const result = await wxSend({
    appToken: WXPUSHER_APP_TOKEN,
    content: `测试消息：青藤集市微信推送已绑定成功，新私信通知会推送到这里。\n发送时间：${now}`,
    summary: '青藤集市绑定测试',
    contentType: 1,
    url: SITE_URL,
    uids: [uid],
    verifyPayType: 0,
  });

  if (!result.json) {
    console.error(`[wxpusher-test] 网络失败：${result.error}`);
    respond(502, { ok: false, msg: '推送服务连接失败，请稍后重试' });
    return;
  }
  const code = result.json.code as number | undefined;
  console.log(`[wxpusher-test] 返回（HTTP ${result.httpStatus}）：${JSON.stringify(result.json)}`);
  if (code === WX_OK) {
    respond(200, { ok: true, msg: '发送成功' });
  } else {
    respond(200, { ok: false, msg: `[${code}] ${(result.json.msg as string) ?? '发送失败'}` });
  }
}
