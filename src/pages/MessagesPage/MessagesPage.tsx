import { useState, useEffect, useMemo, useRef, useCallback, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Send,
  Shield,
  ArrowLeft,
  MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  fetchConversations,
  fetchMessages,
  fetchProductById,
  getOrCreateConversation,
  markAllMessagesRead,
  markConversationRead,
  sendMessage,
  type IConversationItem,
  type IChatMessage,
} from '@/lib/api';

function fmtMsgTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth, authLoading } = useApp();
  const myId = auth.userId;

  const [conversations, setConversations] = useState<IConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showListMobile, setShowListMobile] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const loadConversations = useCallback(async () => {
    if (!myId) return;
    try {
      setConversations(await fetchConversations(myId));
    } catch {
      // 网络异常保持旧数据
    }
  }, [myId]);

  // 初始加载会话
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // 从商品详情 / 求购页跳转：创建或打开会话
  useEffect(() => {
    if (!myId) return;
    const productId = searchParams.get('product');
    const convId = searchParams.get('conv');
    if (!productId && !convId) return;

    (async () => {
      try {
        let targetId = convId;
        if (productId && !targetId) {
          const res = await fetchProductById(productId);
          if (!res) {
            toast.error('商品不存在或已下架');
            return;
          }
          if (res.product.sellerId === myId) {
            toast.info('这是你自己发布的商品');
            return;
          }
          targetId = await getOrCreateConversation(
            productId,
            myId,
            res.product.sellerId,
            `你正在咨询「${res.product.title}」，请使用站内私信沟通，请勿添加微信/QQ，谨防诈骗。`,
          );
        }
        await loadConversations();
        setActiveId(targetId);
        setShowListMobile(false);
      } catch {
        toast.error('打开会话失败，请稍后重试');
      } finally {
        setSearchParams({}, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, searchParams]);

  // 打开会话 → 加载消息 + 标记已读
  useEffect(() => {
    if (!activeId || !myId) return;
    fetchMessages(activeId)
      .then(setMessages)
      .catch(() => {});
    markConversationRead(activeId, myId).catch(() => {});
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)),
    );
  }, [activeId, myId]);

  // Realtime：单频道订阅新消息（RLS 保证只收到自己参与会话的消息）
  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`messages-${myId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            type: 'text' | 'system';
            read_at: string | null;
            created_at: string;
          };
          const msg: IChatMessage = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            content: row.content,
            type: row.type,
            readAt: row.read_at,
            createdAt: row.created_at,
          };
          // 当前打开的会话 → 直接上屏并标记已读（按 id 去重，自己发的消息已通过接口返回上屏）
          if (row.conversation_id === activeIdRef.current) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
            );
            if (row.sender_id !== myId) {
              markConversationRead(row.conversation_id, myId).catch(() => {});
            }
          }
          // 更新会话列表（最后一条消息 + 未读）
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === row.conversation_id);
            if (!exists) {
              // 新会话（对方首次发起）→ 重新拉取列表
              void loadConversations();
              return prev;
            }
            return prev
              .map((c) =>
                c.id === row.conversation_id
                  ? {
                      ...c,
                      lastMessage: row.content.slice(0, 100),
                      lastMessageAt: row.created_at,
                      unreadCount:
                        row.conversation_id === activeIdRef.current ||
                        row.sender_id === myId
                          ? c.unreadCount
                          : c.unreadCount + 1,
                    }
                  : c,
              )
              .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [myId, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const filteredConvs = useMemo(() => {
    if (!keyword.trim()) return conversations;
    const kw = keyword.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        c.lastMessage.toLowerCase().includes(kw) ||
        c.otherNickname.toLowerCase().includes(kw),
    );
  }, [conversations, keyword]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0);

  // 一键已读：清空所有会话未读
  const handleMarkAllRead = async () => {
    if (!myId) return;
    try {
      await markAllMessagesRead(myId);
      setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
      toast.success('已全部标记为已读');
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeId || !myId || sending) return;
    setInput('');
    setSending(true);
    try {
      const msg = await sendMessage(activeId, myId, content);
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === activeId
              ? { ...c, lastMessage: content.slice(0, 100), lastMessageAt: msg.createdAt }
              : c,
          )
          .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
      );
    } catch {
      toast.error('发送失败，请稍后重试');
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !auth.isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Send className="size-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium mb-1">请先登录</h3>
        <p className="text-sm text-muted-foreground mb-4">
          登录后可使用站内私信与同学沟通
        </p>
        <Button onClick={() => navigate('/profile')}>去登录</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-0 md:px-6 h-[calc(100vh-4rem)] flex flex-col md:flex-row md:py-6">
        {/* 会话列表 */}
        <div
          className={cn(
            'w-full md:w-80 md:shrink-0 border-b md:border-b-0 md:border-r border-border/60 bg-card flex flex-col',
            'md:rounded-l-xl md:border md:border-r-0',
            showListMobile ? 'flex' : 'hidden md:flex',
          )}
        >
          <div className="p-4 border-b border-border/60">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">消息</h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {totalUnread} 条未读
                </Badge>
                {totalUnread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleMarkAllRead()}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    一键已读
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索会话"
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length > 0 ? (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveId(conv.id);
                    setShowListMobile(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 border-b border-border/40 text-left transition-colors',
                    activeId === conv.id
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <div className="relative shrink-0">
                    <Image
                      src={conv.otherAvatar}
                      alt=""
                      className="size-11 rounded-full object-cover"
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-xs font-medium flex items-center justify-center">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {conv.otherNickname}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {fmtMsgTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {keyword ? '没有找到会话' : '还没有会话，去商品详情页私信卖家吧'}
              </div>
            )}
          </div>
        </div>

        {/* 聊天窗口 */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-card md:rounded-r-xl md:border md:border-l-0 border-border/60 min-h-0',
            showListMobile ? 'hidden md:flex' : 'flex',
          )}
        >
          {activeConv ? (
            <>
              {/* 聊天顶栏 */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowListMobile(true)}
                  className="md:hidden size-8"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <Image
                  src={activeConv.otherAvatar}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {activeConv.otherNickname}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeConv.otherVerified ? '✓ 已认证学生' : '未认证'}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </div>

              {/* 关联商品卡片 */}
              {activeConv.product && (
                <div
                  onClick={() => navigate(`/products/${activeConv.product!.id}`)}
                  className="mx-4 my-3 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors"
                >
                  {activeConv.product.image && (
                    <Image
                      src={activeConv.product.image}
                      alt=""
                      className="size-14 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activeConv.product.title}
                    </p>
                    <p className="text-primary font-semibold text-sm">
                      ¥{activeConv.product.price}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    商品
                  </Badge>
                </div>
              )}

              {/* 安全提示 */}
              <div className="mx-4 mb-3 py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs">
                <Shield className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800 leading-relaxed">
                  <span className="font-medium">安全提醒：</span>
                  请勿添加微信/QQ等外部联系方式，所有沟通请使用站内私信，谨防诈骗。
                </p>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-gradient-to-b from-muted/20 to-transparent">
                <AnimatePresence>
                  {messages.map((msg) => {
                    const isMe = msg.senderId === myId;
                    if (msg.type === 'system') {
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex justify-center"
                        >
                          <div className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full max-w-[90%] text-center">
                            {msg.content}
                          </div>
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          'flex gap-2',
                          isMe ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {!isMe && (
                          <Image
                            src={activeConv.otherAvatar}
                            alt=""
                            className="size-7 rounded-full object-cover shrink-0 self-end"
                          />
                        )}
                        <div
                          className={cn(
                            'max-w-[75%] px-3.5 py-2 text-sm rounded-2xl',
                            isMe
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-card border border-border/60 rounded-bl-sm',
                          )}
                        >
                          <p className="whitespace-pre-line break-words">
                            {msg.content}
                          </p>
                          <div
                            className={cn(
                              'text-[10px] mt-1',
                              isMe
                                ? 'text-primary-foreground/70 text-right'
                                : 'text-muted-foreground',
                            )}
                          >
                            {fmtMsgTime(msg.createdAt)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区 */}
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-border/60 flex items-center gap-2 bg-card"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入消息..."
                  className="h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || sending}
                  className="size-10 rounded-full shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
                <Send className="size-7" />
              </div>
              <p className="text-sm">选择一个会话开始聊天</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
