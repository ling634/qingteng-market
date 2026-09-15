-- ============================================================
-- 青藤集市 patch_03：允许删除商品
-- 在 Supabase SQL Editor 执行（已在 migration.sql + patch_01 + patch_02 之后）
-- ============================================================

-- 卖家可删除自己的商品，管理员可删除任意商品
-- 外键已确认安全：favorites 级联删除；conversations / trades 的 product_id 置空（交易记录保留标题与图片快照）
-- 注意：商品图片文件仍会残留在 Storage（页面不可见），如需清理另做工具
create policy products_delete on public.products for delete
  using (seller_id = auth.uid() or public.is_admin());
