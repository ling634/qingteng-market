import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  User,
  Package,
  Heart,
  ShoppingBag,
  Star,
  CheckCircle2,
  LogOut,
  Shield,
  Award,
  Droplets,
  Pencil,
  ClipboardList,
  BadgeCheck,
  MessageSquareText,
  LayoutDashboard,
  Loader2,
  ChevronDown,
  Trash2,
  Bell,
  Copy,
  Send,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AvatarCropDialog from '@/components/AvatarCropDialog';
import ImageCropDialog from '@/components/ImageCropDialog';
import RateTradeDialog from '@/components/RateTradeDialog';
import StarRating from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Image } from '@/components/ui/image';
import { useApp } from '@/context/AppContext';
import ProductCard from '@/components/ProductCard';
import { toast } from 'sonner';
import { formatPrice, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  fetchMyProducts,
  fetchProductsByIds,
  fetchMyFeedbacks,
  fetchMyPurchases,
  fetchReceivedReviews,
  fetchMyProfile,
  getOrCreateConversation,
  confirmReceipt,
  sendSystemMessage,
  hideTrade,
  setPayQr,
  submitFeedback,
  appendFeedbackMessage,
  deleteProduct,
  fetchMyWanted,
  setWantedStatus,
  deleteWanted,
  fetchMyLatestVerification,
  submitVerification,
  updateWxpusherUid,
  type IFeedback,
  type IPurchase,
  type IReceivedReview,
  type IVerificationRequest,
  type VerificationMethod,
} from '@/lib/api';
import { uploadMiscImage, uploadVerificationImage } from '@/lib/image';
import { createBindQrCode, pollBindStatus, sendTestWxPush } from '@/lib/wxpusher';
import type { IProduct } from '@/data/products';
import type { IWanted } from '@/data/wanted';

const loginSchema = z.object({
  nickname: z.string().min(1, '请输入昵称'),
  password: z.string().min(6, '密码至少 6 位'),
});
const registerSchema = z
  .object({
    nickname: z.string().min(1, '请输入昵称').max(20, '昵称不超过 20 个字符'),
    password: z.string().min(6, '密码至少 6 位'),
    confirmPassword: z.string().min(6, '密码至少 6 位'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

/** 「我的在售」卡片包装：已售出/已下架的商品支持长按（手机）或删除按钮（PC）发起删除 */
function MyProductCard({
  product,
  onRequestDelete,
}: {
  product: IProduct;
  onRequestDelete: (p: IProduct) => void;
}) {
  // 已预订的商品处于交接流程中，不可删除；在售中的走下架流程
  const deletable = product.status === 'sold' || product.status === 'offline';
  const timerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const startPress = () => {
    if (!deletable) return;
    timerRef.current = window.setTimeout(() => {
      // 长按触发后吞掉随之而来的 click，避免误跳转详情页
      suppressClickRef.current = true;
      onRequestDelete(product);
    }, 500);
  };
  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      className="relative"
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onContextMenu={(e) => {
        if (!deletable) return;
        e.preventDefault();
        onRequestDelete(product);
      }}
      onClickCapture={(e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <ProductCard product={product} />
      {deletable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(product);
          }}
          aria-label="删除商品"
          className="hidden md:flex absolute top-2 left-2 z-10 size-8 rounded-full bg-black/40 text-white items-center justify-center hover:bg-destructive transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

/** 求购状态文案 / 颜色 */
const WANTED_STATUS_LABEL: Record<IWanted['status'], string> = {
  open: '求购中',
  reserved: '已预订',
  done: '已买到',
  closed: '已下架',
};

/** 「我的求购」卡片：已买到/已下架支持长按（手机）或右键（PC）删除；点击卡片打开管理弹窗 */
function MyWantedCard({
  item,
  onManage,
  onRequestDelete,
}: {
  item: IWanted;
  onManage: (w: IWanted) => void;
  onRequestDelete: (w: IWanted) => void;
}) {
  const deletable = item.status === 'done' || item.status === 'closed';
  const timerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const startPress = () => {
    if (!deletable) return;
    timerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      onRequestDelete(item);
    }, 500);
  };
  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onManage(item);
      }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onContextMenu={(e) => {
        if (!deletable) return;
        e.preventDefault();
        onRequestDelete(item);
      }}
      className="bg-card border border-border/60 rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-foreground leading-snug flex-1 line-clamp-1">
          {item.title}
        </h3>
        <Badge
          variant={item.status === 'open' ? 'default' : 'secondary'}
          className={cn(
            'shrink-0',
            item.status === 'reserved' && 'bg-amber-500/15 text-amber-700 border-0',
            item.status === 'done' && 'bg-emerald-500/15 text-emerald-700 border-0',
          )}
        >
          {WANTED_STATUS_LABEL[item.status]}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="text-amber-600 font-medium">{item.budget}</span>
        <span>{item.category}</span>
        <span className="ml-auto text-xs">{item.createdAt}</span>
      </div>
      {item.description && (
        <p className="text-sm text-foreground/70 line-clamp-2 mt-2">
          {item.description}
        </p>
      )}
    </div>
  );
}

/** 「我的」页六个功能区 */
const PROFILE_TABS = [
  { key: 'selling', label: '我的在售', icon: Package },
  { key: 'favorites', label: '我的收藏', icon: Heart },
  { key: 'purchases', label: '我买到的', icon: ShoppingBag },
  { key: 'wanted', label: '我的求购', icon: ClipboardList },
  { key: 'reputation', label: '信誉评价', icon: Award },
  { key: 'feedback', label: '意见反馈', icon: MessageSquareText },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    auth,
    login,
    register,
    logout,
    favorites,
    updateNickname,
    updateAvatar,
    unreadAdmin,
  } = useApp();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authBusy, setAuthBusy] = useState(false);

  // 当前功能区（支持 /profile#feedback 等 hash 直达）
  const [tab, setTab] = useState(() => {
    const h = location.hash.replace('#', '');
    return PROFILE_TABS.some((t) => t.key === h) ? h : 'selling';
  });
  // 手机端功能区展开状态（默认收起为一行）
  const [funcOpen, setFuncOpen] = useState(false);

  const [myProducts, setMyProducts] = useState<IProduct[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<IProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [favProducts, setFavProducts] = useState<IProduct[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<IFeedback[]>([]);
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [reviews, setReviews] = useState<IReceivedReview[]>([]);
  const [receiptTarget, setReceiptTarget] = useState<IPurchase | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [rateTarget, setRateTarget] = useState<IPurchase | null>(null);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<IPurchase | null>(null);
  const [deleteOrderBusy, setDeleteOrderBusy] = useState(false);
  const [payQrUrl, setPayQrUrl] = useState<string | null>(null);
  const [poolOpen, setPoolOpen] = useState(false);
  const [poolBusy, setPoolBusy] = useState(false);
  // 汇水池：选图后先裁剪（objectURL），确认后再上传
  const [poolCropSrc, setPoolCropSrc] = useState<string | null>(null);
  const [myRating, setMyRating] = useState(5.0);
  const [myTags, setMyTags] = useState<string[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  // 昵称编辑（铅笔弹窗）
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [saving, setSaving] = useState(false);
  // 我的求购
  const [myWanted, setMyWanted] = useState<IWanted[]>([]);
  const [wantedManage, setWantedManage] = useState<IWanted | null>(null);
  const [wantedDelete, setWantedDelete] = useState<IWanted | null>(null);
  const [wantedBusy, setWantedBusy] = useState(false);
  // 认证申请（后置人工审核）
  const [verification, setVerification] = useState<IVerificationRequest | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<VerificationMethod>('student_card');
  const [verifyBusy, setVerifyBusy] = useState(false);
  // 微信消息推送（PushPlus Token 绑定）
  const [pushOpen, setPushOpen] = useState(false);
  // WxPusher 绑定状态：已绑定的 UID（null = 未绑定）
  const [pushUid, setPushUid] = useState<string | null>(null);
  // 扫码绑定：二维码（10 分钟有效）+ 加载态
  const [pushQr, setPushQr] = useState<{ code: string; qrUrl: string } | null>(null);
  const [pushQrLoading, setPushQrLoading] = useState(false);
  // 手动绑定：UID 输入框与保存态
  const [pushInput, setPushInput] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushTestBusy, setPushTestBusy] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nickname: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nickname: '', password: '', confirmPassword: '' },
  });

  const loadMyData = useCallback(async () => {
    if (!auth.isLoggedIn) return;
    const uid = auth.userId;
    const [products, feedbacks, purchaseList, reviewList, profile, wantedList, myVerification] =
      await Promise.all([
        fetchMyProducts(uid).catch(() => [] as IProduct[]),
        fetchMyFeedbacks(uid).catch(() => [] as IFeedback[]),
        fetchMyPurchases(uid).catch(() => [] as IPurchase[]),
        fetchReceivedReviews(uid).catch(() => [] as IReceivedReview[]),
        fetchMyProfile(uid).catch(() => null),
        fetchMyWanted(uid).catch(() => [] as IWanted[]),
        fetchMyLatestVerification(uid).catch(() => null),
      ]);
    setMyProducts(products);
    setMyFeedbacks(feedbacks);
    setPurchases(purchaseList);
    setReviews(reviewList);
    setMyWanted(wantedList);
    setVerification(myVerification);
    if (profile) {
      setMyRating(profile.rating);
      setMyTags(profile.reputationTags);
      setPayQrUrl(profile.payQrUrl);
      setPushUid(profile.wxpusherUid);
    }
  }, [auth.isLoggedIn, auth.userId]);

  // 登录后加载我的数据
  useEffect(() => {
    if (auth.isLoggedIn) {
      void loadMyData();
    } else {
      setMyProducts([]);
      setFavProducts([]);
      setMyFeedbacks([]);
      setPurchases([]);
      setReviews([]);
      setMyWanted([]);
      setVerification(null);
      setPayQrUrl(null);
      setPushUid(null);
      setMyRating(5.0);
      setMyTags([]);
    }
  }, [auth.isLoggedIn, loadMyData]);

  // 「我买到的」删除订单：买家侧隐藏，不影响卖家信誉评价
  const handleDeleteOrder = async () => {
    if (!deleteOrderTarget || deleteOrderBusy) return;
    setDeleteOrderBusy(true);
    try {
      await hideTrade(deleteOrderTarget.id);
      setPurchases((prev) => prev.filter((p) => p.id !== deleteOrderTarget.id));
      setDeleteOrderTarget(null);
      toast.success('订单已删除');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败，请稍后重试');
    } finally {
      setDeleteOrderBusy(false);
    }
  };

  // 汇水池：选图 → 矩形裁剪 → 上传（限一张，更换需先删除旧图）
  const handlePoolFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || poolBusy) return;
    setPoolCropSrc(URL.createObjectURL(file));
  };

  // 裁剪确认：上传裁剪后的图片
  const handlePoolCropConfirm = async (blob: Blob) => {
    if (poolCropSrc) URL.revokeObjectURL(poolCropSrc);
    setPoolCropSrc(null);
    setPoolBusy(true);
    try {
      const file = new File([blob], 'payqr.jpg', { type: 'image/jpeg' });
      const url = await uploadMiscImage(auth.userId, file, 'payqr');
      await setPayQr(auth.userId, url);
      setPayQrUrl(url);
      toast.success('收款码已放入汇水池');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败，请稍后重试');
    } finally {
      setPoolBusy(false);
    }
  };

  const handlePoolDelete = async () => {
    if (poolBusy) return;
    setPoolBusy(true);
    try {
      await setPayQr(auth.userId, null);
      setPayQrUrl(null);
      toast.success('已删除收款码，可以重新上传');
    } catch {
      toast.error('删除失败，请稍后重试');
    } finally {
      setPoolBusy(false);
    }
  };

  // 微信推送：一键复制 PushPlus 公众号名称
  const handleCopyPushAccount = async () => {
    try {
      await navigator.clipboard.writeText('WxPusher');
      toast.success('已复制「WxPusher」，去微信粘贴搜索');
    } catch {
      toast.error('复制失败，请手动输入：WxPusher');
    }
  };

  // 微信推送：打开弹窗（未绑定时同步生成绑定二维码）
  const handlePushOpen = () => {
    setPushOpen(true);
    if (!pushUid && !pushQr && !pushQrLoading) void refreshPushQr();
  };

  // 生成/刷新绑定二维码（10 分钟有效）
  const refreshPushQr = async () => {
    setPushQrLoading(true);
    setPushQr(null);
    const qr = await createBindQrCode();
    setPushQrLoading(false);
    if (qr) {
      setPushQr(qr);
    } else {
      toast.error('二维码生成失败，请稍后重试');
    }
  };

  // 扫码绑定轮询：官方要求间隔 ≥ 10 秒；弹窗关闭、已绑定或二维码失效后停止
  useEffect(() => {
    if (!pushOpen || !pushQr || pushUid) return;
    let stopped = false;
    const timer = setInterval(() => {
      void (async () => {
        if (stopped) return;
        const uid = await pollBindStatus(pushQr.code);
        if (uid && !stopped) {
          setPushUid(uid);
          setPushQr(null);
          toast.success('绑定成功，微信消息推送已开启');
        }
      })();
    }, 10000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pushOpen, pushQr, pushUid]);

  // 微信推送：手动粘贴 UID 绑定（扫码的备选路径；微信复制的 UID 可能夹带零宽字符需清洗）
  const handlePushSave = async () => {
    if (pushBusy) return;
    const trimmed = pushInput.replace(/[\s\u200B\u200C\u200D\uFEFF]/g, '');
    if (!trimmed) {
      toast.error('UID 不能为空，请粘贴你的 WxPusher UID');
      return;
    }
    if (!trimmed.startsWith('UID_')) {
      toast.error('UID 格式不对，应以 UID_ 开头（公众号「我的-我的UID」里复制）');
      return;
    }
    setPushBusy(true);
    try {
      await updateWxpusherUid(auth.userId, trimmed);
      setPushUid(trimmed);
      setPushQr(null);
      setPushInput('');
      toast.success('绑定成功，微信消息推送已开启');
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setPushBusy(false);
    }
  };

  // 微信推送：解绑
  const handlePushUnbind = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      await updateWxpusherUid(auth.userId, null);
      setPushUid(null);
      setPushInput('');
      toast.success('已解绑，微信消息推送已关闭');
    } catch {
      toast.error('解绑失败，请稍后重试');
    } finally {
      setPushBusy(false);
    }
  };

  // 微信推送：发送测试消息（走服务端，appToken 不在前端）
  const handlePushTest = async () => {
    if (!pushUid || pushTestBusy) return;
    setPushTestBusy(true);
    const result = await sendTestWxPush();
    setPushTestBusy(false);
    if (result.ok) {
      toast.success('测试消息已发送，请查看微信「WxPusher」公众号');
    } else {
      toast.error(`发送失败：${result.msg}`);
    }
  };

  // 买家在「我买到的」里确认收货：交易完成 + 私信里通知卖家
  const handleConfirmReceipt = async () => {
    if (!receiptTarget || receiptBusy) return;
    setReceiptBusy(true);
    try {
      await confirmReceipt(receiptTarget.id);
      if (receiptTarget.productId) {
        const convId = await getOrCreateConversation(
          receiptTarget.productId,
          auth.userId,
          receiptTarget.sellerId,
        );
        await sendSystemMessage(convId, auth.userId, '买家已确认收货，交易完成');
      }
      toast.success('已确认收货，交易完成，快去评价吧');
      setReceiptTarget(null);
      void loadMyData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败，请稍后重试');
    } finally {
      setReceiptBusy(false);
    }
  };

  // 联系卖家：打开（或创建）会话并跳转消息页
  const handleContactSeller = async (p: IPurchase) => {
    try {
      const convId = await getOrCreateConversation(p.productId, auth.userId, p.sellerId);
      navigate(`/messages?conv=${convId}`);
    } catch {
      toast.error('打开会话失败，请稍后重试');
    }
  };

  // 删除已售出/已下架的商品（不可恢复）
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      toast.success(`已删除「${deleteTarget.title}」`);
      setDeleteTarget(null);
      void loadMyData();
    } catch {
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  // 收藏夹变化 → 拉取商品详情
  useEffect(() => {
    if (favorites.length === 0) {
      setFavProducts([]);
      return;
    }
    fetchProductsByIds(favorites)
      .then(setFavProducts)
      .catch(() => {});
  }, [favorites]);

  // 反馈被管理员回复时实时刷新（订阅自己名下 feedbacks 的 UPDATE）
  useEffect(() => {
    if (!auth.isLoggedIn) return;
    const channel = supabase
      .channel(`my-feedbacks-${auth.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedbacks',
          filter: `user_id=eq.${auth.userId}`,
        },
        () => {
          fetchMyFeedbacks(auth.userId)
            .then(setMyFeedbacks)
            .catch(() => {});
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auth.isLoggedIn, auth.userId]);

  // 昵称编辑弹窗：保存新昵称（全站唯一，登录凭证保持不变）
  const handleSaveNickname = async () => {
    if (!nicknameInput.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    setSaving(true);
    const res = await updateNickname(nicknameInput);
    setSaving(false);
    if (res === true) {
      toast.success('昵称已更新');
      setNicknameOpen(false);
    } else {
      toast.error(res);
    }
  };

  // 求购状态流转（与商品管理同一套交互）
  const handleWantedStatus = async (w: IWanted, status: IWanted['status']) => {
    if (wantedBusy) return;
    setWantedBusy(true);
    try {
      await setWantedStatus(w.id, status);
      toast.success(
        status === 'reserved'
          ? '已标记为已预订'
          : status === 'done'
            ? '已标记为已买到'
            : status === 'closed'
              ? '求购已下架'
              : '求购已重新发布',
      );
      setWantedManage(null);
      void loadMyData();
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setWantedBusy(false);
    }
  };

  const handleWantedDelete = async () => {
    if (!wantedDelete || wantedBusy) return;
    setWantedBusy(true);
    try {
      await deleteWanted(wantedDelete.id);
      toast.success(`已删除求购「${wantedDelete.title}」`);
      setWantedDelete(null);
      setWantedManage(null);
      void loadMyData();
    } catch {
      toast.error('删除失败，请稍后重试');
    } finally {
      setWantedBusy(false);
    }
  };

  // 提交认证申请：上传证件照到私有桶 → 写入申请表（等待管理员人工审核）
  const handleVerifyFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || verifyBusy) return;
    setVerifyBusy(true);
    try {
      const path = await uploadVerificationImage(auth.userId, file);
      await submitVerification(auth.userId, verifyMethod, path);
      toast.success('认证申请已提交，管理员会尽快人工审核');
      setVerifyOpen(false);
      void loadMyData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setVerifyBusy(false);
    }
  };

  // 从相册选择头像 → 打开裁剪弹窗
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCropFile(file);
  };

  // 裁剪确认 → 上传
  const handleCropConfirm = async (file: File) => {
    setAvatarUploading(true);
    const ok = await updateAvatar(file);
    setAvatarUploading(false);
    if (ok) {
      toast.success('头像已更新');
      setCropFile(null);
    } else {
      toast.error('头像上传失败，请稍后重试');
    }
  };

  const handleLogin = async (values: LoginFormData) => {
    setAuthBusy(true);
    const err = await login(values.nickname.trim(), values.password);
    setAuthBusy(false);
    if (!err) {
      toast.success('登录成功，欢迎回来～');
      setAuthOpen(false);
      loginForm.reset();
    } else {
      toast.error(err);
    }
  };

  const handleRegister = async (values: RegisterFormData) => {
    setAuthBusy(true);
    const err = await register({
      nickname: values.nickname,
      password: values.password,
    });
    setAuthBusy(false);
    if (!err) {
      toast.success('注册成功，已自动登录');
      setAuthOpen(false);
      registerForm.reset();
    } else {
      toast.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('已退出登录');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        {/* 用户信息卡 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl border border-border/60 p-5 md:p-6 mb-5 shadow-sm overflow-hidden relative"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

          {/* 退出登录：头卡右上角小图标 */}
          {auth.isLoggedIn && (
            <button
              onClick={() => void handleLogout()}
              title="退出登录"
              className="absolute top-3 right-3 z-10 size-8 rounded-full bg-card/80 border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          )}

          <div className="relative flex items-start gap-4">
            <div className="relative shrink-0 flex flex-col items-center gap-2">
              {auth.isLoggedIn ? (
                <label className="relative block cursor-pointer" title="点击更换头像">
                  <Image
                    src={auth.avatar}
                    alt=""
                    className="size-16 md:size-20 rounded-full object-cover border-4 border-white shadow-md"
                  />
                  {avatarUploading && (
                    <span className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin" />
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                    disabled={avatarUploading}
                  />
                </label>
              ) : (
                <div className="size-16 md:size-20 rounded-full bg-muted flex items-center justify-center border-4 border-white shadow-md">
                  <User className="size-8 text-muted-foreground" />
                </div>
              )}
              {auth.verified && (
                <div className="absolute -bottom-1 -right-1 size-6 bg-primary rounded-full flex items-center justify-center text-white border-2 border-white">
                  <CheckCircle2 className="size-4" />
                </div>
              )}
              {auth.isAdmin && (
                <div className="absolute -bottom-1 -right-1 size-6 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                  <Shield className="size-3.5" />
                </div>
              )}
              {/* 认证后置：未认证用户可申请成为认证园丁（人工审核） */}
              {auth.isLoggedIn && !auth.verified && !auth.isAdmin && (
                verification?.status === 'pending' ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <Loader2 className="size-3" />
                    认证审核中
                  </span>
                ) : (
                  <button
                    onClick={() => setVerifyOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <BadgeCheck className="size-3.5" />
                    {verification?.status === 'rejected' ? '重新申请认证' : '申请成为认证园丁'}
                  </button>
                )
              )}
            </div>
            <div className="flex-1 min-w-0">
              {auth.isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {auth.nickname}
                    </h2>
                    {/* 昵称编辑入口（铅笔） */}
                    <button
                      onClick={() => {
                        setNicknameInput(auth.nickname);
                        setNicknameOpen(true);
                      }}
                      title="编辑昵称"
                      className="size-6 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    {auth.isAdmin ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs">
                        管理员
                      </Badge>
                    ) : auth.verified ? (
                      <Badge className="bg-primary/15 text-primary border-0 text-xs">
                        已认证
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        未认证
                      </Badge>
                    )}
                    {auth.isBanned && (
                      <Badge variant="destructive" className="text-xs">
                        已封禁
                      </Badge>
                    )}
                    {/* 汇水池：收款码管理入口（昵称行右侧） */}
                    <button
                      onClick={() => setPoolOpen(true)}
                      className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Droplets className="size-3.5" />
                      汇水池
                    </button>
                    {/* 微信消息推送：WxPusher 绑定入口 */}
                    <button
                      onClick={handlePushOpen}
                      className="ml-1 inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-500/20 transition-colors"
                    >
                      <Bell className="size-3.5" />
                      微信推送
                      {pushUid && (
                        <span className="size-1.5 rounded-full bg-emerald-500" title="已绑定" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {myProducts.length}
                      </div>
                      <div className="text-xs text-muted-foreground">在售</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {favorites.length}
                      </div>
                      <div className="text-xs text-muted-foreground">收藏</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {purchases.filter((p) => p.status === 'completed').length}
                      </div>
                      <div className="text-xs text-muted-foreground">买到</div>
                    </div>
                    <div className="text-center flex items-center gap-1">
                      <Star className="size-4 text-amber-500 fill-amber-500" />
                      <span className="text-lg font-bold text-foreground">{myRating.toFixed(1)}</span>
                    </div>
                  </div>
                  {auth.isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1.5 relative"
                      onClick={() => navigate('/admin')}
                    >
                      <LayoutDashboard className="size-3.5" />
                      进入管理后台
                      {unreadAdmin > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-medium flex items-center justify-center leading-none">
                          {unreadAdmin > 99 ? '99+' : unreadAdmin}
                        </span>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-foreground">欢迎来到青藤集市</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    登录后可发布商品、收藏好物、私信买家
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={() => { setAuthMode('login'); setAuthOpen(true); }} className="gap-2">
                      <Shield className="size-4" />
                      登录
                    </Button>
                    <Button variant="outline" onClick={() => { setAuthMode('register'); setAuthOpen(true); }} className="gap-2">
                      <User className="size-4" />
                      注册
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tab 内容 */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          {/* 手机端：收起为一行（当前功能 + 展开箭头），点开为 4+3 两行图标网格 */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setFuncOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border/60 text-sm font-medium"
            >
              {(() => {
                const cur = PROFILE_TABS.find((t) => t.key === tab) ?? PROFILE_TABS[0];
                const CurIcon = cur.icon;
                return (
                  <>
                    <CurIcon className="size-4 text-primary" />
                    <span className="flex-1 text-left">{cur.label}</span>
                  </>
                );
              })()}
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  funcOpen && 'rotate-180',
                )}
              />
            </button>
            {funcOpen && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {PROFILE_TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setTab(t.key);
                        setFuncOpen(false);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] transition-colors',
                        active
                          ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                          : 'border-border/60 bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PC 端：保持原有横向 Tab */}
          <TabsList className="hidden md:flex w-full justify-start bg-transparent p-0 gap-1 overflow-x-auto border-b border-border/40 mb-5 h-auto">
            {PROFILE_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2.5 text-xs md:text-sm whitespace-nowrap gap-1.5"
                >
                  <Icon className="size-4" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* 我的在售 */}
          <TabsContent value="selling" className="mt-0">
            {auth.isLoggedIn ? (
              myProducts.length > 0 ? (
                <>
                  <p className="md:hidden text-xs text-muted-foreground mb-2">
                    长按已售出 / 已下架的商品卡片可将其删除
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {myProducts.map((p) => (
                      <MyProductCard
                        key={p.id}
                        product={p}
                        onRequestDelete={setDeleteTarget}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Package className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium mb-1">还没有发布过商品</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    闲置物品放着也是落灰，不如卖给需要的同学
                  </p>
                  <Button onClick={() => navigate('/publish')}>去发布</Button>
                </div>
              )
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 我的收藏 */}
          <TabsContent value="favorites" className="mt-0">
            {auth.isLoggedIn ? (
              favProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {favProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Heart className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium mb-1">还没有收藏商品</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    逛逛集市，发现心仪好物
                  </p>
                  <Button onClick={() => navigate('/products')}>去逛逛</Button>
                </div>
              )
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 我买到的（预订 → 确认收货 → 评价 的买家侧入口） */}
          <TabsContent value="purchases" className="mt-0">
            {auth.isLoggedIn ? (
              purchases.length > 0 ? (
                <div className="space-y-3">
                  {purchases.map((p) => (
                    <div
                      key={p.id}
                      className="bg-card border border-border/60 rounded-xl overflow-hidden"
                    >
                      {/* 卖家信息 + 交易状态 */}
                      <div className="flex items-center gap-2 px-4 pt-3">
                        <Image
                          src={p.sellerAvatar}
                          alt=""
                          className="size-6 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium truncate">
                          {p.sellerNickname}
                        </span>
                        <span
                          className={cn(
                            'ml-auto text-sm font-medium shrink-0',
                            p.status === 'completed'
                              ? 'text-orange-500'
                              : p.status === 'reserved'
                                ? 'text-amber-600'
                                : 'text-muted-foreground',
                          )}
                        >
                          {p.status === 'completed'
                            ? '交易成功'
                            : p.status === 'reserved'
                              ? '待收货'
                              : '已取消'}
                        </span>
                      </div>
                      {/* 商品信息（点击进详情） */}
                      <div
                        onClick={() => p.productId && navigate(`/products/${p.productId}`)}
                        className={cn(
                          'flex gap-3 px-4 py-3',
                          p.productId && 'cursor-pointer',
                        )}
                      >
                        <Image
                          src={p.productImage}
                          alt=""
                          className="size-20 rounded-lg object-cover shrink-0 bg-muted"
                        />
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h4 className="font-medium text-sm line-clamp-2 leading-snug">
                            {p.productTitle}
                          </h4>
                          <span className="text-primary font-bold mt-auto">
                            {formatPrice(p.price)}
                          </span>
                        </div>
                      </div>
                      {/* 操作区：左下删除订单（仅已完结），右下联系卖家/确认收货/去评价 */}
                      <div className="flex items-center gap-2 px-4 pb-3">
                        {p.status !== 'reserved' && (
                          <button
                            onClick={() => setDeleteOrderTarget(p)}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            删除订单
                          </button>
                        )}
                        {p.status !== 'cancelled' && (
                          <div className="flex items-center gap-2 ml-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full"
                              onClick={() => void handleContactSeller(p)}
                            >
                              联系卖家
                            </Button>
                            {p.status === 'reserved' && (
                              <Button
                                size="sm"
                                className="h-8 rounded-full"
                                onClick={() => setReceiptTarget(p)}
                              >
                                确认收货
                              </Button>
                            )}
                            {p.status === 'completed' &&
                              (p.buyerRating ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 rounded-full"
                                  disabled
                                >
                                  已评价
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-white"
                                  onClick={() => setRateTarget(p)}
                                >
                                  去评价
                                </Button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ShoppingBag className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium mb-1">还没有买到商品</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    在私聊里点击「预订」，交易就会出现在这里
                  </p>
                  <Button onClick={() => navigate('/products')}>去逛逛</Button>
                </div>
              )
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 信誉评价：平均分 + 收到的评价列表 */}
          <TabsContent value="reputation" className="mt-0">
            {auth.isLoggedIn ? (
              <div className="space-y-5">
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{myRating.toFixed(1)}</div>
                      <div className="mt-1">
                        <StarRating value={myRating} className="size-4" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        基于 {reviews.length} 次评价
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-2">信誉标签</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(myTags.length > 0 ? myTags : ['正常交易']).map(
                          (tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-primary/10 text-primary border-0 text-xs"
                            >
                              {tag}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-3">收到的评价</h3>
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div
                        key={r.id}
                        className="bg-card border border-border/60 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Image
                            src={r.buyerAvatar}
                            alt=""
                            className="size-7 rounded-full object-cover"
                          />
                          <span className="font-medium text-sm truncate">
                            {r.buyerNickname}
                          </span>
                          <span className="ml-auto shrink-0">
                            <StarRating value={r.buyerRating ?? 0} className="size-3.5" />
                          </span>
                        </div>
                        {r.buyerComment && (
                          <p className="text-sm text-foreground/80">{r.buyerComment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {r.completedAt || ''} · 关于「{r.productTitle}」
                        </p>
                      </div>
                    ))}
                    {reviews.length === 0 && (
                      <div className="bg-card border border-border/60 rounded-xl p-8 text-center text-sm text-muted-foreground">
                        还没有收到评价
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 意见反馈 */}
          <TabsContent value="feedback" className="mt-0">
            {auth.isLoggedIn ? (
              <FeedbackList feedbacks={myFeedbacks} onChanged={loadMyData} />
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 我的求购（与「我的在售」同一套管理交互：点击管理，长按删除已完结） */}
          <TabsContent value="wanted" className="mt-0">
            {auth.isLoggedIn ? (
              myWanted.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    点击卡片可管理求购；长按已买到 / 已下架的卡片可将其删除
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {myWanted.map((w) => (
                      <MyWantedCard
                        key={w.id}
                        item={w}
                        onManage={setWantedManage}
                        onRequestDelete={setWantedDelete}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ClipboardList className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium mb-1">还没有发布过求购</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    找不到想要的东西？发布求购让卖家来找你
                  </p>
                  <Button onClick={() => navigate('/wanted')}>去发布求购</Button>
                </div>
              )
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 头像裁剪弹窗 */}
      <AvatarCropDialog
        file={cropFile}
        onClose={() => setCropFile(null)}
        onConfirm={(f) => void handleCropConfirm(f)}
        busy={avatarUploading}
      />

      {/* 确认收货二次确认 */}
      <AlertDialog
        open={!!receiptTarget}
        onOpenChange={(o) => !o && setReceiptTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认已收到商品？</AlertDialogTitle>
            <AlertDialogDescription>
              确认后「{receiptTarget?.productTitle}」交易完成，商品标记为已售出，之后可以评价卖家。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={receiptBusy}>再想想</AlertDialogCancel>
            <AlertDialogAction
              disabled={receiptBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmReceipt();
              }}
            >
              {receiptBusy ? '处理中...' : '确认收货'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 评价弹窗 */}
      <RateTradeDialog
        trade={rateTarget}
        onClose={() => setRateTarget(null)}
        onRated={() => void loadMyData()}
      />

      {/* 删除订单确认（买家侧隐藏，不影响卖家信誉） */}
      <AlertDialog
        open={!!deleteOrderTarget}
        onOpenChange={(o) => !o && setDeleteOrderTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该订单？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteOrderTarget?.productTitle}」将从你的「我买到的」列表中移除，卖家的信誉评价不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrderBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteOrderBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteOrder();
              }}
            >
              {deleteOrderBusy ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 汇水池：收款码管理（限一张，更换需先删除旧图） */}
      <Dialog open={poolOpen} onOpenChange={setPoolOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Droplets className="size-4 text-emerald-600" />
              汇水池
            </DialogTitle>
            <DialogDescription>
              欢迎来到汇水池！这里是买家向你支付「浇灌金」的地方
            </DialogDescription>
          </DialogHeader>
          {payQrUrl ? (
            <div className="space-y-3">
              <Image
                src={payQrUrl}
                alt="收款码"
                className="w-full max-h-80 object-contain rounded-xl border border-border/60 bg-white"
              />
              <p className="text-xs text-muted-foreground text-center">
                只能保留一张收款码，如需更换请先删除当前图片
              </p>
              <Button
                variant="destructive"
                className="w-full"
                disabled={poolBusy}
                onClick={() => void handlePoolDelete()}
              >
                {poolBusy ? '处理中...' : '删除当前收款码'}
              </Button>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-emerald-500/40 rounded-xl py-10 flex flex-col items-center gap-2 text-emerald-700 hover:bg-emerald-500/5 transition-colors">
                {poolBusy ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <Droplets className="size-6" />
                )}
                <span className="text-sm font-medium">
                  {poolBusy ? '上传中...' : '从相册选择收款码图片'}
                </span>
                <span className="text-xs text-muted-foreground px-6 text-center">
                  选择后可以框选裁剪需要的区域；建议使用微信或支付宝的收款码，买家在私聊里点「去浇灌」即可看到
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handlePoolFile(e)}
                disabled={poolBusy}
              />
            </label>
          )}
        </DialogContent>
      </Dialog>

      {/* 汇水池收款码裁剪：选图后先裁剪再上传（1:1 裁剪框） */}
      <ImageCropDialog
        open={!!poolCropSrc}
        imageSrc={poolCropSrc}
        aspect={1}
        title="裁剪收款码"
        description="拖动框选出收款码区域，去掉多余部分"
        onCancel={() => {
          if (poolCropSrc) URL.revokeObjectURL(poolCropSrc);
          setPoolCropSrc(null);
        }}
        onConfirm={(blob) => void handlePoolCropConfirm(blob)}
      />

      {/* 微信消息推送：WxPusher 绑定（扫码自动绑定为主，手动粘 UID 为备选） */}
      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Bell className="size-4 text-sky-600" />
              微信消息推送
              {pushUid ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-0 text-[10px]">
                  已绑定
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  未绑定
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              绑定后，站内新私信会实时推送到你的微信
            </DialogDescription>
          </DialogHeader>

          {pushUid ? (
            /* 已绑定：展示状态 + 测试/解绑 */
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-sm text-emerald-700">
                已绑定微信推送（{pushUid.slice(0, 12)}…），新私信会推送到「WxPusher」公众号
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  disabled={pushTestBusy || pushBusy}
                  onClick={() => void handlePushTest()}
                >
                  {pushTestBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {pushTestBusy ? '发送中...' : '发送测试'}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={pushBusy || pushTestBusy}
                  onClick={() => void handlePushUnbind()}
                >
                  {pushBusy ? '处理中...' : '解绑'}
                </Button>
              </div>
            </div>
          ) : (
            /* 未绑定：扫码（推荐）+ 手动 UID（备选） */
            <div className="space-y-4">
              {/* 扫码绑定：最便捷，无需复制任何东西 */}
              <div className="flex flex-col items-center gap-2">
                <div className="size-48 rounded-xl border border-border/60 bg-white flex items-center justify-center overflow-hidden">
                  {pushQrLoading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : pushQr ? (
                    <img src={pushQr.qrUrl} alt="绑定二维码" className="size-full object-contain" />
                  ) : (
                    <button
                      onClick={() => void refreshPushQr()}
                      className="text-sm text-sky-600 hover:underline"
                    >
                      点击生成二维码
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground/80 text-center">
                  微信扫一扫，关注公众号即完成绑定
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  二维码 10 分钟内有效，扫码后此窗口会自动完成绑定
                  {pushQr && (
                    <button
                      onClick={() => void refreshPushQr()}
                      className="ml-1 text-sky-600 hover:underline"
                    >
                      刷新二维码
                    </button>
                  )}
                </p>
              </div>

              {/* 手动绑定备选 */}
              <details className="border border-border/60 rounded-xl px-3.5 py-2.5">
                <summary className="text-sm text-muted-foreground cursor-pointer select-none">
                  扫码不方便？手动绑定
                </summary>
                <ol className="space-y-2 text-sm text-foreground/80 mt-3">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 size-5 rounded-full bg-sky-500/15 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      1
                    </span>
                    <span>
                      微信搜索并关注公众号「WxPusher」
                      <button
                        onClick={() => void handleCopyPushAccount()}
                        className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-500/20 transition-colors align-middle"
                      >
                        <Copy className="size-3" />
                        一键复制
                      </button>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 size-5 rounded-full bg-sky-500/15 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      2
                    </span>
                    <span>在公众号菜单「我的」→「我的UID」复制你的 UID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 size-5 rounded-full bg-sky-500/15 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      3
                    </span>
                    <span>粘贴到下方并保存</span>
                  </li>
                </ol>
                <div className="flex gap-2 mt-3">
                  <Input
                    value={pushInput}
                    onChange={(e) => setPushInput(e.target.value)}
                    placeholder="粘贴你的 UID（UID_ 开头）"
                    maxLength={64}
                    className="font-mono text-sm"
                  />
                  <Button
                    disabled={pushBusy}
                    onClick={() => void handlePushSave()}
                    className="shrink-0"
                  >
                    {pushBusy ? '保存中...' : '保存'}
                  </Button>
                </div>
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 登录/注册弹窗 */}
      {/* 删除商品确认弹窗 */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除商品</DialogTitle>
            <DialogDescription>
              确定删除「{deleteTarget?.title}」吗？删除后不可恢复，
              相关收藏会被移除，历史会话和交易记录保留。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteConfirm()}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 昵称编辑弹窗（铅笔入口，全站唯一） */}
      <Dialog open={nicknameOpen} onOpenChange={setNicknameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑昵称</DialogTitle>
            <DialogDescription>
              昵称全站唯一，修改后用新昵称登录
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="请输入新昵称"
            maxLength={20}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNicknameOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSaveNickname()} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 认证申请弹窗：学生证封面 / 校园卡 两种方式，管理员人工审核 */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-primary" />
              申请成为认证园丁
            </DialogTitle>
            <DialogDescription>
              提交后由管理员人工审核，通过后你将获得「已认证」标识
            </DialogDescription>
          </DialogHeader>
          {verification?.status === 'rejected' && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              上一次申请未通过，请确认照片清晰、信息完整后重新提交
            </p>
          )}
          <Tabs
            value={verifyMethod}
            onValueChange={(v) => setVerifyMethod(v as VerificationMethod)}
          >
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="student_card">学生证认证</TabsTrigger>
              <TabsTrigger value="campus_card">校园卡认证</TabsTrigger>
            </TabsList>
            <TabsContent value="student_card" className="space-y-3 mt-0">
              <p className="text-sm text-foreground/80">
                上传学生证封面（请遮挡或裁掉学号与身份证号）
              </p>
              <VerifyUploadBox busy={verifyBusy} onFile={handleVerifyFile} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                （温馨提示：平台不会记录你的学号，所有信息仅用于身份核验，保护你的隐私安全。）
              </p>
            </TabsContent>
            <TabsContent value="campus_card" className="space-y-3 mt-0">
              <p className="text-sm text-foreground/80">
                上传佛大校园卡的照片（请遮挡或裁掉学号与身份证号）
              </p>
              <VerifyUploadBox busy={verifyBusy} onFile={handleVerifyFile} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                （温馨提示：平台不会记录你的学号，所有信息仅用于身份核验，保护你的隐私安全。）
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 求购管理弹窗（状态流转，与商品管理一致） */}
      <Dialog
        open={!!wantedManage}
        onOpenChange={(o) => !o && setWantedManage(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="line-clamp-1">{wantedManage?.title}</DialogTitle>
            <DialogDescription>
              当前状态：{wantedManage ? WANTED_STATUS_LABEL[wantedManage.status] : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {wantedManage?.status === 'open' && (
              <>
                <Button
                  disabled={wantedBusy}
                  onClick={() => void handleWantedStatus(wantedManage, 'reserved')}
                >
                  标记已预订
                </Button>
                <Button
                  variant="secondary"
                  disabled={wantedBusy}
                  onClick={() => void handleWantedStatus(wantedManage, 'closed')}
                >
                  下架求购
                </Button>
              </>
            )}
            {wantedManage?.status === 'reserved' && (
              <>
                <Button
                  disabled={wantedBusy}
                  onClick={() => void handleWantedStatus(wantedManage, 'done')}
                >
                  标记已买到
                </Button>
                <Button
                  variant="secondary"
                  disabled={wantedBusy}
                  onClick={() => void handleWantedStatus(wantedManage, 'open')}
                >
                  取消预订
                </Button>
              </>
            )}
            {(wantedManage?.status === 'done' || wantedManage?.status === 'closed') && (
              <>
                <Button
                  disabled={wantedBusy}
                  onClick={() => void handleWantedStatus(wantedManage, 'open')}
                >
                  重新发布
                </Button>
                <Button
                  variant="destructive"
                  disabled={wantedBusy}
                  onClick={() => {
                    setWantedDelete(wantedManage);
                  }}
                >
                  删除求购
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除求购确认（不可恢复） */}
      <AlertDialog
        open={!!wantedDelete}
        onOpenChange={(o) => !o && setWantedDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该求购？</AlertDialogTitle>
            <AlertDialogDescription>
              「{wantedDelete?.title}」将被永久删除，不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wantedBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={wantedBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleWantedDelete();
              }}
            >
              {wantedBusy ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              青藤集市
            </DialogTitle>
            <DialogDescription className="text-center">
              校园闲置，再生长一次
            </DialogDescription>
          </DialogHeader>

          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>昵称</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入昵称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>密码</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="请输入密码"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setAuthMode('register')}
                    >
                      没有账号？去注册
                    </button>
                  </p>
                  <Button type="submit" className="w-full h-11" disabled={authBusy}>
                    {authBusy ? '登录中...' : '登 录'}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>昵称</FormLabel>
                        <FormControl>
                          <Input placeholder="平台显示的昵称（全站唯一）" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>设置密码</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="至少 6 位" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>确认密码</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="再输入一次密码" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
                    青藤集市基于佛大校友信任建立，请勿恶意注册。
                  </p>
                  <p className="text-xs text-muted-foreground">
                    已有账号？
                    <button
                      type="button"
                      className="text-primary hover:underline ml-1"
                      onClick={() => setAuthMode('login')}
                    >
                      直接登录
                    </button>
                  </p>
                  <Button type="submit" className="w-full h-11" disabled={authBusy}>
                    {authBusy ? '注册中...' : '立即注册'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 认证申请的上传框（点击选择图片，整个虚线框可点） */
function VerifyUploadBox({
  busy,
  onFile,
}: {
  busy: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block cursor-pointer">
      <div className="border-2 border-dashed border-primary/40 rounded-xl py-8 flex flex-col items-center gap-2 text-primary hover:bg-primary/5 transition-colors">
        {busy ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <BadgeCheck className="size-6" />
        )}
        <span className="text-sm font-medium">
          {busy ? '上传中...' : '[ 点击上传图片 ]'}
        </span>
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e)}
        disabled={busy}
      />
    </label>
  );
}

function EmptyLoginTip({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <User className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium mb-1">请先登录</h3>
      <p className="text-sm text-muted-foreground mb-4">
        登录后可查看个人相关信息
      </p>
      <Button onClick={onLogin}>去登录</Button>
    </div>
  );
}

function FeedbackList({
  feedbacks,
  onChanged,
}: {
  feedbacks: IFeedback[];
  onChanged: () => void;
}) {
  const { auth } = useApp();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [appending, setAppending] = useState(false);

  const canSubmit = !feedbacks.some((f) => f.status === 'pending');

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('请输入反馈内容');
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadMiscImage(auth.userId, imageFile, 'feedback');
      }
      const res = await submitFeedback(auth.userId, content.trim(), imageUrl);
      if (res.success) {
        toast.success('反馈已提交，管理员会尽快回复');
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        onChanged();
      } else {
        toast.error(res.message || '提交失败');
      }
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppend = async (feedbackId: string) => {
    if (!replyInput.trim() || appending) return;
    setAppending(true);
    try {
      await appendFeedbackMessage(feedbackId, replyInput.trim());
      setReplyInput('');
      toast.success('已追加消息');
      onChanged();
    } catch {
      toast.error('发送失败，请稍后重试');
    } finally {
      setAppending(false);
    }
  };

  // 图片选择（本地预览，提交时上传）
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      {/* 提交新反馈 */}
      <div className="bg-card border border-border/60 rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <MessageSquareText className="size-4 text-primary" />
          提交意见反馈
        </h3>
        {canSubmit ? (
          <div className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="描述您遇到的问题或建议，我们会认真对待每一条反馈"
              rows={4}
              className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
            {imagePreview && (
              <div className="relative inline-block">
                <Image src={imagePreview} alt="" className="size-20 rounded-lg object-cover border border-border/60" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="!absolute -top-2 -right-2 z-10 size-6 rounded-full bg-destructive text-white flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="text-xs text-primary cursor-pointer hover:underline">
                + 上传图片
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '提交中...' : '提交反馈'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-medium">有一条反馈正在处理中</p>
            <p className="text-xs mt-1">
              请等待管理员回复后，再提交下一条反馈，谢谢理解～
            </p>
          </div>
        )}
      </div>

      {/* 历史反馈 */}
      <div>
        <h3 className="font-semibold text-sm mb-3">我的反馈</h3>
        {feedbacks.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-xl p-8 text-center text-sm text-muted-foreground">
            还没有提交过反馈
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f) => {
              const isExpanded = expandedId === f.id;
              return (
                <div
                  key={f.id}
                  className="bg-card border border-border/60 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : f.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={f.status === 'pending' ? 'secondary' : 'default'} className="text-xs">
                          {f.status === 'pending' ? '待回复' : '已回复'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{f.createdAt}</span>
                      </div>
                      <p className="text-sm font-medium line-clamp-1">{f.content}</p>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">
                      {isExpanded ? '收起' : '详情'}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border/40 p-4 space-y-3 bg-muted/20">
                      {/* 对话消息 */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {f.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                msg.sender === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-card border border-border/60 rounded-bl-sm'
                              }`}
                            >
                              {msg.image && (
                                <Image
                                  src={msg.image}
                                  alt=""
                                  className="w-32 h-32 object-cover rounded-lg mb-2"
                                />
                              )}
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${
                                msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {msg.timestamp}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* 已回复状态下可以追加 */}
                      {f.status === 'replied' && (
                        <div className="flex gap-2 pt-2 border-t border-border/40">
                          <input
                            type="text"
                            value={replyInput}
                            onChange={(e) => {
                              if (expandedId === f.id) setReplyInput(e.target.value);
                            }}
                            onFocus={() => setExpandedId(f.id)}
                            placeholder="继续追问..."
                            className="flex-1 rounded-lg border border-border/60 px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <Button size="sm" onClick={() => handleAppend(f.id)} disabled={appending}>
                            发送
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
