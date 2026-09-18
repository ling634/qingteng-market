-- patch_11：微信推送从 PushPlus 迁移到 WxPusher
-- 在 Supabase SQL Editor 手动执行
-- WxPusher 用户标识（UID_xxx），用户扫码关注公众号后自动绑定
alter table public.profile_private add column if not exists wxpusher_uid text;

-- 旧 pushplus_token 列保留不动（历史数据），代码已不再读取
