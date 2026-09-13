import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Send,
  Shield,
  ArrowLeft,
  MoreVertical,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
import { useApp } from '@/context/AppContext';
import { MOCK_CONVERSATIONS, type IConversation } from '@/data/messages';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MOCK_USERS } from '@/data/users';

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getProductById, products } = useApp();

  // 本地会话状态
  const [conversations, setConversations] =
    useState<IConversation[]>(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showListMobile, setShowListMobile] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从商品详情跳转来的话，创建或打开对应会话
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId) {
      const existing = conversations.find((c) => c.productId === productId);
      if (existing) {
        setActiveId(existing.id);
        setShowListMobile(false);
      } else {
        const product = getProductById(productId);
        if (product) {
          const newConv: IConversation = {
            id: `new_${productId}`,
            productId,
            participants: ['current_user', product.sellerId],
            lastMessage: '开始聊聊这件商品吧~',
            lastMessageAt: new Date().toLocaleString('zh-CN'),
            unreadCount: 0,
            messages: [
              {
                id: 'sys_1',
                senderId: 'system',
                content: `你正在咨询「${product.title}」，请使用站内私信沟通，请勿添加微信/QQ，谨防诈骗。`,
                timestamp: new Date().toLocaleString('zh-CN'),
                type: 'system',
              },
            ],
          };
          setConversations((prev) => [newConv, ...prev]);
          setActiveId(newConv.id);
          setShowListMobile(false);
        }
      }
    } else if (conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [searchParams, conversations, products]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, conversations]);

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
        getOtherNickname(c).toLowerCase().includes(kw),
    );
  }, [conversations, keyword]);

  function getOtherUserId(conv: IConversation) {
    return conv.participants.find((p) => p !== 'current_user') || '';
  }

  function getOtherNickname(conv: IConversation) {
    const otherId = getOtherUserId(conv);
    const user = MOCK_USERS.find((u) => u.id === otherId);
    if (user) return user.nickname;
    // 从 mock data 里找 seller
    const p = products.find((pr) => pr.sellerId === otherId);
    return p?.sellerNickname || '同学';
  }

  function getOtherAvatar(conv: IConversation) {
    const otherId = getOtherUserId(conv);
    const user = MOCK_USERS.find((u) => u.id === otherId);
    if (user) return user.avatar;
    const p = products.find((pr) => pr.sellerId === otherId);
    return p?.sellerAvatar || MOCK_USERS[0].avatar;
  }

  function getOtherVerified(conv: IConversation) {
    const otherId = getOtherUserId(conv);
    return MOCK_USERS.find((u) => u.id === otherId)?.verified ?? false;
  }

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;
    const msg = input.trim();
    setInput('');
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessage: msg,
              lastMessageAt: new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              messages: [
                ...c.messages,
                {
                  id: `m_${Date.now()}`,
                  senderId: 'current_user',
                  content: msg,
                  timestamp: new Date().toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  type: 'text',
                },
              ],
              unreadCount: 0,
            }
          : c,
      ),
    );

    // 模拟对方回复
    setTimeout(() => {
      const replies = [
        '好的，没问题~',
        '可以的，什么时候方便自提？',
        '好嘞，给你留着',
        '嗯嗯，行',
        '收到，那我们约个时间吧',
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                lastMessage: reply,
                lastMessageAt: new Date().toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                messages: [
                  ...c.messages,
                  {
                    id: `m_${Date.now()}_r`,
                    senderId: getOtherUserId(c),
                    content: reply,
                    timestamp: new Date().toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    type: 'text',
                  },
                ],
              }
            : c,
        ),
      );
    }, 1000 + Math.random() * 1000);
  };

  const relatedProduct = activeConv?.productId
    ? getProductById(activeConv.productId)
    : null;

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
              <Badge variant="secondary" className="text-xs">
                {conversations.filter((c) => c.unreadCount > 0).length} 条未读
              </Badge>
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
                    // 标记已读
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === conv.id ? { ...c, unreadCount: 0 } : c,
                      ),
                    );
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
                      src={getOtherAvatar(conv)}
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
                        {getOtherNickname(conv)}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {conv.lastMessageAt.split(' ')[1] || conv.lastMessageAt}
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
                没有找到会话
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
                  src={getOtherAvatar(activeConv)}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {getOtherNickname(activeConv)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getOtherVerified(activeConv) ? '✓ 已认证学生' : '未认证'}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </div>

              {/* 关联商品卡片 */}
              {relatedProduct && (
                <div
                  onClick={() => navigate(`/products/${relatedProduct.id}`)}
                  className="mx-4 my-3 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors"
                >
                  <Image
                    src={relatedProduct.images[0]}
                    alt=""
                    className="size-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {relatedProduct.title}
                    </p>
                    <p className="text-primary font-semibold text-sm">
                      ¥{relatedProduct.price}
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
                  {activeConv.messages.map((msg, i) => {
                    const isMe = msg.senderId === 'current_user';
                    const isSys = msg.type === 'system';
                    if (isSys) {
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex justify-center"
                        >
                          <div className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
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
                        transition={{ duration: 0.25, delay: i * 0.02 }}
                        className={cn(
                          'flex gap-2',
                          isMe ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {!isMe && (
                          <Image
                            src={getOtherAvatar(activeConv)}
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
                            {msg.timestamp}
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
                  disabled={!input.trim()}
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
