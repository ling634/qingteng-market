-- ============================================================
-- 青藤集市 patch_05：买家删除订单（侧隐藏）+ 汇水池收款码 + 管理员删除反馈/举报
-- 在 Supabase SQL Editor 执行（需在 migration + patch_01~04 之后）
-- ============================================================

-- ---------- 1. 「我买到的」删除订单：买家侧隐藏 ----------
-- 交易记录同时是卖家信誉评价的数据源，不做物理删除；
-- 买家删除只是把订单从自己的「我买到的」列表里隐藏
alter table public.trades add column buyer_hidden boolean not null default false;

-- 仅买家本人、仅已完结（交易成功/已取消）的订单可隐藏
create or replace function public.hide_trade(p_trade_id uuid)
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
    raise exception '订单不存在';
  end if;
  if auth.uid() <> v_trade.buyer_id then
    raise exception '仅买家可删除订单';
  end if;
  if v_trade.status not in ('completed', 'cancelled') then
    raise exception '进行中的订单不能删除';
  end if;

  update public.trades set buyer_hidden = true where id = p_trade_id;
end;
$$;

grant execute on function public.hide_trade(uuid) to authenticated;

-- ---------- 2. 汇水池：卖家收款码（每人限一张，profiles 直接存 URL） ----------
alter table public.profiles add column pay_qr_url text;

-- ---------- 3. 管理员可删除意见反馈 / 举报记录 ----------
create policy feedbacks_delete on public.feedbacks for delete
  using (public.is_admin());

create policy reports_delete on public.reports for delete
  using (public.is_admin());
