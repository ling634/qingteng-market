import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MessageSquare,
  Clock,
  Wallet,
  Tag,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/data/categories';
import { toast } from 'sonner';
import type { IWanted } from '@/data/wanted';
import { supabase } from '@/lib/supabase';
import { fetchWantedPage, insertWanted, getOrCreateConversation } from '@/lib/api';

const PAGE_SIZE = 15;

export default function WantedPage() {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  // 点击紧凑行 → 求购详情弹窗（完整描述 + 联系买家）
  const [detail, setDetail] = useState<IWanted | null>(null);
  const [formCat, setFormCat] = useState('教材数码');
  const [formTitle, setFormTitle] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [contacting, setContacting] = useState<string | null>(null);

  const [items, setItems] = useState<IWanted[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const loadPage = useCallback(
    async (pageIndex: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await fetchWantedPage({
          category,
          keyword,
          page: pageIndex,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setHasMore(res.hasMore);
        setPage(pageIndex);
      } catch {
        // 网络异常保持旧数据
      } finally {
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [category, keyword],
  );

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  // Realtime：求购变化自动刷新（1s 防抖，单频道）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('wanted-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wanted' },
        () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => void loadPage(0, false), 1000);
        },
      )
      .subscribe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  // 滚动到底加载更多
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          void loadPage(page + 1, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPage]);

  const handleSubmit = async () => {
    if (!auth.isLoggedIn) {
      toast.error('请先登录后再发布求购');
      setDialogOpen(false);
      navigate('/profile');
      return;
    }
    if (!formTitle.trim() || !formBudget.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    setSubmitting(true);
    try {
      await insertWanted(auth.userId, {
        title: formTitle.trim(),
        category: formCat,
        budget: formBudget.trim(),
        description: formDesc.trim(),
      });
      setDialogOpen(false);
      setFormTitle('');
      setFormBudget('');
      setFormDesc('');
      toast.success('求购发布成功！');
      void loadPage(0, false);
    } catch {
      toast.error('发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContact = async (w: IWanted) => {
    if (!auth.isLoggedIn) {
      toast.error('请先登录');
      navigate('/profile');
      return;
    }
    if (w.buyerId === auth.userId) {
      toast.info('这是你自己发布的求购');
      return;
    }
    setContacting(w.id);
    try {
      const convId = await getOrCreateConversation(
        null,
        auth.userId,
        w.buyerId,
        `我有一条求购线索想和你聊聊「${w.title}」。请使用站内私信沟通，请勿添加微信/QQ，谨防诈骗。`,
      );
      navigate(`/messages?conv=${convId}`);
    } catch {
      toast.error('发起会话失败，请稍后重试');
    } finally {
      setContacting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部栏 */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold">求购专区</h1>
            <p className="text-xs text-muted-foreground">发布需求，让卖家来找你</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 shadow-sm">
                <Plus className="size-4" />
                发布求购
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>发布求购</DialogTitle>
                <DialogDescription>
                  写下你需要的物品，让卖家主动联系你
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    物品分类 <span className="text-destructive">*</span>
                  </label>
                  <Select value={formCat} onValueChange={setFormCat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                        <SelectItem key={cat.key} value={cat.key}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    求购标题 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="如：收一本高等数学教材"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    预算范围 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="如：10-30元"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">详细描述</label>
                  <Textarea
                    placeholder="描述你需要的物品细节、成色要求、自提范围等"
                    rows={3}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? '发布中...' : '立即发布'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5">
        {/* 搜索 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索求购信息..."
            className="pl-10 h-11 bg-card border-border/60"
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="!absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="清除"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.key}
              variant={category === cat.key ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap text-xs px-3 py-1"
              onClick={() => setCategory(cat.key)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* 紧凑列表（类似私信行）：标题 + 预算 + 分类 + 时间，点击看完整描述 */}
        <AnimatePresence mode="wait">
          {items.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-card border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40"
            >
              {items.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setDetail(w)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate leading-snug">
                      {w.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1 text-amber-600 font-medium shrink-0">
                        <Wallet className="size-3" />
                        {w.budget}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Tag className="size-3" />
                        {w.category}
                      </span>
                      <span className="flex items-center gap-1 ml-auto shrink-0">
                        <Clock className="size-3" />
                        {w.createdAt}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                </button>
              ))}
            </motion.div>
          ) : initialLoaded && !loading ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">
                暂无相关求购
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                换个关键词，或自己发布一条求购
              </p>
              <Button onClick={() => setDialogOpen(true)}>我要求购</Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* 加载更多哨兵 */}
        <div ref={sentinelRef} className="h-1" />
        {loading && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {!hasMore && items.length > 0 && !loading && (
          <p className="text-center text-xs text-muted-foreground py-6">
            已经到底啦
          </p>
        )}
      </div>

      {/* 求购详情弹窗：完整描述 + 联系买家 */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="leading-snug pr-4">{detail?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <Wallet className="size-3.5" />
                {detail?.budget}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="size-3.5" />
                {detail?.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {detail?.createdAt}
              </span>
            </DialogDescription>
          </DialogHeader>
          {detail?.description ? (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {detail.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">买家没有补充更多描述</p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              关闭
            </Button>
            {detail && detail.buyerId !== auth.userId && (
              <Button
                className="gap-1.5"
                disabled={contacting === detail.id}
                onClick={() => {
                  const w = detail;
                  setDetail(null);
                  void handleContact(w);
                }}
              >
                {contacting === detail.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageSquare className="size-4" />
                )}
                联系买家
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
