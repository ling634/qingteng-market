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
  ShieldAlert,
  ImagePlus,
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
import ImageCropDialog from '@/components/ImageCropDialog';
import { Image } from '@/components/ui/image';
import { uploadMiscImage } from '@/lib/image';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/data/categories';
import { toast } from 'sonner';
import type { IWanted } from '@/data/wanted';
import { supabase } from '@/lib/supabase';
import { fetchWantedPage, insertWanted, getOrCreateConversation } from '@/lib/api';
import { findSensitiveWordIn } from '@/lib/sensitive-words';

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
  // 求购配图（选填一张）：选图→裁剪→立即上传，表单里只存最终 URL
  const [formImage, setFormImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
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

  // 敏感词即时提示：命中即在弹窗内标红并禁用提交（提交时再兜底校验一次）
  const sensitiveHit = findSensitiveWordIn(formTitle, formDesc);

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
    // 敏感词兜底拦截（正常情况即时提示已拦住）
    const hit = findSensitiveWordIn(formTitle, formDesc);
    if (hit) {
      toast.error(`内容包含违规词「${hit}」，请修改后再发布`);
      return;
    }
    setSubmitting(true);
    try {
      await insertWanted(auth.userId, {
        title: formTitle.trim(),
        category: formCat,
        budget: formBudget.trim(),
        description: formDesc.trim(),
        image: formImage ?? undefined,
      });
      setDialogOpen(false);
      setFormTitle('');
      setFormBudget('');
      setFormDesc('');
      setFormImage(null);
      toast.success('求购发布成功！');
      void loadPage(0, false);
    } catch {
      toast.error('发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 求购配图：选图 → 打开裁剪（4:3）
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || imgUploading) return;
    setCropSrc(URL.createObjectURL(file));
  };

  // 裁剪确认 → 立即上传，表单只保留 URL
  const handleCropConfirm = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setImgUploading(true);
    try {
      const file = new File([blob], 'wanted.jpg', { type: 'image/jpeg' });
      const url = await uploadMiscImage(auth.userId, file, 'wanted');
      setFormImage(url);
    } catch {
      toast.error('图片上传失败，请重试');
    } finally {
      setImgUploading(false);
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
                {/* 求购配图（选填一张，可裁剪）：帮卖家理解你想要什么样的 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    求购图片
                    <span className="text-xs text-muted-foreground ml-1 font-normal">
                      选填，可框选裁剪
                    </span>
                  </label>
                  {formImage ? (
                    <div className="relative w-28">
                      <Image
                        src={formImage}
                        alt="求购图片"
                        className="w-28 h-28 object-cover rounded-lg border border-border/60"
                      />
                      <button
                        type="button"
                        onClick={() => setFormImage(null)}
                        className="!absolute -top-1.5 -right-1.5 z-10 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                        aria-label="移除图片"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="block w-28 cursor-pointer">
                      <div className="w-28 h-28 rounded-lg border-2 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        {imgUploading ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <ImagePlus className="size-5" />
                        )}
                        <span className="text-[11px]">
                          {imgUploading ? '上传中' : '添加图片'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFile}
                        disabled={imgUploading}
                      />
                    </label>
                  )}
                </div>
                {/* 敏感词即时提示（命中时禁用发布） */}
                {sensitiveHit && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2.5">
                    <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">
                      内容包含违规词「{sensitiveHit}」，请修改后再发布
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={submitting || !!sensitiveHit}>
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
              className="space-y-2"
            >
              {items.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setDetail(w)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left bg-card border border-border/60 rounded-xl hover:border-primary/40 hover:shadow-sm transition-all"
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
          {/* 求购配图：限高展示，不占满屏 */}
          {detail?.image && (
            <Image
              src={detail.image}
              alt="求购图片"
              className="max-h-60 w-auto max-w-full object-contain rounded-xl border border-border/60 mx-auto"
            />
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              关闭
            </Button>
            {/* 自己的求购不可联系自己，按钮置灰提示 */}
            <Button
              className="gap-1.5"
              disabled={!detail || detail.buyerId === auth.userId || contacting === detail.id}
              title={detail?.buyerId === auth.userId ? '这是你自己发布的求购' : undefined}
              onClick={() => {
                const w = detail;
                if (!w) return;
                setDetail(null);
                void handleContact(w);
              }}
            >
              {detail && contacting === detail.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              {detail?.buyerId === auth.userId ? '自己的求购' : '联系买家'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 求购配图裁剪（自由矩形，不锁长宽比） */}
      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        title="裁剪求购图片"
        description="拖动框选出想展示的区域，长宽可自由调节"
        onCancel={() => {
          if (cropSrc) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
        onConfirm={(blob) => void handleCropConfirm(blob)}
      />
    </div>
  );
}
