-- patch_10：求购信息支持一张配图（选填）
-- 在 Supabase SQL Editor 手动执行
alter table public.wanted add column if not exists image text;
