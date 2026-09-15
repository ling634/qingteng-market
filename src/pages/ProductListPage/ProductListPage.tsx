import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  Filter,
  X,
  BookOpen,
  Shirt,
  Home,
  Bike,
  MoreHorizontal,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ProductCard from '@/components/ProductCard';
import { CATEGORIES } from '@/data/categories';
import ForestGoods from '@/components/ForestGoods';
import { supabase } from '@/lib/supabase';
import { fetchProductsPage, fetchTopProducts, type ProductSort } from '@/lib/api';
import type { IProduct } from '@/data/products';

const PAGE_SIZE = 15;

const categoryIcons: Record<string, typeof BookOpen> = {
  all: Sparkles,
  教材数码: BookOpen,
  服饰鞋包: Shirt,
  生活用品: Home,
  交通工具: Bike,
  其他: MoreHorizontal,
};

export default function ProductListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const category = searchParams.get('category') || 'all';
  const keyword = searchParams.get('q') || '';
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [sort, setSort] = useState<ProductSort>('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  const [tops, setTops] = useState<IProduct[]>([]);
  const [items, setItems] = useState<IProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 同步 URL 关键词到输入框
  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  const loadPage = useCallback(
    async (pageIndex: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await fetchProductsPage({
          category,
          keyword,
          sort,
          page: pageIndex,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(pageIndex);
      } catch {
        // 网络异常保持旧数据
      } finally {
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [category, keyword, sort],
  );

  // 筛选 / 排序变化 → 重置到第一页；置顶商品独立取一次
  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  useEffect(() => {
    fetchTopProducts(3)
      .then(setTops)
      .catch(() => {});
  }, []);

  // Realtime：商品变化时刷新当前筛选结果与置顶（1s 防抖，单频道）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('list-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            void loadPage(0, false);
            fetchTopProducts(3)
              .then(setTops)
              .catch(() => {});
          }, 1000);
        },
      )
      .subscribe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  // 滚动到底自动加载更多
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

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keywordInput.trim()) params.set('q', keywordInput.trim());
    if (category !== 'all') params.set('category', category);
    navigate(`/products?${params.toString()}`);
  };

  const handleCategoryChange = (cat: string) => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (cat !== 'all') params.set('category', cat);
    navigate(`/products?${params.toString()}`);
  };

  const sortLabel: Record<ProductSort, string> = {
    newest: '最新',
    'price-asc': '价格从低到高',
    'price-desc': '价格从高到低',
  };

  const displayCount = total + tops.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* 广告位 */}
        <div className="mb-6">
          <ForestGoods slotKey="forest_goods_main" />
        </div>

        {/* 搜索栏 */}
        <form onSubmit={onSearch} className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="搜索教材、自行车、生活用品..."
            className="pl-12 pr-4 h-12 rounded-xl bg-card border-border/60 shadow-sm"
          />
          {keywordInput && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const params = new URLSearchParams();
                if (category !== 'all') params.set('category', category);
                navigate(`/products?${params.toString()}`);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          )}
        </form>

        {/* 分类 + 排序栏 */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <Tabs
            value={category}
            onValueChange={handleCategoryChange}
            className="w-full flex-1 min-w-0"
          >
            <TabsList className="bg-transparent p-0 h-auto gap-1 overflow-x-auto flex-nowrap w-full justify-start">
              {CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 排序 (PC 端 inline) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const next: ProductSort =
                  sort === 'newest' ? 'price-asc' : sort === 'price-asc' ? 'price-desc' : 'newest';
                setSort(next);
              }}
              className="gap-1.5 text-xs"
            >
              <ArrowUpDown className="size-3.5" />
              {sortLabel[sort]}
            </Button>
          </div>

          {/* 移动端 filter sheet */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="md:hidden gap-1.5 text-xs shrink-0"
              >
                <Filter className="size-3.5" />
                筛选
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>筛选与排序</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">排序方式</h4>
                  <div className="space-y-2">
                    {(Object.keys(sortLabel) as ProductSort[]).map((s) => (
                      <Button
                        key={s}
                        variant={sort === s ? 'default' : 'secondary'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setSort(s);
                          setFilterOpen(false);
                        }}
                      >
                        {sortLabel[s]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3">商品分类</h4>
                  <div className="space-y-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = categoryIcons[cat.key] || Sparkles;
                      return (
                        <Button
                          key={cat.key}
                          variant={category === cat.key ? 'default' : 'secondary'}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            handleCategoryChange(cat.key);
                            setFilterOpen(false);
                          }}
                        >
                          <Icon className="size-4" />
                          {cat.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            共找到{' '}
            <span className="text-foreground font-semibold">{displayCount}</span>{' '}
            件商品
          </p>
        </div>

        {/* 商品网格 */}
        <AnimatePresence mode="wait">
          {displayCount > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
            >
              {tops.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </motion.div>
          ) : initialLoaded && !loading ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">
                没有找到相关商品
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                换个关键词或分类试试看？
              </p>
              <Button onClick={() => navigate('/products')}>查看全部商品</Button>
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
    </div>
  );
}
