import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sun,
  Sparkles,
  BookOpen,
  Shirt,
  Home,
  Bike,
  MoreHorizontal,
  ArrowRight,
  Leaf,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image } from '@/components/ui/image';
import ProductCard from '@/components/ProductCard';
import ForestGoods from '@/components/ForestGoods';
import AnnouncementBar from '@/components/AnnouncementBar';
import { CATEGORIES } from '@/data/categories';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchLatestProducts, fetchTopProducts } from '@/lib/api';
import type { IProduct } from '@/data/products';

const HERO_IMG =
  '/images/hero.png';

export default function HomePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [topProducts, setTopProducts] = useState<IProduct[]>([]);
  const [newProducts, setNewProducts] = useState<IProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tops, latest] = await Promise.all([
        fetchTopProducts(3),
        fetchLatestProducts(6),
      ]);
      setTopProducts(tops);
      setNewProducts(latest);
    } catch {
      // 网络异常保持旧数据
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime：商品有增删改时自动刷新（1s 防抖，单频道）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('home-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => void load(), 1000);
        },
      )
      .subscribe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/products?q=${encodeURIComponent(keyword)}`);
  };

  const handleCategoryClick = (cat: string) => {
    navigate(`/products?category=${encodeURIComponent(cat)}`);
  };

  const categoryIcons: Record<string, typeof BookOpen> = {
    all: Sparkles,
    教材数码: BookOpen,
    服饰鞋包: Shirt,
    生活用品: Home,
    交通工具: Bike,
    其他: MoreHorizontal,
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="space-y-10 md:space-y-14">
        {/* Hero */}
        <section className="w-full relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
            <div className="relative rounded-3xl overflow-hidden aspect-[6/5] sm:aspect-[16/10] md:aspect-[21/9] shadow-lg">
              <Image
                src={HERO_IMG}
                alt="青藤集市 hero"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 via-foreground/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-16 max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="space-y-3 sm:space-y-4 md:space-y-6"
                >
                  <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                    <Leaf className="size-3.5" />
                    校园闲置 · 再生长一次
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white leading-tight">
                    青藤集市
                    <br />
                    <span className="text-primary-foreground/90 text-lg sm:text-2xl md:text-3xl font-normal">
                      Qingteng Market
                    </span>
                  </h1>
                  <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-md line-clamp-2 sm:line-clamp-none">
                    专属于校园的二手闲置交易平台，纯线下自提、安全纯净，
                    让每一件旧物，都找到下一位珍惜它的人。
                  </p>
                  <form
                    onSubmit={onSearch}
                    className="relative w-full max-w-md bg-white/95 backdrop-blur-md rounded-full shadow-lg overflow-hidden"
                  >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                    <Input
                      type="search"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索你想要的闲置好物..."
                      className="bg-transparent border-0 pl-11 pr-24 h-12 text-sm focus-visible:ring-0"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-9 px-4"
                    >
                      搜索
                    </Button>
                  </form>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      onClick={() => navigate('/products')}
                      className="rounded-full bg-white text-primary hover:bg-white/90 shadow-md"
                    >
                      逛逛集市
                      <ArrowRight className="size-4 ml-1" />
                    </Button>
                    <Button
                      onClick={() => navigate('/wanted')}
                      variant="secondary"
                      className="rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm hover:bg-white/30"
                    >
                      发布求购
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          {/* 公告栏：搜索框（Hero）正下方，无公告时不渲染 */}
          <AnnouncementBar />
        </section>

        {/* 分类快速入口 */}
        <section className="w-full">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-5 md:grid-cols-6 gap-2 md:gap-3">
              {CATEGORIES.filter((c) => c.key !== 'all').map((cat, i) => {
                const Icon = categoryIcons[cat.key] || Sparkles;
                return (
                  <motion.button
                    key={cat.key}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    onClick={() => handleCategoryClick(cat.key)}
                    className="flex flex-col items-center gap-1.5 md:gap-2 p-2 md:p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="size-9 md:size-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Icon className="size-4 md:size-5" />
                    </div>
                    <span className="text-[11px] md:text-xs font-medium text-foreground whitespace-nowrap">
                      {cat.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 向阳位 - 置顶商品 */}
        {topProducts.length > 0 && (
          <section className="w-full">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-sm">
                    <Sun className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">向阳位</h2>
                    <p className="text-xs text-muted-foreground">
                      付费置顶 · 最多展示 3 件优质好物
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/products')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  查看全部
                  <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 林间好店广告位 */}
        <section className="w-full">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-sm">
                <Leaf className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">林间好店</h2>
                <p className="text-xs text-muted-foreground">
                  常青商户 · 校园周边好店推荐
                </p>
              </div>
            </div>
            <ForestGoods slotKey="forest_goods_main" />
          </div>
        </section>

        {/* 推荐商品流 */}
        <section className="w-full pb-8">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">最新上架</h2>
                <p className="text-xs text-muted-foreground">
                  同学们刚发布的闲置好物
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/products')}
                className="text-muted-foreground hover:text-foreground"
              >
                更多
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
            {newProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {newProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            ) : loaded ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-dashed border-border/60 rounded-2xl">
                <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Leaf className="size-7 text-primary" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">
                  集市刚刚开张，虚位以待
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  成为第一个发布闲置的同学吧
                </p>
                <Button onClick={() => navigate('/publish')}>发布闲置</Button>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
