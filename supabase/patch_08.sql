-- =============================================================
-- 青藤集市 补丁 08（在 patch_07.sql 之后执行一次）
-- =============================================================

-- 1) PushPlus 微信推送 Token 绑定
--    存放在 profile_private（仅本人可读写，RLS 策略已存在，无需新增）；
--    允许为空：未绑定的用户该列为 NULL。
--    安全说明：不放在公开的 profiles 表——token 泄露会被他人滥发微信消息。
alter table public.profile_private
  add column if not exists pushplus_token text;

-- 2) 服务端触发推送时读取 token 的辅助函数（供后续私信/求购匹配通知使用）
--    security definer：绕过 RLS，仅限服务端（service_role / 触发器）调用，
--    不要授予 anon/authenticated 执行权限。
create or replace function public.get_pushplus_token(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pushplus_token
  from public.profile_private
  where user_id = p_user_id;
$$;

revoke all on function public.get_pushplus_token(uuid) from public, anon, authenticated;
