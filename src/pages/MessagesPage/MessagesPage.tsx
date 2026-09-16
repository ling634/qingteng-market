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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import RateTradeDialog from '@/components/RateTradeDialog';
import {
  fetchConversations,
  fetchConversationTrade,
  fetchMessages,
  fetchProductById,
  getOrCreateConversation,
  markAllMessagesRead,
  markConversationRead,
  reserveProduct,
  cancelReservation,
  confirmReceipt,
  sendMessage,
  sendSystemMessage,
  type IConversationItem,
  type IChatMessage,
  type ITradeRecord,
} from '@/lib/api';

function fmtMsgTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  // 当天的消息只显示时间，非当天显示「M月D日 HH:MM」
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? hm : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
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
  const messageListRef = useRef<HTMLDivElement>(null);

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

  // 新消息时只滚动消息列表容器内部到底部（瞬间定位，不带动整页滚动）
  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  // 软键盘适配：把可视窗口的高度与偏移写入 CSS 变量，聊天容器以 fixed 定位钉在可视窗口内
  // （微信 X5 / iOS 弹出键盘时会平移可视窗口，仅跟踪高度不够，必须同时跟踪 offsetTop）；
  // 键盘弹出时给根节点加 .kb-open：隐藏底部导航、聊天区占满可视窗口，输入框紧贴键盘
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const initialH = vv.height;
    const onResize = () => {
      root.style.setProperty('--vvh', `${vv.height}px`);
      root.style.setProperty('--vvo', `${vv.offsetTop}px`);
      root.classList.toggle('kb-open', vv.height < initialH * 0.8);
      // 抵消浏览器为显示聚焦输入框而做的自动滚页
      window.scrollTo(0, 0);
    };
    onResize();
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      root.classList.remove('kb-open');
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--vvo');
    };
  }, []);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  // ---------- 交易闭环：当前会话关联商品的交易状态 ----------
  const [trade, setTrade] = useState<ITradeRecord | null>(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    null | 'reserve' | 'reserveTo' | 'receipt' | 'cancel'
  >(null);
  const [rateTarget, setRateTarget] = useState<ITradeRecord | null>(null);

  const iAmBuyer = !!activeConv && activeConv.buyerId === myId;

  const loadTrade = useCallback(async () => {
    if (!activeConv?.product || !myId) {
      setTrade(null);
      return;
    }
    try {
      setTrade(
        await fetchConversationTrade(
          activeConv.product.id,
          activeConv.buyerId,
          activeConv.sellerId,
        ),
      );
    } catch {
      // 读取失败保持旧状态
    }
  }, [activeConv, myId]);

  // 打开会话 / 收到系统消息（对方完成预订、确认收货等操作）时刷新交易状态
  useEffect(() => {
    void loadTrade();
  }, [loadTrade]);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.type === 'system' && last.conversationId === activeId) {
      void loadTrade();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 交易操作后同步会话列表里的商品状态角标
  const patchConvProductStatus = (status: 'on_sale' | 'reserved' | 'sold') => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId && c.product ? { ...c, product: { ...c.product, status } } : c,
      ),
    );
  };

  // 买家点「预订」/ 卖家点「预订给TA」
  const doReserve = async () => {
    if (!activeConv?.product || !myId || tradeBusy) return;
    const buyerId = iAmBuyer ? myId : activeConv.otherId;
    setTradeBusy(true);
    try {
      await reserveProduct(activeConv.product.id, buyerId);
      await sendSystemMessage(
        activeConv.id,
        myId,
        iAmBuyer
          ? '买家已预订该商品，请尽快线下交接'
          : '卖家已将该商品预订给你，请尽快线下交接',
      );
      patchConvProductStatus('reserved');
      await loadTrade();
      toast.success('预订成功，请尽快线下交接');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败，请稍后重试');
    } finally {
      setTradeBusy(false);
      setConfirmAction(null);
    }
  };

  // 买家「确认收货」
  const doReceipt = async () => {
    if (!trade || !activeConv || !myId || tradeBusy) return;
    setTradeBusy(true);
    try {
      await confirmReceipt(trade.id);
      await sendSystemMessage(activeConv.id, myId, '买家已确认收货，交易完成');
      patchConvProductStatus('sold');
      await loadTrade();
      toast.success('已确认收货，交易完成，快去评价吧');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败，请稍后重试');
    } finally {
      setTradeBusy(false);
      setConfirmAction(null);
    }
  };

  // 卖家「取消预订」
  const doCancel = async () => {
    if (!activeConv?.product || !myId || tradeBusy) return;
    setTradeBusy(true);
    try {
      await cancelReservation(activeConv.product.id);
      await sendSystemMessage(activeConv.id, myId, '卖家取消了预订，商品已重新在售');
      patchConvProductStatus('on_sale');
      await loadTrade();
      toast.success('已取消预订');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败，请稍后重试');
    } finally {
      setTradeBusy(false);
      setConfirmAction(null);
    }
  };

  const filteredConvs = useMemo(() => {
    if (!keyword.trim()) return conversations;
    const kw = keyword.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        c.lastMessage.toLowerCase().includes(kw) ||
        c.otherNickname.toLowerCase().includes(kw),
    );
  }, [conversations, keyword]);

  // 未读消息总条数（而非有未读的会话数）
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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
    <div className="bg-background">
      {/* 手机端：fixed 钉在可视窗口内（top=可视偏移+顶栏，高=可视高-顶栏-底部导航；
          键盘弹出时 --headerh/--navh 归 0，聊天区自动占满可视窗口）；PC 端走普通文档流 */}
      <div className="max-w-6xl mx-auto px-0 md:px-6 flex flex-col md:flex-row md:py-6 fixed inset-x-0 z-40 top-[calc(var(--vvo,0px)+var(--headerh,4rem))] h-[calc(var(--vvh,100dvh)-var(--headerh,4rem)-var(--navh,52px))] md:static md:z-auto md:h-[calc(100dvh-4rem)]">
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

              {/* 关联商品卡片 + 交易操作（预订 / 确认收货 / 评价） */}
              {activeConv.product && (
                <div className="mx-4 my-3 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                  <div
                    onClick={() => navigate(`/products/${activeConv.product!.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
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
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {trade?.status === 'reserved' ? (
                      iAmBuyer ? (
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={tradeBusy}
                          onClick={() => setConfirmAction('receipt')}
                        >
                          确认收货
                        </Button>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            等待买家确认收货
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            disabled={tradeBusy}
                            onClick={() => setConfirmAction('cancel')}
                          >
                            取消预订
                          </Button>
                        </>
                      )
                    ) : trade?.status === 'completed' ? (
                      iAmBuyer && !trade.buyerRating ? (
                        <Button
                          size="sm"
                          className="h-8 bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => setRateTarget(trade)}
                        >
                          去评价
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {iAmBuyer ? '已评价' : '交易完成'}
                        </Badge>
                      )
                    ) : activeConv.product.status === 'on_sale' ? (
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={tradeBusy}
                        onClick={() => setConfirmAction(iAmBuyer ? 'reserve' : 'reserveTo')}
                      >
                        预订
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {activeConv.product.status === 'reserved'
                          ? '已被预订'
                          : activeConv.product.status === 'sold'
                            ? '已售出'
                            : '已下架'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* 交易二次确认弹窗 */}
              <AlertDialog
                open={!!confirmAction}
                onOpenChange={(o) => !o && setConfirmAction(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {confirmAction === 'reserve' || confirmAction === 'reserveTo'
                        ? '确认预订该商品？'
                        : confirmAction === 'receipt'
                          ? '确认已收到商品？'
                          : '取消该预订？'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {confirmAction === 'reserve' || confirmAction === 'reserveTo'
                        ? '预订后商品将标记为「已预订」并从集市隐藏购买入口，请尽快线下交接。'
                        : confirmAction === 'receipt'
                          ? '确认后交易完成，商品标记为已售出，之后可以评价卖家。'
                          : '取消后商品将重新变为在售状态。'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={tradeBusy}>再想想</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={tradeBusy}
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirmAction === 'reserve' || confirmAction === 'reserveTo') {
                          void doReserve();
                        } else if (confirmAction === 'receipt') {
                          void doReceipt();
                        } else {
                          void doCancel();
                        }
                      }}
                    >
                      {tradeBusy ? '处理中...' : '确认'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* 评价弹窗 */}
              <RateTradeDialog
                trade={rateTarget}
                onClose={() => setRateTarget(null)}
                onRated={() => void loadTrade()}
              />

              {/* 安全提示 */}
              <div className="mx-4 mb-3 py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs">
                <Shield className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800 leading-relaxed">
                  <span className="font-medium">安全提醒：</span>
                  请勿添加微信/QQ等外部联系方式，所有沟通请使用站内私信，谨防诈骗。
                </p>
              </div>

              {/* 消息列表 */}
              <div
                ref={messageListRef}
                className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-gradient-to-b from-muted/20 to-transparent"
              >
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
