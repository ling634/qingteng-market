import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Flag,
  MapPin,
  Sun,
  ChevronLeft,
  ChevronRight,
  Shield,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
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
import { formatPrice, cn } from '@/lib/utils';
import { toast } from 'sonner';
import ProductCard from '@/components/ProductCard';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProductById, isFavorite, toggleFavorite, products, getUserById } =
    useApp();

  const product = useMemo(() => (id ? getProductById(id) : undefined), [id, getProductById]);
  const [imgIdx, setImgIdx] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetail, setReportDetail] = useState('');

  useEffect(() => {
    setImgIdx(0);
    window.scrollTo({ top: 0 });
  }, [id]);

  const fav = product ? isFavorite(product.id) : false;

  const seller = product ? getUserById(product.sellerId) : undefined;

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (p) => p.id !== product.id && p.status === 'on_sale' && p.category === product.category,
      )
      .slice(0, 4);
  }, [product, products]);

  const handleReport = () => {
    if (!reportReason) {
      toast.error('请选择举报原因');
      return;
    }
    toast.success('举报已提交，管理员会尽快处理');
    setReportOpen(false);
    setReportReason('');
    setReportDetail('');
  };

  const handleChat = () => {
    navigate(`/messages?product=${product?.id || ''}`);
  };

  const handleToggleFav = () => {
    if (!product) return;
    toggleFavorite(product.id);
    toast.success(fav ? '已取消收藏' : '已加入收藏');
  };

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 text-center">
        <p className="text-muted-foreground mb-4">商品不存在或已下架</p>
        <Button onClick={() => navigate('/products')}>返回集市</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* 顶部返回栏 */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-12 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="size-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            <Link to="/products" className="hover:text-foreground">
              集市
            </Link>
            <span className="mx-1.5">/</span>
            {product.category}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-muted-foreground"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="size-3.5 mr-1" />
            举报
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* 左侧: 图片轮播 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/60 shadow-sm">
              <Image
                src={product.images[imgIdx]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              {product.is_top && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md">
                  <Sun className="size-3.5" />
                  向阳位 · 置顶
                </div>
              )}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImgIdx((i) => (i - 1 + product.images.length) % product.images.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/90 backdrop-blur-sm text-foreground hover:bg-white transition-colors flex items-center justify-center shadow-md"
                    aria-label="上一张"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={() =>
                      setImgIdx((i) => (i + 1) % product.images.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/90 backdrop-blur-sm text-foreground hover:bg-white transition-colors flex items-center justify-center shadow-md"
                    aria-label="下一张"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
              <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                {imgIdx + 1}/{product.images.length}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={cn(
                      'size-16 md:size-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all',
                      i === imgIdx
                        ? 'border-primary shadow-sm'
                        : 'border-transparent opacity-70 hover:opacity-100',
                    )}
                  >
                    <Image src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* 右侧: 商品信息 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-5"
          >
            <div>
              <div className="flex items-start gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  {product.category}
                </Badge>
                <Badge variant="outline">{product.condition}</Badge>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug">
                {product.title}
              </h1>
            </div>

            {/* 价格 */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  原价 {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* 关键信息 */}
            <div className="grid grid-cols-2 gap-3 py-4 border-y border-border/60">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{product.pickupLocation}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{product.createdAt} 发布</span>
              </div>
            </div>

            {/* 描述 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">商品描述</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* 安全提示 */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
              <Shield className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-primary-foreground/80">
                <p className="font-medium text-primary">交易安全提示</p>
                <p className="mt-0.5 text-foreground/70">
                  请使用站内私信沟通，请勿添加微信/QQ，谨防诈骗。线下自提注意人身安全。
                </p>
              </div>
            </div>

            {/* 卖家信息卡 */}
            <div className="bg-card border border-border/60 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src={product.sellerAvatar}
                  alt=""
                  className="size-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground truncate">
                      {product.sellerNickname}
                    </span>
                    {seller?.verified && (
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 text-amber-500 fill-amber-500" />
                    {seller?.rating?.toFixed(1) || '4.8'} · {seller?.tradeCount || 0} 次交易
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {seller?.reputationTags?.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      'text-xs font-normal',
                      tag.includes('举报') || tag.includes('被举报')
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
                {seller && seller.reportCount > 0 && (
                  <Badge variant="outline" className="text-xs font-normal text-destructive border-destructive/30">
                    <AlertTriangle className="size-3 mr-1" />
                    被举报 {seller.reportCount} 次
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 相关推荐 */}
        {relatedProducts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-foreground mb-4">猜你喜欢</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 (移动端) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 md:hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleToggleFav}
            className={cn('size-11 shrink-0', fav && 'text-primary')}
          >
            <Heart className={cn('size-5', fav && 'fill-current')} />
          </Button>
          <Button onClick={handleChat} className="flex-1 h-11 text-base gap-2">
            <MessageSquare className="size-5" />
            私信卖家
          </Button>
        </div>
      </div>

      {/* PC 端右侧悬浮操作 */}
      <div className="hidden md:flex fixed right-6 bottom-8 flex-col gap-2 z-40">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleToggleFav}
          className={cn('size-12 shadow-lg rounded-full', fav && 'text-primary')}
        >
          <Heart className={cn('size-5', fav && 'fill-current')} />
        </Button>
        <Button
          onClick={handleChat}
          className="shadow-lg rounded-full gap-2 h-12 px-5"
        >
          <MessageSquare className="size-5" />
          私信卖家
        </Button>
      </div>

      {/* 举报弹窗 */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>举报商品</DialogTitle>
            <DialogDescription>
              请选择举报原因，管理员会尽快核实处理
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                举报原因 <span className="text-destructive">*</span>
              </label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择举报原因" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fake">虚假信息 / 假货</SelectItem>
                  <SelectItem value="stolen">疑似被盗物品</SelectItem>
                  <SelectItem value="prohibited">违禁物品</SelectItem>
                  <SelectItem value="offline">诱导线下加微信/QQ</SelectItem>
                  <SelectItem value="fraud">疑似诈骗</SelectItem>
                  <SelectItem value="other">其他原因</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                补充说明
              </label>
              <Textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="请描述具体情况（可选）"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReport} variant="destructive">
              提交举报
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
