import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Header, { NAV_ITEMS } from '@/components/Header';
import Footer from '@/components/Footer';
import { AppProvider, useApp } from '@/context/AppContext';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

/** 这些页面底部已有固定操作栏 / 输入框，底部导航和悬浮发布按钮会遮挡，故隐藏 */
const HIDE_BOTTOM_PATTERNS = [/^\/messages/, /^\/products\/[^/]+/, /^\/publish/, /^\/admin/];

/**
 * 移动端底部导航显隐（拼多多式）：
 * 下滑或停止滚动时隐去，上滑时出现，回到顶部时始终显示
 */
function useAutoHideNav() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let lastY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const clearIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    };
    const armIdle = () => {
      clearIdle();
      idleTimer = setTimeout(() => {
        if (window.scrollY > 80) setVisible(false);
      }, 1800);
    };
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (y < 80) {
        setVisible(true);
        armIdle();
      } else if (dy > 6) {
        setVisible(false);
        clearIdle();
      } else if (dy < -6) {
        setVisible(true);
        armIdle();
      }
    };
    armIdle();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearIdle();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return visible;
}

/** 移动端底部导航（含消息未读红点） */
function MobileNav() {
  const { unreadMessages } = useApp();
  return (
    <nav className="flex items-stretch">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground',
              )
            }
          >
            <span className="relative">
              <Icon className="size-5" />
              {item.path === '/messages' && unreadMessages > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-destructive text-white text-[9px] font-medium flex items-center justify-center leading-none">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function LayoutInner() {
  const { pathname } = useLocation();
  const showBottom = !HIDE_BOTTOM_PATTERNS.some((re) => re.test(pathname));
  const navVisible = useAutoHideNav();
  const navShown = showBottom && navVisible;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
        <Header />
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <Footer />
      </div>

      {/* 移动端底部主导航（自动隐现） */}
      {showBottom && (
        <div
          className={cn(
            'md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 transition-transform duration-300',
            navShown ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          <MobileNav />
        </div>
      )}

      {/* 移动端全局发布入口（随底部导航显隐自动升降；PC 端入口在顶部导航栏） */}
      {showBottom && (
        <Link
          to="/publish"
          aria-label="发布闲置"
          className={cn(
            'md:hidden fixed right-4 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-all duration-300',
            navShown ? 'bottom-[4.5rem]' : 'bottom-6',
          )}
        >
          <Plus className="size-7" />
        </Link>
      )}
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}

export const Layout = () => {
  return (
    <AppProvider>
      <LayoutInner />
    </AppProvider>
  );
};
