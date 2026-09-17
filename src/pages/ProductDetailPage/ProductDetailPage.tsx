import { useState, useEffect, useCallback } from 'react';
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
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image } from '@/components/ui/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  fetchProductById,
  fetchRelatedProducts,
  fetchProductBuyers,
  fetchLatestProductTrade,
  getOrCreateConversation,
  insertReport,
  reserveProduct,
  cancelReservation,
  sendSystemMessage,
  setProductStatus,
  fetchReceivedReviews,
  type ISellerInfo,
  type IProductBuyer,
  type IReceivedReview,
} from '@/lib/api';
import StarRating from '@/components/StarRating';
import type { IProduct } from '@/data/products';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, auth } = useApp();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [seller, setSeller] = useState<ISellerInfo | undefined>();
  const [relatedProducts, setRelatedProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetail, setReportDetail] = useState('');
  const [reporting, setReporting] = useState(false);
  // 卖家信誉弹窗：评分 + 收到的历史评价
  const [sellerOpen, setSellerOpen] = useState(false);
  const [sellerReviews, setSellerReviews] = useState<IReceivedReview[]>([]);
  const [sellerReviewsLoading, setSellerReviewsLoading] = useState(false);

  // 打开卖家主页弹窗时惰性加载其收到的评价
  const handleOpenSeller = () => {
    if (!product) return;
    setSellerOpen(true);
    setSellerReviewsLoading(true);
    fetchReceivedReviews(product.sellerId)
      .then(setSellerReviews)
      .catch(() => setSellerReviews([]))
      .finally(() => setSellerReviewsLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setImgIdx(0);
    window.scrollTo({ top: 0 });
    fetchProductById(id)
      .then((res) => {
        setProduct(res?.product ?? null);
        setSeller(res?.seller);
        if (res?.product) {
          fetchRelatedProducts(res.product.category, res.product.id)
            .then(setRelatedProducts)
            .catch(() => {});
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const fav = product ? isFavorite(product.id) : false;

  const handleReport = async () => {
    if (!reportReason) {
      toast.error('请选择举报原因');
      return;
    }
    if (!auth.isLoggedIn) {
      toast.error('请先登录后再举报');
      navigate('/profile');
      return;
    }
    if (!product) return;
    setReporting(true);
    try {
      await insertReport(auth.userId, {
        targetType: 'product',
        targetId: product.id,
        reason: reportReason,
        detail: reportDetail.trim(),
      });
      toast.success('举报已提交，管理员会尽快处理');
      setReportOpen(false);
      setReportReason('');
      setReportDetail('');
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setReporting(false);
    }
  };

  const handleChat = useCallback(() => {
    if (!product) return;
    if (!auth.isLoggedIn) {
      toast.error('请先登录后再私信卖家');
      navigate('/profile');
      return;
    }
    if (auth.userId === product.sellerId) {
      toast.info('这是你自己发布的商品');
      return;
    }
    navigate(`/messages?product=${product.id}`);
  }, [product, auth.isLoggedIn, auth.userId, navigate]);

  const handleToggleFav = () => {
    if (!product) return;
    void toggleFavorite(product.id).then(() => {
      if (auth.isLoggedIn) toast.success(fav ? '已取消收藏' : '已加入收藏');
    });
  };

  const isOwner = auth.isLoggedIn && product?.sellerId === auth.userId;

  // 卖家管理自己的商品：下架 / 重新上架
  const handleSetStatus = async (status: IProduct['status']) => {
    if (!product) return;
    try {
      await setProductStatus(product.id, status);
      setProduct({
        ...product,
        status,
        is_top: status === 'on_sale' ? product.is_top : false,
      });
      toast.success(
        status === 'offline' ? '已下架，可在详情页重新上架' : '已重新上架',
      );
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  // ---------- 卖家标记预订（选择买家） ----------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [buyers, setBuyers] = useState<IProductBuyer[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleOpenPicker = async () => {
    if (!product) return;
    setPickerOpen(true);
    setBuyersLoading(true);
    try {
      setBuyers(await fetchProductBuyers(product.id));
    } catch {
      setBuyers([]);
    } finally {
      setBuyersLoading(false);
    }
  };

  // 标记已预订：绑定买家 → 生成交易 → 会话里发系统消息通知买家
  const handleReserveToBuyer = async (buyer: IProductBuyer) => {
    if (!product || reserving) return;
    setReserving(true);
    try {
      await reserveProduct(product.id, buyer.id);
      const convId = await getOrCreateConversation(product.id, buyer.id, auth.userId);
      await sendSystemMessage(
        convId,
        auth.userId,
        '卖家已将该商品预订给你，请尽快线下交接',
      );
      setProduct({ ...product, status: 'reserved', is_top: false });
      setPickerOpen(false);
      toast.success(`已预订给「${buyer.nickname}」`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败，请稍后重试');
    } finally {
      setReserving(false);
    }
  };

  // 卖家取消预订：商品回到在售，通知买家
  const handleCancelReservation = async () => {
    if (!product || cancelling) return;
    setCancelling(true);
    try {
      await cancelReservation(product.id);
      const trade = await fetchLatestProductTrade(product.id);
      if (trade) {
        const convId = await getOrCreateConversation(product.id, trade.buyerId, auth.userId);
        await sendSystemMessage(convId, auth.userId, '卖家取消了预订，商品已重新在售');
      }
      setProduct({ ...product, status: 'on_sale' });
      toast.success('已取消预订，商品重新在售');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败，请稍后重试');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setViewerOpen(true)}
              />
              {product.is_top && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md">
                  <Sun className="size-3.5" />
                  向阳位 · 置顶
                </div>
              )}
              {product.status === 'reserved' && (
                <div className="absolute top-0 left-0 z-10 pointer-events-none">
                  <div className="w-0 h-0 border-t-[88px] border-r-[88px] border-t-emerald-600 border-r-transparent drop-shadow-md" />
                  <span className="absolute top-[16px] left-0 w-[64px] text-center text-xs font-bold text-white -rotate-45">
                    已预订
                  </span>
                </div>
              )}
              {product.status === 'sold' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-white/95 text-foreground font-bold px-5 py-2 rounded-full text-sm shadow-md">
                    已售出
                  </span>
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
              <div className="flex items-start gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug flex-1">
                  {product.title}
                </h1>
                {/* 编辑闲置：本人在售/已下架商品可修改信息（保存后发布时间刷新） */}
                {isOwner && (product.status === 'on_sale' || product.status === 'offline') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1 h-8"
                    onClick={() => navigate(`/publish?edit=${product.id}`)}
                  >
                    <Pencil className="size-3.5" />
                    编辑闲置
                  </Button>
                )}
              </div>
              {!!product.wantCount && (
                <p className="text-xs text-muted-foreground mt-1">
                  {product.wantCount} 人想要
                </p>
              )}
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

            {/* 卖家信息卡（点击头像/昵称区域查看卖家信誉与历史评价） */}
            <div className="bg-card border border-border/60 rounded-xl p-4">
              <button
                onClick={handleOpenSeller}
                className="w-full flex items-center gap-3 mb-3 text-left group"
                title="查看卖家信誉与评价"
              >
                <Image
                  src={product.sellerAvatar}
                  alt=""
                  className="size-12 rounded-full object-cover group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {product.sellerNickname}
                    </span>
                    {seller?.verified && (
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 text-amber-500 fill-amber-500" />
                    {seller ? seller.rating.toFixed(1) : '5.0'} · {seller?.tradeCount ?? 0} 次交易
                    <span className="ml-1 text-primary/70">查看评价 ›</span>
                  </div>
                </div>
              </button>
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
              {!isOwner && product.status === 'on_sale' && (
                <Button onClick={handleChat} className="w-full mt-3 gap-2">
                  <MessageSquare className="size-4" />
                  私信卖家
                </Button>
              )}
              {isOwner && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  这是你发布的商品，可用底部按钮管理状态
                </p>
              )}
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
          {isOwner ? (
            product.status === 'on_sale' ? (
              <>
                <Button
                  variant="secondary"
                  className="flex-1 h-11"
                  onClick={() => void handleSetStatus('offline')}
                >
                  下架
                </Button>
                <Button
                  className="flex-1 h-11 gap-2"
                  onClick={() => void handleOpenPicker()}
                >
                  <CheckCircle2 className="size-5" />
                  标记已预订
                </Button>
              </>
            ) : product.status === 'reserved' ? (
              <Button
                variant="secondary"
                className="flex-1 h-11"
                disabled={cancelling}
                onClick={() => void handleCancelReservation()}
              >
                {cancelling ? '处理中...' : '取消预订'}
              </Button>
            ) : (
              <Button
                className="flex-1 h-11"
                onClick={() => void handleSetStatus('on_sale')}
              >
                重新上架
              </Button>
            )
          ) : (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleToggleFav}
                className={cn('size-11 shrink-0', fav && 'text-primary')}
              >
                <Heart className={cn('size-5', fav && 'fill-current')} />
              </Button>
              {product.status === 'sold' ? (
                <Button disabled className="flex-1 h-11 text-base">
                  已售出
                </Button>
              ) : product.status === 'reserved' ? (
                <Button disabled className="flex-1 h-11 text-base">
                  已被预订
                </Button>
              ) : (
                <Button onClick={handleChat} className="flex-1 h-11 text-base gap-2">
                  <MessageSquare className="size-5" />
                  私信卖家
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* PC 端右侧悬浮操作 */}
      <div className="hidden md:flex fixed right-6 bottom-8 flex-col gap-2 z-40">
        {isOwner ? (
          product.status === 'on_sale' ? (
            <>
              <Button
                variant="secondary"
                onClick={() => void handleSetStatus('offline')}
                className="shadow-lg rounded-full h-12 px-5"
              >
                下架
              </Button>
              <Button
                onClick={() => void handleOpenPicker()}
                className="shadow-lg rounded-full gap-2 h-12 px-5"
              >
                <CheckCircle2 className="size-5" />
                标记已预订
              </Button>
            </>
          ) : product.status === 'reserved' ? (
            <Button
              variant="secondary"
              disabled={cancelling}
              onClick={() => void handleCancelReservation()}
              className="shadow-lg rounded-full h-12 px-5"
            >
              {cancelling ? '处理中...' : '取消预订'}
            </Button>
          ) : (
            <Button
              onClick={() => void handleSetStatus('on_sale')}
              className="shadow-lg rounded-full h-12 px-5"
            >
              重新上架
            </Button>
          )
        ) : (
          <>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleToggleFav}
              className={cn('size-12 shadow-lg rounded-full', fav && 'text-primary')}
            >
              <Heart className={cn('size-5', fav && 'fill-current')} />
            </Button>
            {product.status === 'sold' ? (
              <Button disabled className="shadow-lg rounded-full h-12 px-5">
                已售出
              </Button>
            ) : product.status === 'reserved' ? (
              <Button disabled className="shadow-lg rounded-full h-12 px-5">
                已被预订
              </Button>
            ) : (
              <Button
                onClick={handleChat}
                className="shadow-lg rounded-full gap-2 h-12 px-5"
              >
                <MessageSquare className="size-5" />
                私信卖家
              </Button>
            )}
          </>
        )}
      </div>

      {/* 标记已预订：从私聊过的买家中选择 */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>标记已预订</DialogTitle>
            <DialogDescription>
              选择预订该商品的买家（仅显示私聊过本商品的用户）
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {buyersLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
            ) : buyers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground leading-relaxed">
                还没有买家私聊过这个商品，
                <br />
                可以让买家在私聊里自己点「预订」
              </p>
            ) : (
              <div className="space-y-1 py-1">
                {buyers.map((b) => (
                  <button
                    key={b.id}
                    disabled={reserving}
                    onClick={() => void handleReserveToBuyer(b)}
                    className="w-full flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted transition-colors text-left disabled:opacity-50"
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={b.avatar} />
                      <AvatarFallback>{b.nickname.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium truncate">{b.nickname}</span>
                    <span className="text-xs text-primary shrink-0">
                      {reserving ? '处理中...' : '预订给TA'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 全屏大图查看器：点商品图打开，完整比例显示，可左右切换 */}
      {viewerOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center"
          onClick={() => setViewerOpen(false)}
        >
          <img
            src={product.images[imgIdx]}
            alt={product.title}
            className="max-w-full max-h-full object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 size-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={() => setViewerOpen(false)}
            aria-label="关闭"
          >
            <X className="size-5" />
          </button>
          {product.images.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i - 1 + product.images.length) % product.images.length);
                }}
                aria-label="上一张"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i + 1) % product.images.length);
                }}
                aria-label="下一张"
              >
                <ChevronRight className="size-6" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                {imgIdx + 1}/{product.images.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* 卖家信誉弹窗：评分 + 信誉标签 + 收到的历史评价 */}
      <Dialog open={sellerOpen} onOpenChange={setSellerOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>卖家主页</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 卖家概览 */}
            <div className="flex items-center gap-3">
              <Image
                src={product.sellerAvatar}
                alt=""
                className="size-14 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground truncate">
                    {product.sellerNickname}
                  </span>
                  {seller?.verified && (
                    <Badge className="bg-primary/15 text-primary border-0 text-xs">
                      已认证
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {seller?.tradeCount ?? 0} 次交易
                  {seller && seller.reportCount > 0 && (
                    <span className="text-destructive">
                      {' '}· 被举报 {seller.reportCount} 次
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-2xl font-bold text-primary">
                  {seller ? seller.rating.toFixed(1) : '5.0'}
                </div>
                <StarRating value={seller?.rating ?? 5} className="size-3.5" />
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {sellerReviews.length} 次评价
                </div>
              </div>
            </div>

            {/* 信誉标签 */}
            {seller?.reputationTags && seller.reputationTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {seller.reputationTags.map((tag) => (
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
              </div>
            )}

            {/* 历史评价 */}
            <div>
              <h4 className="font-semibold text-sm mb-2">收到的评价</h4>
              {sellerReviewsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : sellerReviews.length > 0 ? (
                <div className="space-y-2.5">
                  {sellerReviews.map((r) => (
                    <div
                      key={r.id}
                      className="bg-muted/40 border border-border/50 rounded-xl p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Image
                          src={r.buyerAvatar}
                          alt=""
                          className="size-6 rounded-full object-cover"
                        />
                        <span className="font-medium text-xs truncate">
                          {r.buyerNickname}
                        </span>
                        <span className="ml-auto shrink-0">
                          <StarRating value={r.buyerRating ?? 0} className="size-3" />
                        </span>
                      </div>
                      {r.buyerComment && (
                        <p className="text-xs text-foreground/80">{r.buyerComment}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {r.completedAt || ''} · 关于「{r.productTitle}」
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/40 border border-dashed border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground">
                  还没有收到评价
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <SelectItem value="虚假信息 / 假货">虚假信息 / 假货</SelectItem>
                  <SelectItem value="疑似被盗物品">疑似被盗物品</SelectItem>
                  <SelectItem value="违禁物品">违禁物品</SelectItem>
                  <SelectItem value="诱导添加微信/QQ">诱导添加微信/QQ</SelectItem>
                  <SelectItem value="疑似诈骗">疑似诈骗</SelectItem>
                  <SelectItem value="其他原因">其他原因</SelectItem>
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
            <Button onClick={handleReport} variant="destructive" disabled={reporting}>
              {reporting ? '提交中...' : '提交举报'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
