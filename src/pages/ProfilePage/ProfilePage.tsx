import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  User,
  Package,
  Heart,
  MessageSquare,
  Star,
  Settings,
  CheckCircle2,
  LogOut,
  Shield,
  Award,
  Clock,
  Edit3,
  MessageSquareText,
  LayoutDashboard,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { MOCK_TRADES } from '@/data/trades';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

const loginSchema = z.object({
  studentId: z.string().min(4, '学号至少 4 个字符').max(20, '学号不超过 20 个字符'),
});
const registerSchema = z.object({
  studentId: z.string().min(4, '学号至少 4 个字符').max(20, '学号不超过 20 个字符'),
  name: z.string().min(2, '姓名至少 2 个字符').max(20, '姓名不超过 20 个字符'),
  nickname: z.string().min(2, '昵称至少 2 个字符').max(20, '昵称不超过 20 个字符'),
  college: z.string().min(2, '学院至少 2 个字符').max(30, '学院不超过 30 个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { auth, login, register, logout, products, favorites, getMyFeedbacks, getUserById, updateNickname, updateAvatar } = useApp();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { studentId: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { studentId: '', name: '', nickname: '', college: '' },
  });

  const myProducts = products.filter((p) => p.sellerId === auth.userId);
  const favProducts = products.filter((p) => favorites.includes(p.id));
  const myFeedbacks = getMyFeedbacks();
  const currentUser = auth.isLoggedIn ? getUserById(auth.userId) : undefined;
  const myRating = currentUser?.rating ?? 5.0;
  const [nicknameInput, setNicknameInput] = useState('');

  useEffect(() => {
    setNicknameInput(auth.nickname);
  }, [auth.nickname]);

  const handleSaveProfile = () => {
    if (!nicknameInput.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    if (!updateNickname(nicknameInput)) {
      toast.error('该昵称已被其他用户使用，请换一个');
      return;
    }
    toast.success('资料已保存');
  };

  // 从相册选择头像
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateAvatar(reader.result as string);
      toast.success('头像已更新');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogin = async (values: LoginFormData) => {
    setAuthLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const ok = login(values.studentId);
    setAuthLoading(false);
    if (ok) {
      toast.success('登录成功，欢迎回来～');
      setAuthOpen(false);
      loginForm.reset();
    } else {
      toast.error('该学号未注册，请先注册账号');
      setAuthMode('register');
      registerForm.setValue('studentId', values.studentId);
    }
  };

  const handleRegister = async (values: RegisterFormData) => {
    setAuthLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const error = register(values);
    setAuthLoading(false);
    if (!error) {
      toast.success('注册成功，已自动登录');
      setAuthOpen(false);
      registerForm.reset();
    } else {
      toast.error(error);
      if (error.includes('学号')) {
        setAuthMode('login');
        loginForm.setValue('studentId', values.studentId);
      }
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
  };

  const userTrades = MOCK_TRADES.filter(
    (t) => t.buyerId === auth.userId || t.sellerId === auth.userId,
  );

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

          <div className="relative flex items-start gap-4">
            <div className="relative shrink-0">
              {auth.isLoggedIn ? (
                <Image
                  src={auth.avatar}
                  alt=""
                  className="size-16 md:size-20 rounded-full object-cover border-4 border-white shadow-md"
                />
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
            </div>
            <div className="flex-1 min-w-0">
              {auth.isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {auth.nickname}
                    </h2>
                    {auth.isAdmin ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs">
                        管理员
                      </Badge>
                    ) : auth.verified ? (
                      <Badge className="bg-primary/15 text-primary border-0 text-xs">
                        已认证学生
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        未认证
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    学号 {auth.studentId}
                  </p>
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
                        {userTrades.length}
                      </div>
                      <div className="text-xs text-muted-foreground">交易</div>
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
                      className="mt-3 gap-1.5"
                      onClick={() => navigate('/admin')}
                    >
                      <LayoutDashboard className="size-3.5" />
                      进入管理后台
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
        <Tabs defaultValue="selling" className="w-full">
          <TabsList className="w-full justify-start bg-transparent p-0 gap-1 overflow-x-auto border-b border-border/40 mb-5 h-auto">
            {[
              { key: 'selling', label: '我的在售', icon: Package },
              { key: 'favorites', label: '我的收藏', icon: Heart },
              { key: 'messages', label: '我的私信', icon: MessageSquare },
              { key: 'trades', label: '交易记录', icon: Clock },
              { key: 'reputation', label: '信誉评价', icon: Award },
              { key: 'feedback', label: '意见反馈', icon: MessageSquareText },
              { key: 'settings', label: '个人资料', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2.5 text-xs md:text-sm whitespace-nowrap gap-1.5"
                >
                  <Icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* 我的在售 */}
          <TabsContent value="selling" className="mt-0">
            {auth.isLoggedIn ? (
              myProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {myProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
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

          {/* 我的私信 */}
          <TabsContent value="messages" className="mt-0">
            {auth.isLoggedIn ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MessageSquare className="size-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium mb-1">站内私信</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  点击下方按钮进入消息中心
                </p>
                <Button onClick={() => navigate('/messages')}>查看消息</Button>
              </div>
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 交易记录 */}
          <TabsContent value="trades" className="mt-0">
            {auth.isLoggedIn ? (
              <div className="space-y-3">
                {userTrades.map((t) => {
                  const isBuyer = t.buyerId === auth.userId;
                  const otherNick = isBuyer ? t.sellerNickname : t.buyerNickname;
                  const otherAvatar = isBuyer ? t.sellerAvatar : t.buyerAvatar;
                  return (
                    <div
                      key={t.id}
                      className="bg-card border border-border/60 rounded-xl p-4 flex gap-3"
                    >
                      <Image
                        src={t.productImage}
                        alt=""
                        className="size-20 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {t.productTitle}
                          </h4>
                          <span className="text-primary font-bold shrink-0">
                            {formatPrice(t.price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Image
                            src={otherAvatar}
                            alt=""
                            className="size-5 rounded-full"
                          />
                          <span className="text-xs text-muted-foreground">
                            {isBuyer ? '卖家' : '买家'}：{otherNick}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                          <span className="text-xs text-muted-foreground">
                            {t.completedAt} · 交易完成
                          </span>
                          <Badge variant="default" className="text-xs h-5">
                            {isBuyer ? '我是买家' : '我是卖家'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {userTrades.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Clock className="size-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-medium mb-1">暂无交易记录</h3>
                  </div>
                )}
              </div>
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 信誉评价 */}
          <TabsContent value="reputation" className="mt-0">
            {auth.isLoggedIn ? (
              <div className="space-y-5">
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{myRating.toFixed(1)}</div>
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="size-4 text-amber-500 fill-amber-500"
                          />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        基于 {userTrades.length} 次评价
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-2">信誉标签</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {['正常交易', '快速回复', '好评卖家', '准时自提'].map(
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
                    {userTrades.map((t) => {
                      const isBuyer = t.buyerId === auth.userId;
                      const comment = isBuyer ? t.sellerComment : t.buyerComment;
                      const rating = isBuyer ? t.sellerRating : t.buyerRating;
                      const otherNick = isBuyer ? t.sellerNickname : t.buyerNickname;
                      const otherAvatar = isBuyer ? t.sellerAvatar : t.buyerAvatar;
                      if (!comment) return null;
                      return (
                        <div
                          key={t.id}
                          className="bg-card border border-border/60 rounded-xl p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Image
                              src={otherAvatar}
                              alt=""
                              className="size-7 rounded-full"
                            />
                            <span className="font-medium text-sm">{otherNick}</span>
                            <div className="flex items-center gap-0.5 ml-auto">
                              {Array.from({ length: rating || 0 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="size-3.5 text-amber-500 fill-amber-500"
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-foreground/80">{comment}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t.completedAt} · 关于「{t.productTitle}」
                          </p>
                        </div>
                      );
                    })}
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
              <FeedbackList
                feedbacks={myFeedbacks}
                onSubmit={() => {}}
              />
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>

          {/* 个人资料 */}
          <TabsContent value="settings" className="mt-0">
            {auth.isLoggedIn ? (
              <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="relative cursor-pointer group shrink-0" title="点击更换头像">
                    <Image
                      src={auth.avatar}
                      alt=""
                      className="size-16 rounded-full object-cover"
                    />
                    <span className="absolute inset-0 rounded-full bg-black/40 text-white text-[10px] flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      更换
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                  </label>
                  <div>
                    <p className="font-semibold">{auth.nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      学号 {auth.studentId}
                      {auth.verified && (
                        <span className="text-primary ml-1">✓ 已认证</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">点击头像可从相册更换</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">昵称</label>
                  <Input
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">学号</label>
                  <Input value={auth.studentId} disabled />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    学号为注册身份标识，不可修改
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={handleLogout}>
                    <LogOut className="size-4 mr-1.5" />
                    退出登录
                  </Button>
                  <Button className="flex-1" onClick={handleSaveProfile}>
                    <Edit3 className="size-4 mr-1.5" />
                    保存修改
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyLoginTip onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 登录/注册弹窗 */}
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
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                    <Shield className="size-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary">开放注册</p>
                      <p className="text-foreground/70 text-xs mt-0.5 leading-relaxed">
                        学号、姓名等信息自助填写即可，保留信誉评价作为交易约束。
                      </p>
                    </div>
                  </div>
                  <FormField
                    control={loginForm.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>学号</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请输入已注册的学号"
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
                  <Button type="submit" className="w-full h-11" disabled={authLoading}>
                    {authLoading ? '登录中...' : '登 录'}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                    <User className="size-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary">开放注册</p>
                      <p className="text-foreground/70 text-xs mt-0.5 leading-relaxed">
                        填好信息即可注册，无需学号验证；信誉评价体系保障交易秩序。
                      </p>
                    </div>
                  </div>
                  <FormField
                    control={registerForm.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>学号</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入学号" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>姓名</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入真实姓名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>昵称</FormLabel>
                        <FormControl>
                          <Input placeholder="平台显示的昵称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="college"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>学院</FormLabel>
                        <FormControl>
                          <Input placeholder="如：计算机学院" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <Button type="submit" className="w-full h-11" disabled={authLoading}>
                    {authLoading ? '注册中...' : '立即注册'}
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

function FeedbackList({ feedbacks }: { feedbacks: ReturnType<typeof useApp>['feedbacks']; onSubmit: () => void }) {
  const { submitFeedback, appendFeedbackMessage } = useApp();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  const canSubmit = !feedbacks.some((f) => f.status === 'pending');

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error('请输入反馈内容');
      return;
    }
    const res = submitFeedback(content.trim(), image);
    if (res.success) {
      toast.success('反馈已提交，管理员会尽快回复');
      setContent('');
      setImage(undefined);
    } else {
      toast.error(res.message || '提交失败');
    }
  };

  const handleAppend = (feedbackId: string) => {
    if (!replyInput.trim()) return;
    appendFeedbackMessage(feedbackId, replyInput.trim());
    setReplyInput('');
    toast.success('已追加消息');
  };

  // 图片选择（简单 FileReader）
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
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
            {image && (
              <div className="relative inline-block">
                <Image src={image} alt="" className="size-20 rounded-lg object-cover border border-border/60" />
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
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
              <Button size="sm" onClick={handleSubmit}>提交反馈</Button>
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
                          <Button size="sm" onClick={() => handleAppend(f.id)}>
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
