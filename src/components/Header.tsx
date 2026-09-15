import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  ShoppingBag,
  Search,
  Plus,
  MessageSquare,
  User,
  Menu,
  X,
  Leaf,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
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
  const { auth, unreadMessages } = useApp();
  const [open, setOpen] = useState(false);

  const unreadBadge = (path: string) =>
    path === '/messages' && unreadMessages > 0 ? (
      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-medium flex items-center justify-center leading-none">
        {unreadMessages > 99 ? '99+' : unreadMessages}
      </span>
    ) : null;

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
          <Button
            onClick={() => navigate('/publish')}
            size="sm"
            className="hidden sm:inline-flex gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            发布
          </Button>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] pr-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <Leaf className="size-5 text-primary" />
                  <span className="font-bold">青藤集市</span>
                </div>
                <nav className="flex flex-col gap-1 py-4">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SheetClose asChild key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.end}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium',
                              isActive
                                ? 'text-primary bg-primary/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                            )
                          }
                        >
                          <span className="relative">
                            <Icon className="size-5" />
                            {unreadBadge(item.path)}
                          </span>
                          {item.label}
                        </NavLink>
                      </SheetClose>
                    );
                  })}
                </nav>
                 <div className="mt-auto pt-4 border-t border-border space-y-2">
                   {auth.isAdmin && (
                     <SheetClose asChild>
                       <Button
                         variant="secondary"
                         size="sm"
                         onClick={() => navigate('/admin')}
                         className="w-full"
                       >
                         <Shield className="size-4 mr-1" />
                         管理后台
                       </Button>
                     </SheetClose>
                   )}
                   {auth.isLoggedIn ? (
                     <div className="flex items-center gap-3 px-2 py-2">
                       <Image
                         src={auth.avatar}
                         alt=""
                         className="size-10 rounded-full object-cover"
                       />
                       <div className="flex-1 min-w-0">
                         <div className="font-medium text-sm truncate">
                           {auth.nickname}
                         </div>
                         <div className="text-xs text-muted-foreground">
                           学号 {auth.studentId}
                           {auth.isAdmin && <span className="text-primary"> · 管理员</span>}
                         </div>
                       </div>
                     </div>
                   ) : (
                     <SheetClose asChild>
                       <Button
                         onClick={() => navigate('/profile')}
                         className="w-full"
                       >
                         登录 / 注册
                       </Button>
                     </SheetClose>
                  )}
                </div>
              </div>
              <div className="sr-only">
                <X />
              </div>
            </SheetContent>
          </Sheet>

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
