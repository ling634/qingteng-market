-- =============================================================
-- 青藤集市 补丁 01（在 migration.sql 之后执行一次）
-- =============================================================

-- 1) 管理员可读取用户隐私信息（学号），用于后台用户管理
create policy private_admin_select on public.profile_private
  for select using (public.is_admin());

-- 2) 注册前可用性检查（匿名用户可调用，只返回布尔值，不泄露数据）
create or replace function public.check_registration(p_nickname text, p_student_id text)
returns table(nickname_taken boolean, student_id_taken boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    exists(select 1 from public.profiles where nickname = p_nickname),
    exists(select 1 from public.profile_private where student_id = p_student_id);
$$;

-- 3) 会话唯一约束改为支持 product_id 为 NULL（求购私信场景）
--    Postgres 唯一约束中 NULL 互不相等，改用 coalesce 表达式唯一索引
alter table public.conversations
  drop constraint conversations_product_id_buyer_id_seller_id_key;
create unique index conversations_pair_unique
  on public.conversations (coalesce(product_id::text, ''), buyer_id, seller_id);
