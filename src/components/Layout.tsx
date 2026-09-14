import { Outlet, Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AppProvider } from '@/context/AppContext';
import { Toaster } from '@/components/ui/sonner';

/** 这些页面底部已有固定操作栏 / 输入框，悬浮发布按钮会遮挡，故隐藏 */
const HIDE_FAB_PATTERNS = [/^\/messages/, /^\/products\/[^/]+/, /^\/publish/, /^\/admin/];

export const Layout = () => {
  const { pathname } = useLocation();
  const showFab = !HIDE_FAB_PATTERNS.some((re) => re.test(pathname));

  return (
    <AppProvider>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
        <Header />
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
      {/* 移动端全局发布入口（PC 端入口在顶部导航栏） */}
      {showFab && (
        <Link
          to="/publish"
          aria-label="发布闲置"
          className="md:hidden fixed bottom-6 right-4 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="size-7" />
        </Link>
      )}
      <Toaster position="top-center" richColors closeButton />
    </AppProvider>
  );
};
