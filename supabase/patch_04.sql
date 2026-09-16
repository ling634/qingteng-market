-- ============================================================
-- 青藤集市 patch_04：预订 → 确认收货 → 评价 交易闭环 + 「X 人想要」
-- 在 Supabase SQL Editor 执行（需在 migration + patch_01~03 之后）
-- ============================================================

-- ---------- 1. 状态机扩展 ----------

-- 商品状态新增「已预订 reserved」：在售 on_sale → 已预订 reserved → 已售出 sold（下架 offline 不变）
alter table public.products drop constraint products_status_check;
alter table public.products add constraint products_status_check
  check (status in ('on_sale', 'reserved', 'sold', 'offline'));

-- 交易状态新增「已预订 reserved」：reserved → completed（确认收货）/ cancelled（卖家取消预订）
alter table public.trades drop constraint trades_status_check;
alter table public.trades add constraint trades_status_check
  check (status in ('reserved', 'completed', 'cancelled'));

-- ---------- 2. 交易闭环 RPC（security definer，原子操作，前端直接调用） ----------

-- 预订商品：买家在会话里自助预订（p_buyer_id = 自己），或卖家指定买家标记预订
-- 条件更新防并发：仅当商品仍在售时才能预订成功，先到先得
create or replace function public.reserve_product(p_product_id uuid, p_buyer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_title text;
  v_image text;
  v_price numeric;
  v_trade uuid;
begin
  select seller_id, title, coalesce(images[1], ''), price
    into v_seller, v_title, v_image, v_price
  from public.products
  where id = p_product_id;

  if v_seller is null then
    raise exception '商品不存在';
  end if;
  -- 仅买家本人或卖家可发起
  if auth.uid() <> p_buyer_id and auth.uid() <> v_seller then
    raise exception '无权操作';
  end if;
  if p_buyer_id = v_seller then
    raise exception '不能预订自己的商品';
  end if;

  update public.products
    set status = 'reserved', is_top = false
  where id = p_product_id and status = 'on_sale';
  if not found then
    raise exception '手慢了，该商品刚被预订或售出';
  end if;

  insert into public.trades (product_id, product_title, product_image, buyer_id, seller_id, price, status)
  values (p_product_id, v_title, v_image, p_buyer_id, v_seller, v_price, 'reserved')
  returning id into v_trade;

  return v_trade;
end;
$$;

-- 卖家取消预订：商品回到在售，交易标记取消（仅卖家）
create or replace function public.cancel_reservation(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
begin
  select seller_id into v_seller from public.products where id = p_product_id;
  if v_seller is null then
    raise exception '商品不存在';
  end if;
  if auth.uid() <> v_seller then
    raise exception '仅卖家可取消预订';
  end if;

  update public.products set status = 'on_sale'
  where id = p_product_id and status = 'reserved';

  update public.trades set status = 'cancelled'
  where product_id = p_product_id and status = 'reserved';
end;
$$;

-- 买家确认收货：交易完成，商品标记已售出，卖家交易数 +1（仅该交易的买家）
create or replace function public.confirm_receipt(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
begin
  select * into v_trade from public.trades where id = p_trade_id;
  if v_trade.id is null then
    raise exception '交易不存在';
  end if;
  if auth.uid() <> v_trade.buyer_id then
    raise exception '仅买家可确认收货';
  end if;

  update public.trades
    set status = 'completed', completed_at = now()
  where id = p_trade_id and status = 'reserved';
  if not found then
    raise exception '该交易已处理';
  end if;

  if v_trade.product_id is not null then
    update public.products set status = 'sold'
    where id = v_trade.product_id and status = 'reserved';
  end if;

  update public.profiles set trade_count = trade_count + 1 where id = v_trade.seller_id;
end;
$$;

-- 买家评价：仅交易完成后、仅一次；同时重算卖家平均评分（仅买家）
create or replace function public.rate_trade(p_trade_id uuid, p_rating integer, p_comment text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception '评分必须为 1~5';
  end if;

  select * into v_trade from public.trades where id = p_trade_id;
  if v_trade.id is null then
    raise exception '交易不存在';
  end if;
  if auth.uid() <> v_trade.buyer_id then
    raise exception '仅买家可评价';
  end if;
  if v_trade.status <> 'completed' then
    raise exception '交易完成后才能评价';
  end if;
  if v_trade.buyer_rating is not null then
    raise exception '该交易已评价过';
  end if;

  update public.trades
    set buyer_rating = p_rating, buyer_comment = left(trim(p_comment), 500)
  where id = p_trade_id;

  -- 重算卖家平均分（无评价时保持默认 5.0）
  update public.profiles
    set rating = coalesce((
      select avg(buyer_rating) from public.trades
      where seller_id = v_trade.seller_id and buyer_rating is not null
    ), 5)
  where id = v_trade.seller_id;
end;
$$;

grant execute on function public.reserve_product(uuid, uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.confirm_receipt(uuid) to authenticated;
grant execute on function public.rate_trade(uuid, integer, text) to authenticated;

-- ---------- 3. 「X 人想要」统计视图 ----------
-- 同一买家只记一次：收藏人数 ∪ 就该商品发起过私聊的买家数
create or replace view public.product_demand as
select product_id, count(distinct uid)::integer as want_count
from (
  select product_id, user_id as uid from public.favorites
  union
  select product_id, buyer_id as uid from public.conversations
  where product_id is not null
) t
group by product_id;

-- 视图只暴露商品维度的聚合计数，不涉及任何用户隐私
grant select on public.product_demand to anon, authenticated;

-- trades 仍保持「买卖双方 + 管理员可读」的 SELECT 策略；
-- 写入一律走上面的 RPC（security definer），无需开放直接 INSERT/UPDATE 策略
