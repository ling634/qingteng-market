import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Header, { NAV_ITEMS } from '@/components/Header';
import Footer from '@/components/Footer';
import { AppProvider, useApp } from '@/context/AppContext';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

/** 这些页面底部已有固定操作栏，底部导航会遮挡，故隐藏（消息页按需求常驻显示） */
const HIDE_BOTTOM_PATTERNS = [/^\/products\/[^/]+/, /^\/publish/, /^\/admin/];

/** 私信页（手机端）不展示 Footer，避免聊天区下方出现大段无关内容 */
const HIDE_FOOTER_MOBILE_PATTERNS = [/^\/messages/];

/** 移动端底部导航（含消息未读红点、管理员待处理红点） */
function MobileNav() {
  const { unreadMessages, unreadAdmin } = useApp();
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
              {item.path === '/profile' && unreadAdmin > 0 && (
                <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-destructive" />
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
  const hideFooterMobile = HIDE_FOOTER_MOBILE_PATTERNS.some((re) => re.test(pathname));

  return (
    <>
      <div
        className={cn(
          'min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col',
          // 手机端底部常驻导航的等高预留空间，防止页尾内容被遮住
          showBottom && 'pb-[52px] md:pb-0',
        )}
      >
        <Header />
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <div className={cn(hideFooterMobile && 'hidden md:block')}>
          <Footer />
        </div>
      </div>

      {/* 移动端底部主导航（常驻；软键盘弹出时通过 .kb-open 隐藏） */}
      {showBottom && (
        <div className="mobile-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60">
          <MobileNav />
        </div>
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
