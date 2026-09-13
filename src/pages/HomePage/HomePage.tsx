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
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/data/categories';
import { useState, type FormEvent } from 'react';

const HERO_IMG =
  '/images/hero.png';

export default function HomePage() {
  const navigate = useNavigate();
  const { products } = useApp();
  const [keyword, setKeyword] = useState('');

  const topProducts = products
    .filter((p) => p.is_top && p.status === 'on_sale')
    .sort((a, b) => b.top_weight - a.top_weight)
    .slice(0, 3);

  const newProducts = products
    .filter((p) => p.status === 'on_sale')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

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
            <div className="relative rounded-3xl overflow-hidden aspect-[16/10] md:aspect-[21/9] shadow-lg">
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
                  className="space-y-4 md:space-y-6"
                >
                  <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                    <Leaf className="size-3.5" />
                    校园闲置 · 再生长一次
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                    青藤集市
                    <br />
                    <span className="text-primary-foreground/90 text-2xl md:text-3xl font-normal">
                      Qingteng Market
                    </span>
                  </h1>
                  <p className="text-white/80 text-sm md:text-base max-w-md">
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
                      className="bg-transparent border-0 pl-12 pr-28 h-12 text-sm focus-visible:ring-0"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-9 px-5"
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
        </section>

        {/* 分类快速入口 */}
        <section className="w-full">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
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
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="size-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-medium text-foreground">
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
          </div>
        </section>
      </main>
    </div>
  );
}
