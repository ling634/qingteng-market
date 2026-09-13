import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import HomePage from "@/pages/HomePage/HomePage";
import ProductListPage from "@/pages/ProductListPage/ProductListPage";
import ProductDetailPage from "@/pages/ProductDetailPage/ProductDetailPage";
import PublishPage from "@/pages/PublishPage/PublishPage";
import WantedPage from "@/pages/WantedPage/WantedPage";
import MessagesPage from "@/pages/MessagesPage/MessagesPage";
import ProfilePage from "@/pages/ProfilePage/ProfilePage";
import HelpPage from "@/pages/HelpPage/HelpPage";
import AdminPage from "@/pages/AdminPage/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="publish" element={<PublishPage />} />
        <Route path="wanted" element={<WantedPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
