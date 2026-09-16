import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Search,
  Plus,
  MessageSquare,
  User,
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Image } from '@/components/ui/image';

export const NAV_ITEMS = [
  { path: '/', label: '首页', icon: Home, end: true },
  { path: '/products', label: '集市', icon: ShoppingBag },
  { path: '/wanted', label: '求购', icon: Search },
  { path: '/messages', label: '消息', icon: MessageSquare },
  { path: '/profile', label: '我的', icon: User },
];

export default function Header() {
  const navigate = useNavigate();
  const { auth, unreadMessages, unreadAdmin } = useApp();

  const unreadBadge = (path: string) => {
    if (path === '/messages' && unreadMessages > 0) {
      return (
        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-medium flex items-center justify-center leading-none">
          {unreadMessages > 99 ? '99+' : unreadMessages}
        </span>
      );
    }
    // 管理员：有待处理反馈/举报时「我的」显示小红点
    if (path === '/profile' && unreadAdmin > 0) {
      return (
        <span className="absolute -top-1 -right-1 size-2 rounded-full bg-destructive" />
      );
    }
    return null;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <div className="size-9 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center text-primary-foreground shadow-sm">
            <Leaf className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-foreground text-base">青藤集市</div>
            <div className="text-[10px] text-muted-foreground tracking-wider">
              QINGTENG MARKET
            </div>
          </div>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )
                }
              >
                <span className="relative">
                  <Icon className="size-4" />
                  {unreadBadge(item.path)}
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* 发布入口：全端常驻（手机端在右上角，PC 端在导航栏右侧） */}
          <Button
            onClick={() => navigate('/publish')}
            size="sm"
            className="inline-flex gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            发布
          </Button>

          {/* User avatar (desktop) */}
          <NavLink
            to="/profile"
            className="hidden sm:flex size-9 rounded-full overflow-hidden border border-border shrink-0 hover:ring-2 hover:ring-primary/30 transition-all"
          >
            {auth.isLoggedIn ? (
              <Image src={auth.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                <User className="size-4" />
              </div>
            )}
          </NavLink>
        </div>
      </div>
    </header>
  );
}
