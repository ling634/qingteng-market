-- ============================================================
-- 青藤集市 patch_06：昵称+密码认证体系 + 认证后置（人工审核）+ 求购状态机
-- 在 Supabase SQL Editor 执行（需在 migration + patch_01~05 之后）
-- ============================================================

-- ---------- 1. 昵称+密码注册登录 ----------

-- 学号/姓名不再必填（注册只收集昵称+密码）
alter table public.profile_private alter column student_id drop not null;
alter table public.profile_private alter column name drop not null;

-- 昵称占用检查（匿名可调用，注册前校验）
create or replace function public.check_nickname(p_nickname text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where nickname = p_nickname);
$$;
grant execute on function public.check_nickname(text) to anon, authenticated;

-- 登录邮箱查询：按昵称找到合成邮箱（只暴露系统合成的假邮箱，不涉及隐私）
-- 用 RPC 查询而非前端推导，保证用户改昵称后仍能用新昵称登录
create or replace function public.get_login_email(p_nickname text)
returns text
language sql
security definer
set search_path = public
as $$
  select pp.email
  from public.profile_private pp
  join public.profiles p on p.id = pp.user_id
  where p.nickname = p_nickname
  limit 1;
$$;
grant execute on function public.get_login_email(text) to anon, authenticated;

-- 老账号迁移：邮箱批量改为「u_ + 昵称UTF8十六进制 + @qingteng.local」合成邮箱
-- （幂等：已是合成邮箱的跳过；执行后老账号用 昵称+原密码 登录，数据全保留）
update auth.users u
set email = 'u_' || encode(convert_to(p.nickname, 'UTF8'), 'hex') || '@qingteng.local'
from public.profiles p
where p.id = u.id and u.email not like '%@qingteng.local';

-- 注意：auth.identities.email 是生成列（由 identity_data 算出），不能直接 UPDATE，
-- 需同步更新 provider_id 与 identity_data，生成列会自动跟着变
update auth.identities i
set provider_id = 'u_' || encode(convert_to(p.nickname, 'UTF8'), 'hex') || '@qingteng.local',
    identity_data = jsonb_set(
      i.identity_data,
      '{email}',
      to_jsonb('u_' || encode(convert_to(p.nickname, 'UTF8'), 'hex') || '@qingteng.local'::text)
    )
from public.profiles p
where p.id = i.user_id
  and i.provider = 'email'
  and i.provider_id not like '%@qingteng.local';

update public.profile_private pp
set email = 'u_' || encode(convert_to(p.nickname, 'UTF8'), 'hex') || '@qingteng.local'
from public.profiles p
where p.id = pp.user_id and pp.email not like '%@qingteng.local';

-- ---------- 2. 认证后置：认证申请表（管理员人工审核） ----------

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  method text not null check (method in ('student_card', 'campus_card')),
  image_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 同一用户同时只能有一条待审核申请
create unique index verification_pending_unique
  on public.verification_requests (user_id) where status = 'pending';

alter table public.verification_requests enable row level security;

create policy verification_select on public.verification_requests for select
  using (user_id = auth.uid() or public.is_admin());
create policy verification_insert on public.verification_requests for insert
  with check (user_id = auth.uid());
create policy verification_update on public.verification_requests for update
  using (public.is_admin());

-- 证件照私有存储桶（不公开；本人可传，本人+管理员可读，管理员审核后删除）
insert into storage.buckets (id, name, public)
values ('verification', 'verification', false)
on conflict (id) do nothing;

create policy verification_storage_insert on storage.objects for insert
  with check (
    bucket_id = 'verification'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy verification_storage_select on storage.objects for select
  using (
    bucket_id = 'verification'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
-- 删除复用 storage_owner_delete（本人或管理员，不限桶）

-- ---------- 3. 求购状态机：求购中 → 已预订 → 已买到（下架 closed 不变） ----------
alter table public.wanted drop constraint wanted_status_check;
alter table public.wanted add constraint wanted_status_check
  check (status in ('open', 'reserved', 'done', 'closed'));
