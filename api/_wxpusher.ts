// ---------------------------------------------------------------
// WxPusher 服务端共享工具（下划线开头，不是路由）
// 官方文档：https://wxpusher.zjiecode.com/docs/
//
// 环境变量（Vercel 后台配置，严禁出现在前端代码）：
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / WXPUSHER_APP_TOKEN
//
// WxPusher 约定：
//   - 业务成功码 code = 1000（不是 200）
//   - 发送消息 QPS ≤ 1；查询扫码 UID 轮询间隔 ≥ 10 秒
//   - 用户无需实名、无需复制 token，扫码关注公众号即可接收
// ---------------------------------------------------------------

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const WXPUSHER_API = 'https://wxpusher.zjiecode.com';
export const SITE_URL = 'https://qingtengmarket.xyz';
const TIMEOUT_MS = 5000;

type Json = Record<string, unknown>;
export type { Json };

/** 创建 service_role 客户端（可绕过 RLS 读写 profile_private / push_logs） */
export function getAdmin(): SupabaseClient | null {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 从 Bearer token 解析当前登录用户 ID，无效返回 null */
export async function getCallerId(
  admin: SupabaseClient,
  req: { headers: Record<string, string | undefined> },
): Promise<string | null> {
  const accessToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return null;
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user.id;
}

/** 带超时的 JSON 请求封装 */
export async function fetchJson(
  url: string,
  init?: { method?: string; body?: Json },
): Promise<{ json: Json | null; httpStatus: number | null; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const resp = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = (await resp.json().catch(() => null)) as Json | null;
    return { json, httpStatus: resp.status };
  } catch (e) {
    return { json: null, httpStatus: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 调用 WxPusher 发送消息：网络异常/超时最多重试 1 次，
 * 拿到业务响应（无论成败）立即返回，绝不因业务码重试。
 */
export async function wxSend(body: Json): Promise<{
  json: Json | null;
  httpStatus: number | null;
  attempts: number;
  error?: string;
}> {
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await fetchJson(`${WXPUSHER_API}/api/send/message`, {
      method: 'POST',
      body,
    });
    if (r.json) return { ...r, attempts: attempt };
    lastError = r.error ?? 'unknown';
    console.warn(`[wxpusher] 第 ${attempt} 次请求异常：${lastError}`);
  }
  return { json: null, httpStatus: null, attempts: 2, error: lastError };
}

/** WxPusher 业务成功码 */
export const WX_OK = 1000;
