-- ============================================================
-- 青藤集市 patch_07：会话隐藏（微信式删除会话）
-- 在 Supabase SQL Editor 执行（需在 patch_06 之后）
-- ============================================================

-- 会话对某一方隐藏：仅自己不可见，对方聊天记录完整保留
alter table public.conversations
  add column if not exists buyer_hidden boolean not null default false,
  add column if not exists seller_hidden boolean not null default false;

-- 新消息到达时双方自动取消隐藏（微信同款：被删会话收到新消息会重新出现）
create or replace function public.conversation_unhide_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set buyer_hidden = false, seller_hidden = false
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_unhide_conversation on public.messages;
create trigger messages_unhide_conversation
  after insert on public.messages
  for each row execute function public.conversation_unhide_on_message();

-- 隐藏会话（支持批量）：RPC 内部校验身份，只写本人一侧的标记，
-- 避免给 conversations 开放整行 UPDATE 权限
create or replace function public.hide_conversations(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set buyer_hidden = true
  where id = any(p_ids) and buyer_id = auth.uid();
  update public.conversations
  set seller_hidden = true
  where id = any(p_ids) and seller_id = auth.uid();
end;
$$;

grant execute on function public.hide_conversations(uuid[]) to authenticated;
