-- =============================================================
-- 青藤集市 补丁 09（在 patch_08.sql 之后执行一次）
-- =============================================================

-- ---------- 1. 私信推送日志表 push_logs ----------
-- 用途：
--   a) 限流判断：同一接收者 10 秒内最多调用 1 次 PushPlus（按实际推送尝试计）
--   b) 排查日志：完整记录请求体 / 返回码 / 返回 JSON / 状态
-- 写入方只能是 Vercel Serverless Function（service_role，绕过 RLS），
-- 前端任何角色都不能读写（管理员可读，用于后台排查）。
create table if not exists public.push_logs (
  id bigint generated always as identity primary key,
  recipient_id uuid references public.profiles (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete cascade,
  message_id uuid,
  conversation_id uuid,
  -- 发给 PushPlus 的请求体（token 已打码）
  request_body jsonb,
  -- PushPlus 业务返回码（200 成功 / 999 服务端验证错误 / 900 频率超限 …），网络异常为 null
  response_code integer,
  -- PushPlus 完整返回 JSON；网络异常时存 { "error": "...", "attempts": n }
  response_body jsonb,
  -- sent=推送成功 / failed=接口返回失败 / error=网络异常（已重试1次仍失败）
  -- no_token=接收方未绑定 / rate_limited=被10秒限流拦截 / system=系统消息跳过
  status text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_logs_recipient_idx
  on public.push_logs (recipient_id, created_at desc);

alter table public.push_logs enable row level security;
-- 仅管理员可读；不建 insert/update/delete 策略 → 前端无法写入，只能 service_role 写
create policy push_logs_admin_select on public.push_logs
  for select using (public.is_admin());

-- ---------- 2. 公告表 announcements ----------
-- 每次保存都新增一行，最新一行为当前公告：
--   内容非空 → 首页公告栏显示；内容为空 → 全站隐藏。
-- 修改公告 = 新 id → 已关闭过旧公告的用户会重新看到（符合预期）。
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  content text not null default '',
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
-- 所有人可读（公告是公开信息）
create policy announcements_select on public.announcements
  for select using (true);
-- 仅管理员可发布（insert 新行即发布）
create policy announcements_admin_insert on public.announcements
  for insert with check (public.is_admin());
