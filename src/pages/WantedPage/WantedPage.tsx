import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MessageSquare,
  Clock,
  Wallet,
  Tag,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

export default function WantedPage() {
  const navigate = useNavigate();
  const { wanted, addWanted, auth } = useApp();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [tab, setTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formCat, setFormCat] = useState('教材数码');
  const [formTitle, setFormTitle] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    let list = wanted;
    if (tab === 'open') list = list.filter((w) => w.status === 'open');
    if (tab === 'closed') list = list.filter((w) => w.status === 'closed');
    if (category !== 'all') list = list.filter((w) => w.category === category);
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(kw) ||
          w.description.toLowerCase().includes(kw),
      );
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [wanted, tab, category, keyword]);

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
    await new Promise((r) => setTimeout(r, 600));
    addWanted({
      title: formTitle.trim(),
      category: formCat,
      budget: formBudget.trim(),
      description: formDesc.trim(),
    });
    setSubmitting(false);
    setDialogOpen(false);
    setFormTitle('');
    setFormBudget('');
    setFormDesc('');
    toast.success('求购发布成功！');
  };

  const handleContact = (w: IWanted) => {
    if (!auth.isLoggedIn) {
      toast.error('请先登录');
      navigate('/profile');
      return;
    }
    toast.success('已向求购者发送私信');
    navigate('/messages');
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

        {/* Tabs + 分类 */}
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="w-full justify-start bg-transparent p-0 gap-1 overflow-x-auto">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              全部求购
            </TabsTrigger>
            <TabsTrigger
              value="open"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              求购中
            </TabsTrigger>
            <TabsTrigger
              value="closed"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              已完成
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

        {/* 列表 */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
            >
              {filtered.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="bg-card border border-border/60 rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-foreground leading-snug flex-1">
                      {w.title}
                    </h3>
                    <Badge
                      variant={w.status === 'open' ? 'default' : 'secondary'}
                      className="shrink-0"
                    >
                      {w.status === 'open' ? (
                        <>
                          <CheckCircle2 className="size-3 mr-1" />
                          求购中
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3 mr-1" />
                          已完成
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Wallet className="size-4" />
                      {w.budget}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="size-3.5" />
                      {w.category}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70 line-clamp-2 mb-3 min-h-[2.5rem]">
                    {w.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {w.createdAt}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1 text-xs"
                      onClick={() => handleContact(w)}
                      disabled={w.status === 'closed'}
                    >
                      <MessageSquare className="size-3.5" />
                      {w.status === 'open' ? '联系买家' : '已结束'}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
