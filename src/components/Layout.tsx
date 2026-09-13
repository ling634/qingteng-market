import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AppProvider } from '@/context/AppContext';
import { Toaster } from '@/components/ui/sonner';

export const Layout = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
        <Header />
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster position="top-center" richColors closeButton />
    </AppProvider>
  );
};
