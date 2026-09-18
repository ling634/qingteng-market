// ---------------------------------------------------------------
// WxPusher 微信推送：前端客户端（只调用我们自己的 /api/* 服务端函数，
// appToken 永远不会出现在浏览器里）
//
// 绑定流程（用户无需复制任何东西）：
//   1. createBindQrCode() 生成专属二维码（extra = 用户 ID，10 分钟有效）
//   2. 用户微信扫码并关注「WxPusher」公众号
//   3. 前端每 10 秒 pollBindStatus(code) 轮询（官方要求间隔 ≥ 10s），
//      扫码成功后服务端自动写入绑定 → bound: true
//
// 手动备选：用户在公众号「我的-我的UID」复制 UID，粘贴在绑定弹窗里保存
// （走 updateWxpusherUid，与扫码绑定殊途同归）
// ---------------------------------------------------------------

import { supabase } from '@/lib/supabase';

type Json = Record<string, unknown>;

/** 取当前会话 access_token 组装鉴权头；未登录返回 null */
async function authHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function post(path: string, body?: Json): Promise<Json | null> {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const resp = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
    return (await resp.json().catch(() => null)) as Json | null;
  } catch {
    return null;
  }
}

/** 创建绑定二维码：返回 { code, qrUrl }；失败返回 null */
export async function createBindQrCode(): Promise<{ code: string; qrUrl: string } | null> {
  const r = await post('/api/wxpusher-qrcode');
  if (r?.ok && typeof r.code === 'string' && typeof r.qrUrl === 'string') {
    return { code: r.code, qrUrl: r.qrUrl };
  }
  return null;
}

/** 轮询扫码绑定状态：已扫码并完成绑定返回 UID，否则返回 null */
export async function pollBindStatus(code: string): Promise<string | null> {
  const r = await post('/api/wxpusher-bind', { code });
  if (r?.ok === true && r.bound === true && typeof r.uid === 'string') return r.uid;
  return null;
}

/** 发送测试推送：返回 { ok, msg }，永不抛异常 */
export async function sendTestWxPush(): Promise<{ ok: boolean; msg: string }> {
  const r = await post('/api/wxpusher-test');
  if (!r) return { ok: false, msg: '网络异常，请稍后重试' };
  return { ok: r.ok === true, msg: (r.msg as string) ?? '' };
}
