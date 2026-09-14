-- =============================================================
-- 青藤集市 Supabase 初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中整段执行（只需执行一次）
-- =============================================================

-- ---------- 1. 用户 ----------

-- 公开资料（昵称/头像/信誉等，所有人可读）
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique,
  college text not null default '',
  avatar_url text not null default '',
  verified boolean not null default false,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  rating numeric(2,1) not null default 5.0,
  trade_count integer not null default 0,
  report_count integer not null default 0,
  reputation_tags text[] not null default '{新用户}',
  created_at timestamptz not null default now()
);

-- 隐私资料（学号/姓名/邮箱，仅本人可读）
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  student_id text not null unique,
  name text not null,
  email text not null
);

-- ---------- 2. 商品 / 求购 / 收藏 ----------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  price numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2),
  category text not null,
  condition text not null,
  description text not null default '',
  pickup_location text not null default '',
  images text[] not null default '{}',
  thumbs text[] not null default '{}',
  status text not null default 'on_sale' check (status in ('on_sale', 'sold', 'offline')),
  is_top boolean not null default false,
  top_weight integer not null default 0,
  top_expire_at timestamptz,
  created_at timestamptz not null default now()
);
create index products_created_idx on public.products (created_at desc);
create index products_price_idx on public.products (price);
create index products_category_status_idx on public.products (category, status);
create index products_seller_idx on public.products (seller_id);
create index products_top_idx on public.products (top_weight desc, created_at desc)
  where is_top and status = 'on_sale';

create table public.wanted (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category text not null,
  budget text not null default '',
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index wanted_created_idx on public.wanted (created_at desc);
create index wanted_buyer_idx on public.wanted (buyer_id);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- 3. 广告位 ----------

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null,
  title text not null,
  image_url text not null,
  link text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  created_at timestamptz not null default now()
);

-- ---------- 4. 站内私信 ----------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id, seller_id)
);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  type text not null default 'text' check (type in ('text', 'system')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------- 5. 反馈工单 ----------

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  image text,
  status text not null default 'pending' check (status in ('pending', 'replied')),
  reply_content text,
  reply_at timestamptz,
  created_at timestamptz not null default now()
);
create index feedbacks_user_idx on public.feedbacks (user_id, created_at desc);
-- 同一用户同时只能有 1 条待回复反馈（数据库级约束）
create unique index feedbacks_one_pending_idx on public.feedbacks (user_id)
  where status = 'pending';

create table public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedbacks (id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  content text not null,
  image text,
  created_at timestamptz not null default now()
);
create index feedback_messages_feedback_idx on public.feedback_messages (feedback_id, created_at);

-- ---------- 6. 举报 / 交易评价（评价本期只建表） ----------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('product', 'user')),
  target_id text not null,
  reason text not null,
  detail text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  product_title text not null default '',
  product_image text not null default '',
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  price numeric(10,2) not null default 0,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  buyer_rating integer,
  buyer_comment text,
  seller_rating integer,
  seller_comment text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- 7. 辅助函数 ----------

-- 当前用户是否管理员（security definer 避免 RLS 递归）
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 当前用户是否被封禁
create or replace function public.is_banned()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_banned from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------- 8. 触发器 ----------

-- 非管理员不能给自己/他人设置 is_admin、is_banned、verified
-- （SQL 编辑器 / service role 下 auth.uid() 为 null，不受限制）
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := coalesce(old.is_admin, false);
    new.is_banned := coalesce(old.is_banned, false);
    new.verified := coalesce(old.verified, false);
  end if;
  return new;
end;
$$;
create trigger trg_protect_profile_admin
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin_fields();

-- 非管理员不能修改置顶字段、不能篡改 seller_id
create or replace function public.protect_product_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_top := old.is_top;
    new.top_weight := old.top_weight;
    new.top_expire_at := old.top_expire_at;
    new.seller_id := old.seller_id;
  end if;
  return new;
end;
$$;
create trigger trg_protect_product_fields
  before update on public.products
  for each row execute function public.protect_product_fields();

-- 封禁用户 → 其在售商品自动下架
create or replace function public.on_user_banned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_banned and not old.is_banned then
    update public.products
      set status = 'offline', is_top = false, top_weight = 0, top_expire_at = null
      where seller_id = new.id and status = 'on_sale';
  end if;
  return new;
end;
$$;
create trigger trg_on_user_banned
  after update of is_banned on public.profiles
  for each row execute function public.on_user_banned();

-- 新消息 → 更新会话 last_message
create or replace function public.on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set last_message = left(new.content, 100),
        last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;
create trigger trg_on_new_message
  after insert on public.messages
  for each row execute function public.on_new_message();

-- 反馈对话 → 同步工单状态（用户追问→pending，管理员回复→replied）
create or replace function public.on_feedback_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender = 'admin' then
    update public.feedbacks
      set status = 'replied', reply_content = new.content, reply_at = new.created_at
      where id = new.feedback_id;
  else
    update public.feedbacks
      set status = 'pending', reply_content = null, reply_at = null
      where id = new.feedback_id;
  end if;
  return new;
end;
$$;
create trigger trg_on_feedback_message
  after insert on public.feedback_messages
  for each row execute function public.on_feedback_message();

-- ---------- 9. RLS 策略 ----------

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.products enable row level security;
alter table public.wanted enable row level security;
alter table public.favorites enable row level security;
alter table public.ads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.feedbacks enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.reports enable row level security;
alter table public.trades enable row level security;

-- profiles：公开可读；本人注册时插入；本人或管理员可改（敏感字段受触发器保护）
create policy profiles_select on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- profile_private：仅本人
create policy private_select on public.profile_private for select using (auth.uid() = user_id);
create policy private_insert on public.profile_private for insert with check (auth.uid() = user_id);
create policy private_update on public.profile_private for update using (auth.uid() = user_id);

-- products：在售/已售公开读；下架仅卖家和管理员可见；卖家增改删自己；管理员全权限；封禁用户禁止发布
create policy products_select on public.products for select
  using (status <> 'offline' or seller_id = auth.uid() or public.is_admin());
create policy products_insert on public.products for insert
  with check (auth.uid() = seller_id and not public.is_banned());
create policy products_update on public.products for update
  using ((auth.uid() = seller_id and not public.is_banned()) or public.is_admin());
create policy products_delete on public.products for delete
  using (auth.uid() = seller_id or public.is_admin());

-- wanted：公开读；买家管理自己；管理员可改
create policy wanted_select on public.wanted for select using (true);
create policy wanted_insert on public.wanted for insert
  with check (auth.uid() = buyer_id and not public.is_banned());
create policy wanted_update on public.wanted for update
  using (auth.uid() = buyer_id or public.is_admin());
create policy wanted_delete on public.wanted for delete
  using (auth.uid() = buyer_id or public.is_admin());

-- favorites：仅本人
create policy favorites_select on public.favorites for select using (auth.uid() = user_id);
create policy favorites_insert on public.favorites for insert with check (auth.uid() = user_id);
create policy favorites_delete on public.favorites for delete using (auth.uid() = user_id);

-- ads：公开读；仅管理员写
create policy ads_select on public.ads for select using (true);
create policy ads_insert on public.ads for insert with check (public.is_admin());
create policy ads_update on public.ads for update using (public.is_admin());
create policy ads_delete on public.ads for delete using (public.is_admin());

-- conversations：仅参与者（管理员也无权读私信，保护隐私）
create policy conversations_select on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy conversations_insert on public.conversations for insert
  with check (auth.uid() = buyer_id and not public.is_banned());
create policy conversations_update on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- messages：仅会话参与者
create policy messages_select on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));
create policy messages_insert on public.messages for insert
  with check (
    sender_id = auth.uid() and not public.is_banned() and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
create policy messages_update on public.messages for update
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));

-- feedbacks：本人 + 管理员
create policy feedbacks_select on public.feedbacks for select
  using (user_id = auth.uid() or public.is_admin());
create policy feedbacks_insert on public.feedbacks for insert
  with check (user_id = auth.uid());
create policy feedbacks_update on public.feedbacks for update
  using (public.is_admin());

-- feedback_messages：工单本人 + 管理员；用户只能以 user 身份在自己的工单下发，管理员以 admin 身份
create policy feedback_messages_select on public.feedback_messages for select
  using (exists (
    select 1 from public.feedbacks f
    where f.id = feedback_id and (f.user_id = auth.uid() or public.is_admin())
  ));
create policy feedback_messages_insert on public.feedback_messages for insert
  with check (
    (sender = 'user' and exists (
      select 1 from public.feedbacks f where f.id = feedback_id and f.user_id = auth.uid()
    ))
    or (sender = 'admin' and public.is_admin())
  );

-- reports：本人可建可看自己的；管理员可读可处理
create policy reports_insert on public.reports for insert
  with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());
create policy reports_update on public.reports for update
  using (public.is_admin());

-- trades：买卖双方 + 管理员可读；本期不开放前端写入
create policy trades_select on public.trades for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

-- ---------- 10. Storage（图片） ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 公开读
create policy storage_public_read on storage.objects for select
  using (bucket_id in ('product-images', 'avatars'));
-- 登录用户可上传（路径要求以「用户uid/」开头）
create policy storage_auth_insert on storage.objects for insert
  with check (
    bucket_id in ('product-images', 'avatars')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- 只能改/删自己的文件
create policy storage_owner_update on storage.objects for update
  using ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin());
create policy storage_owner_delete on storage.objects for delete
  using ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin());

-- ---------- 11. Realtime（控制范围：仅必要表） ----------

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.wanted;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.feedbacks;

-- ---------- 12. 种子数据：仅 2 条真实广告（空库上线，无 mock 商品） ----------

insert into public.ads (slot_key, title, image_url, link, start_at, end_at, status)
values
  ('forest_goods_main', '青藤打印店', '/images/ads/print.jpg', '#', now(), now() + interval '1 year', 'active'),
  ('forest_goods_main', '果园鲜切水果', '/images/ads/fruit.jpg', '#', now(), now() + interval '1 year', 'active');

-- ---------- 13. 管理员设置（待用户在应用中注册管理员邮箱后，取消注释并执行） ----------
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = '你的管理员邮箱');
