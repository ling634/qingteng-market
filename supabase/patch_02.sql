-- ============================================================
-- 青藤集市 patch_02：管理端已读跟踪
-- 在 Supabase SQL Editor 执行（已在 migration.sql + patch_01.sql 之后）
-- ============================================================

-- 意见反馈：管理员已读时间（NULL = 未读）
alter table public.feedbacks
  add column if not exists read_at timestamptz;

-- 举报：管理员已读时间（NULL = 未读）
alter table public.reports
  add column if not exists read_at timestamptz;

-- RLS 无需调整：feedbacks_update / reports_update 已允许管理员更新整行
