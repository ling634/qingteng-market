import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Package,
  Megaphone,
  Users,
  Shield,
  Eye,
  EyeOff,
  ArrowUpDown,
  UserPlus,
  Search,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  MessageSquareText,
  Send,
  Ban,
  Undo2,
  Loader2,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Image } from '@/components/ui/image';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate, Link } from 'react-router-dom';
import type { IAd } from '@/data/ads';
import type { IProduct } from '@/data/products';
import type { IUser } from '@/data/users';
import {
  fetchAllProductsAdmin,
  setProductStatus,
  setProductTop,
  insertAd,
  updateAd,
  setAdStatus,
  fetchAllUsersAdmin,
  setUserBanned,
  fetchAllFeedbacksAdmin,
  replyFeedback,
  fetchReportsAdmin,
  setReportStatus,
  fetchProductById,
  getOrCreateConversation,
  sendMessage,
  markAllFeedbacksRead,
  markAllReportsRead,
  type IFeedback,
  type IReport,
} from '@/lib/api';
import { uploadMiscImage } from '@/lib/image';

export default function AdminPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { auth, authLoading, ads, refreshAds, adminLogin, logout } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSidebar, setShowSidebar] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [topFilter, setTopFilter] = useState('all');
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  const [products, setProducts] = useState<IProduct[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [feedbacks, setFeedbacks] = useState<IFeedback[]>([]);
  const [reports, setReports] = useState<IReport[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    const [p, u, f, r] = await Promise.all([
      fetchAllProductsAdmin().catch(() => [] as IProduct[]),
      fetchAllUsersAdmin().catch(() => [] as IUser[]),
      fetchAllFeedbacksAdmin().catch(() => [] as IFeedback[]),
      fetchReportsAdmin().catch(() => [] as IReport[]),
    ]);
    setProducts(p);
    setUsers(u);
    setFeedbacks(f);
    setReports(r);
    setDataLoading(false);
  }, []);

  // 管理员登录后拉取全量数据
  useEffect(() => {
    if (auth.isAdmin) {
      void loadAll();
      void refreshAds();
    }
  }, [auth.isAdmin, loadAll, refreshAds]);

  const reloadProducts = () =>
    fetchAllProductsAdmin().then(setProducts).catch(() => {});
  const reloadUsers = () =>
    fetchAllUsersAdmin().then(setUsers).catch(() => {});
  const reloadFeedbacks = () =>
    fetchAllFeedbacksAdmin().then(setFeedbacks).catch(() => {});
  const reloadReports = () =>
    fetchReportsAdmin().then(setReports).catch(() => {});

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (topFilter === 'top' && !p.is_top) return false;
      if (topFilter === 'normal' && p.is_top) return false;
      if (keyword.trim() && !p.title.toLowerCase().includes(keyword.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [products, keyword, statusFilter, topFilter]);

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.status === 'on_sale').length,
    topProducts: products.filter((p) => p.is_top).length,
    totalAds: ads.length,
    activeAds: ads.filter((a) => a.status === 'active').length,
    totalFeedbacks: feedbacks.length,
    pendingFeedbacks: feedbacks.filter((f) => f.status === 'pending').length,
    unreadFeedbacks: feedbacks.filter((f) => !f.readAt).length,
    unreadReports: reports.filter((r) => !r.readAt).length,
  };

  // 管理员：一键已读全部反馈工单
  const handleMarkAllFeedbacksRead = async () => {
    try {
      await markAllFeedbacksRead();
      toast.success('已全部标记为已读');
      void reloadFeedbacks();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (feedbackFilter === 'pending') return f.status === 'pending';
    if (feedbackFilter === 'replied') return f.status === 'replied';
    return true;
  });

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('请输入邮箱和密码');
      return;
    }
    setLoginLoading(true);
    const err = await adminLogin(email.trim(), password.trim());
    setLoginLoading(false);
    if (!err) {
      toast.success('管理员登录成功');
    } else {
      toast.error(err);
    }
  };

  const handleReply = async (id: string) => {
    const reply = replyMap[id]?.trim();
    if (!reply) {
      toast.error('请输入回复内容');
      return;
    }
    try {
      await replyFeedback(id, reply);
      setReplyMap((prev) => ({ ...prev, [id]: '' }));
      toast.success('回复已发送');
      void reloadFeedbacks();
    } catch {
      toast.error('回复失败，请稍后重试');
    }
  };

  const handleTop = async (id: string, title: string, weight: number, days: number) => {
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + days);
    try {
      await setProductTop(id, true, weight, expireAt.toISOString());
      toast.success(`已设置「${title}」为向阳位置顶`);
      void reloadProducts();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleCancelTop = async (id: string) => {
    try {
      await setProductTop(id, false);
      toast.success('已取消置顶');
      void reloadProducts();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleProductStatus = async (id: string, status: 'on_sale' | 'offline') => {
    try {
      await setProductStatus(id, status);
      toast.success(status === 'offline' ? '已下架商品' : '已上架商品');
      void reloadProducts();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleBan = async (u: IUser, banned: boolean) => {
    try {
      await setUserBanned(u.id, banned);
      toast.success(banned ? `已封禁「${u.nickname}」，其商品已自动下架` : `已解封「${u.nickname}」`);
      void reloadUsers();
      void reloadProducts();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const navItems = [
    { key: 'overview', label: '数据概览', icon: LayoutDashboard },
    { key: 'products', label: '商品管理', icon: Package },
    { key: 'ads', label: '广告位管理', icon: Megaphone },
    { key: 'users', label: '用户管理', icon: Users },
    { key: 'feedback', label: '意见反馈', icon: MessageSquareText, badge: stats.pendingFeedbacks },
    { key: 'reports', label: '举报记录', icon: Shield, badge: stats.unreadReports },
  ];

  const renderSidebar = () => (
    <aside
      className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/60 flex flex-col
        ${isMobile ? (showSidebar ? 'translate-x-0' : '-translate-x-full') : ''}
        transition-transform md:transition-none
      `}
    >
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            管
          </div>
          <div>
            <div className="font-bold text-sm">青藤集市</div>
            <div className="text-[10px] text-muted-foreground">管理后台</div>
          </div>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
            <X className="size-4" />
          </Button>
        )}
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
             <button
               key={item.key}
               onClick={() => {
                 setActiveTab(item.key);
                 if (isMobile) setShowSidebar(false);
               }}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                 activeTab === item.key
                   ? 'bg-primary/10 text-primary font-medium'
                   : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
               }`}
             >
               <Icon className="size-4" />
               <span className="flex-1 text-left">{item.label}</span>
               {item.badge ? (
                 <span className="text-[10px] bg-destructive text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5">
                   {item.badge}
                 </span>
               ) : null}
             </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border/60">
         <div className="flex items-center gap-2 px-2">
           <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
             管
           </div>
           <div className="flex-1 min-w-0">
             <div className="text-xs font-medium truncate">{auth.nickname || '管理员'}</div>
             <div className="text-[10px] text-muted-foreground truncate">
               {auth.email || 'admin'}
             </div>
           </div>
         </div>
         <Button
           variant="ghost"
           size="sm"
           className="w-full mt-2 text-xs text-muted-foreground justify-start"
           onClick={() => {
             void logout();
             navigate('/');
           }}
         >
           <LogOut className="size-3.5 mr-1.5" />
           退出后台
         </Button>
       </div>
    </aside>
  );

  // 会话恢复中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 登录守卫：未登录管理员账号则显示登录页
  if (!auth.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative w-full max-w-md">
          <div className="bg-card border border-border/60 rounded-2xl shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="size-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 shadow-md">
                <Shield className="size-7" />
              </div>
              <h1 className="text-xl font-bold text-foreground">青藤集市 · 管理后台</h1>
              <p className="text-sm text-muted-foreground mt-1">请使用管理员账号登录</p>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">管理员邮箱</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入管理员邮箱"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">密码</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-medium mb-1">🔒 仅站点管理员可访问</p>
                <p>普通用户请返回首页，使用邮箱登录即可发布、浏览商品。</p>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loginLoading}>
                {loginLoading ? '登录中...' : '登 录 后 台'}
              </Button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← 返回首页
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {renderSidebar()}
      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={() => setShowSidebar(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-14 border-b border-border/60 bg-card/80 backdrop-blur flex items-center px-4 gap-3 shrink-0">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
              <Menu className="size-5" />
            </Button>
          )}
          <h1 className="font-bold text-base">
            {navItems.find((n) => n.key === activeTab)?.label}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {dataLoading && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
            <Badge variant="secondary" className="text-xs">
              v1.0.0
            </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* 数据概览 */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">商品总数</CardTitle>
                    <Package className="size-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProducts}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      在售 {stats.activeProducts} 件
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-transparent">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">向阳位</CardTitle>
                    <ArrowUpDown className="size-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.topProducts}/3</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      已使用置顶位
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-transparent">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">广告位</CardTitle>
                    <Megaphone className="size-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeAds}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      投放中 / 共 {stats.totalAds} 个
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-transparent">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">注册用户</CardTitle>
                    <UserPlus className="size-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">已注册账号</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">最新发布商品</CardTitle>
                    <CardDescription>最近 5 条商品发布记录</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>商品</TableHead>
                            <TableHead>价格</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.slice(0, 5).map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Image
                                    src={p.thumbs[0] || p.images[0]}
                                    alt=""
                                    className="size-8 rounded object-cover"
                                  />
                                  <span className="truncate max-w-[140px]">
                                    {p.title}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{formatPrice(p.price)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === 'on_sale' ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {p.status === 'on_sale' ? '上架中' : '已下架'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">广告位投放情况</CardTitle>
            <CardDescription>林间好店广告位状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="flex items-center gap-3 p-2 rounded-lg border border-border/60"
              >
                <Image
                  src={ad.image_url}
                  alt=""
                  className="size-16 rounded-md object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {ad.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ad.start_at} ~ {ad.end_at}
                  </div>
                </div>
                <Badge
                  variant={ad.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {ad.status === 'active' ? '投放中' : ad.status === 'expired' ? '已过期' : '已停用'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
              </div>
            </div>
          )}

          {/* 商品管理 */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="search"
                        placeholder="搜索商品..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="商品状态" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部状态</SelectItem>
                          <SelectItem value="on_sale">上架中</SelectItem>
                          <SelectItem value="offline">已下架</SelectItem>
                        </SelectContent>
                      </Select>
                    <Select value={topFilter} onValueChange={setTopFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="置顶状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="top">已置顶</SelectItem>
                        <SelectItem value="normal">未置顶</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">商品</TableHead>
                          <TableHead className="whitespace-nowrap">分类</TableHead>
                          <TableHead className="whitespace-nowrap">价格</TableHead>
                          <TableHead className="whitespace-nowrap">置顶</TableHead>
                          <TableHead className="whitespace-nowrap">状态</TableHead>
                          <TableHead className="whitespace-nowrap text-right">
                            操作
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Image
                                  src={p.thumbs[0] || p.images[0]}
                                  alt=""
                                  className="size-10 rounded object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-sm line-clamp-1 max-w-[200px]">
                                    {p.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {p.sellerNickname}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {p.category}
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {formatPrice(p.price)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {p.is_top ? (
                                <Badge
                                  variant="default"
                                  className="bg-amber-500 hover:bg-amber-600 text-xs"
                                >
                                  向阳位
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge
                                variant={
                                  p.status === 'on_sale' ? 'default' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {p.status === 'on_sale' ? '上架' : '下架'}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              <div className="flex justify-end gap-1.5">
                                {!p.is_top ? (
                                  <TopDialog
                                    productTitle={p.title}
                                    onConfirm={(weight, days) =>
                                      void handleTop(p.id, p.title, weight, days)
                                    }
                                  />
                                ) : (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => void handleCancelTop(p.id)}
                                  >
                                    取消置顶
                                  </Button>
                                )}
                                {p.status === 'on_sale' ? (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => void handleProductStatus(p.id, 'offline')}
                                  >
                                    <EyeOff className="size-3.5 mr-1" />
                                    下架
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => void handleProductStatus(p.id, 'on_sale')}
                                  >
                                    <Eye className="size-3.5 mr-1" />
                                    上架
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 广告位管理 */}
          {activeTab === 'ads' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">林间好店广告位</CardTitle>
                    <CardDescription>
                      校园商户广告投放管理，最多展示 2 个轮播
                    </CardDescription>
                  </div>
                  <AdDialog
                    onSave={async (data) => {
                      try {
                        await insertAd({ ...data, status: 'active' });
                        await refreshAds();
                        toast.success('广告已创建并开始投放');
                      } catch {
                        toast.error('创建失败，请稍后重试');
                      }
                    }}
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  {ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="bg-card border border-border/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4"
                    >
                      <Image
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-full md:w-48 h-24 md:h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{ad.title}</h4>
                          <Badge
                            variant={ad.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {ad.status === 'active' ? '投放中' : ad.status === 'expired' ? '已过期' : '已停用'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          广告位：{ad.slot_key} · {ad.start_at} ~ {ad.end_at}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          跳转链接:{ad.link}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <AdDialog
                          initial={ad}
                          onSave={async (data) => {
                            try {
                              await updateAd(ad.id, data);
                              await refreshAds();
                              toast.success('广告已更新');
                            } catch {
                              toast.error('更新失败，请稍后重试');
                            }
                          }}
                        />
                        {ad.status === 'active' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              try {
                                await setAdStatus(ad.id, 'inactive');
                                await refreshAds();
                                toast.success('广告已停用');
                              } catch {
                                toast.error('操作失败，请稍后重试');
                              }
                            }}
                          >
                            停用
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await setAdStatus(ad.id, 'active');
                                await refreshAds();
                                toast.success('广告已重新投放');
                              } catch {
                                toast.error('操作失败，请稍后重试');
                              }
                            }}
                          >
                            启用
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 用户管理 */}
          {activeTab === 'users' && (
            <Card>
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">用户</TableHead>
                        <TableHead className="whitespace-nowrap">学号</TableHead>
                        <TableHead className="whitespace-nowrap">认证状态</TableHead>
                        <TableHead className="whitespace-nowrap">信誉分</TableHead>
                        <TableHead className="whitespace-nowrap">交易次数</TableHead>
                        <TableHead className="whitespace-nowrap">违规记录</TableHead>
                        <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Image
                                src={u.avatar}
                                alt=""
                                className="size-8 rounded-full object-cover"
                              />
                              <span className="font-medium text-sm">{u.nickname}</span>
                              {u.isAdmin && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-[10px]">
                                  管理员
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {u.studentId || '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant={u.verified ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {u.verified ? '已认证' : '未认证'}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            ★ {u.rating.toFixed(1)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {u.tradeCount} 次交易
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {u.reportCount > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                被举报 {u.reportCount} 次
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">无违规</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {!u.isAdmin &&
                              (u.isBanned ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void handleBan(u, false)}
                                >
                                  <Undo2 className="size-3.5 mr-1" />
                                  解封
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void handleBan(u, true)}
                                >
                                  <Ban className="size-3.5 mr-1" />
                                  封禁
                                </Button>
                              ))}
                            {u.isBanned && (
                              <Badge variant="destructive" className="text-xs ml-1.5">
                                已封禁
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 意见反馈 */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquareText className="size-4 text-primary" />
                        意见反馈工单
                      </CardTitle>
                      <CardDescription>
                        共 {feedbacks.length} 条，待回复 {stats.pendingFeedbacks} 条
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={feedbackFilter === 'all' ? 'default' : 'secondary'}
                        onClick={() => setFeedbackFilter('all')}
                      >
                        全部
                      </Button>
                      <Button
                        size="sm"
                        variant={feedbackFilter === 'pending' ? 'default' : 'secondary'}
                        onClick={() => setFeedbackFilter('pending')}
                      >
                        待回复
                      </Button>
                      <Button
                        size="sm"
                        variant={feedbackFilter === 'replied' ? 'default' : 'secondary'}
                        onClick={() => setFeedbackFilter('replied')}
                      >
                        已回复
                      </Button>
                      {stats.unreadFeedbacks > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleMarkAllFeedbacksRead()}
                        >
                          <CheckCheck className="size-3.5 mr-1" />
                          一键已读（{stats.unreadFeedbacks}）
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredFeedbacks.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">
                      暂无反馈工单
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {filteredFeedbacks.map((f) => (
                        <div key={f.id} className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Image
                                src={f.userAvatar}
                                alt=""
                                className="size-8 rounded-full object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-sm flex items-center gap-2">
                                  <span className="truncate">{f.userNickname}</span>
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {f.userStudentId}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {f.createdAt}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!f.readAt && (
                                <Badge variant="destructive" className="text-xs">
                                  新
                                </Badge>
                              )}
                              <Badge
                                variant={f.status === 'pending' ? 'destructive' : 'default'}
                                className="text-xs"
                              >
                                {f.status === 'pending' ? '待回复' : '已回复'}
                              </Badge>
                            </div>
                          </div>

                          {/* 对话消息 */}
                          <div className="bg-muted/30 rounded-xl p-3 space-y-2 mb-3 max-h-64 overflow-y-auto">
                            {f.messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                    msg.sender === 'user'
                                      ? 'bg-card border border-border/60 rounded-br-sm'
                                      : 'bg-primary text-primary-foreground rounded-bl-sm'
                                  }`}
                                >
                                  {msg.image && (
                                    <Image
                                      src={msg.image}
                                      alt=""
                                      className="w-28 h-28 object-cover rounded-lg mb-2"
                                    />
                                  )}
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                  <p className={`text-[10px] mt-1 ${
                                    msg.sender === 'user' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                                  }`}>
                                    {msg.timestamp}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 回复输入框（仅待回复状态显示） */}
                          {f.status === 'pending' && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyMap[f.id] || ''}
                                onChange={(e) =>
                                  setReplyMap((prev) => ({ ...prev, [f.id]: e.target.value }))
                                }
                                placeholder="输入回复内容..."
                                className="flex-1 rounded-lg border border-border/60 px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && void handleReply(f.id)
                                }
                              />
                              <Button size="sm" onClick={() => void handleReply(f.id)}>
                                <Send className="size-3.5 mr-1" />
                                回复
                              </Button>
                            </div>
                          )}
                          {f.status === 'replied' && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-primary" />
                              已于 {f.replyAt} 回复，等待用户反馈
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 举报记录 */}
          {activeTab === 'reports' && (
            <ReportsPanel
              reports={reports}
              onChanged={() => {
                void reloadReports();
                void reloadProducts();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsPanel({
  reports,
  onChanged,
}: {
  reports: IReport[];
  onChanged: () => void;
}) {
  const { auth } = useApp();
  const [confirmReport, setConfirmReport] = useState<IReport | null>(null);
  const [acting, setActing] = useState(false);
  const unreadCount = reports.filter((r) => !r.readAt).length;

  const toggleStatus = async (r: IReport) => {
    const next = r.status === 'open' ? 'resolved' : 'open';
    try {
      await setReportStatus(r.id, next);
      toast.success(next === 'resolved' ? '举报已标记为已处理' : '举报已重新打开');
      onChanged();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReportsRead();
      toast.success('已全部标记为已读');
      onChanged();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  // 下架被举报商品 + 站内私信通知卖家 + 举报标记已处理
  const handleOfflineAndNotify = async () => {
    const r = confirmReport;
    if (!r || !auth.userId) return;
    setActing(true);
    try {
      const res = await fetchProductById(r.targetId);
      if (!res) {
        toast.error('商品不存在或已被删除');
        return;
      }
      await setProductStatus(r.targetId, 'offline');
      const convId = await getOrCreateConversation(
        r.targetId,
        auth.userId,
        res.product.sellerId,
      );
      await sendMessage(
        convId,
        auth.userId,
        `【平台通知】你发布的商品《${res.product.title}》因被举报（${r.reason}），已被管理员下架。如有异议，请通过「我的 → 意见反馈」联系我们。`,
      );
      await setReportStatus(r.id, 'resolved');
      toast.success('已下架商品并私信通知卖家');
      setConfirmReport(null);
      onChanged();
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setActing(false);
    }
  };

  return (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="size-4 text-primary" />
                      举报记录
                    </CardTitle>
                    <CardDescription>
                      共 {reports.length} 条，未读 {unreadCount} 条
                    </CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button size="sm" variant="outline" onClick={() => void handleMarkAllRead()}>
                      <CheckCheck className="size-3.5 mr-1" />
                      一键已读（{unreadCount}）
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">举报对象</TableHead>
                        <TableHead className="whitespace-nowrap">举报原因</TableHead>
                        <TableHead className="whitespace-nowrap">举报人</TableHead>
                        <TableHead className="whitespace-nowrap">时间</TableHead>
                        <TableHead className="whitespace-nowrap">状态</TableHead>
                        <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16 text-sm text-muted-foreground">
                            暂无举报记录
                          </TableCell>
                        </TableRow>
                      )}
                      {reports.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {r.targetType === 'product' ? (
                                <Link
                                  to={`/products/${r.targetId}`}
                                  target="_blank"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  商品
                                  <ExternalLink className="size-3" />
                                </Link>
                              ) : (
                                '用户'
                              )}
                              <span className="text-xs text-muted-foreground font-normal">
                                #{r.targetId.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[240px]">
                            <div>{r.reason}</div>
                            {r.detail && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {r.detail}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{r.reporterNickname}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.createdAt}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {!r.readAt && (
                                <Badge variant="destructive" className="text-xs">
                                  新
                                </Badge>
                              )}
                              <Badge
                                variant={r.status === 'open' ? 'destructive' : 'default'}
                                className="text-xs"
                              >
                                {r.status === 'open' ? '待处理' : '已处理'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {r.targetType === 'product' && r.status === 'open' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setConfirmReport(r)}
                                >
                                  下架并通知
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void toggleStatus(r)}
                              >
                                {r.status === 'open' ? '标记已处理' : '重新打开'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>

              {/* 下架确认弹窗 */}
              <Dialog open={!!confirmReport} onOpenChange={(o) => !o && setConfirmReport(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>下架商品并通知卖家</DialogTitle>
                    <DialogDescription>
                      将把被举报商品立即下架，并通过站内私信告知卖家下架原因
                      {confirmReport ? `（${confirmReport.reason}）` : ''}。
                      商品可随时在「商品管理」中重新上架。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="secondary" onClick={() => setConfirmReport(null)}>
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={acting}
                      onClick={() => void handleOfflineAndNotify()}
                    >
                      {acting ? '处理中...' : '确认下架并通知'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>
  );
}

function AdDialog({
  initial,
  onSave,
}: {
  initial?: IAd;
  onSave: (data: Omit<IAd, 'id' | 'status'>) => Promise<void>;
}) {
  const { auth } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [slotKey, setSlotKey] = useState('forest_goods_main');
  const [link, setLink] = useState('#');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [saving, setSaving] = useState(false);

  const resetAndOpen = (next: boolean) => {
    if (next) {
      setTitle(initial?.title ?? '');
      setImageUrl(initial?.image_url ?? '');
      setImageFile(null);
      setImagePreview('');
      setSlotKey(initial?.slot_key ?? 'forest_goods_main');
      setLink(initial?.link ?? '#');
      setStartAt(initial?.start_at ?? new Date().toISOString().slice(0, 10));
      setEndAt(initial?.end_at ?? '');
    }
    setOpen(next);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!title.trim() || (!imageUrl && !imageFile) || !startAt || !endAt) {
      toast.error('请填写广告名称、图片和投放时间');
      return;
    }
    if (endAt < startAt) {
      toast.error('结束时间不能早于开始时间');
      return;
    }
    setSaving(true);
    try {
      // 新选了图片 → 压缩上传到 Storage
      let finalUrl = imageUrl;
      if (imageFile) {
        finalUrl = await uploadMiscImage(auth.userId, imageFile, 'ad');
      }
      await onSave({
        title: title.trim(),
        image_url: finalUrl,
        slot_key: slotKey,
        link: link.trim() || '#',
        start_at: startAt,
        end_at: endAt,
      });
      setOpen(false);
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const shownImage = imagePreview || imageUrl;

  return (
    <Dialog open={open} onOpenChange={resetAndOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="secondary" size="sm">
            编辑
          </Button>
        ) : (
          <Button size="sm">+ 新建广告</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑广告' : '新建广告'}</DialogTitle>
          <DialogDescription>林间好店广告位，保存后立即生效</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">广告名称</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：青藤打印店"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">广告图片</label>
            <div className="flex items-center gap-3">
              {shownImage ? (
                <Image
                  src={shownImage}
                  alt=""
                  className="w-32 h-16 rounded-lg object-cover border border-border/60"
                />
              ) : (
                <div className="w-32 h-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  未选择
                </div>
              )}
              <label className="text-xs text-primary cursor-pointer hover:underline">
                上传图片
                <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">广告位</label>
            <Select value={slotKey} onValueChange={setSlotKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forest_goods_main">林间好店 · 主位</SelectItem>
                <SelectItem value="forest_goods_side">林间好店 · 侧位</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">开始时间</label>
              <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">结束时间</label>
              <Input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">跳转链接（可选）</label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="#" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中...' : initial ? '保存修改' : '创建并投放'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopDialog({
  productTitle,
  onConfirm,
}: {
  productTitle: string;
  onConfirm: (weight: number, days: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState('1');
  const [days, setDays] = useState('7');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ArrowUpDown className="size-3.5 mr-1" />
          置顶
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>设置向阳位置顶</DialogTitle>
          <DialogDescription>
            将「{productTitle}」设置为向阳位置顶商品
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium">☀️ 向阳位规则</p>
            <p className="text-xs mt-1">
              付费置顶，首页最多展示 3 个。权重越高排序越靠前。
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">置顶权重</label>
            <Select value={weight} onValueChange={setWeight}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - 普通</SelectItem>
                <SelectItem value="2">2 - 优先</SelectItem>
                <SelectItem value="3">3 - 最高</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">置顶时长</label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 天</SelectItem>
                <SelectItem value="7">7 天</SelectItem>
                <SelectItem value="14">14 天</SelectItem>
                <SelectItem value="30">30 天</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              onConfirm(parseInt(weight), parseInt(days));
              setOpen(false);
            }}
          >
            确认置顶
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
