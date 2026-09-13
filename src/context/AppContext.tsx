import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MOCK_PRODUCTS, type IProduct } from '@/data/products';
import { MOCK_ADS, type IAd } from '@/data/ads';
import { MOCK_WANTED, type IWanted } from '@/data/wanted';
import { readJSON, writeJSON } from '@/lib/storage';
import { MOCK_USERS, type IUser } from '@/data/users';
import { toast } from 'sonner';

interface AuthState {
  isLoggedIn: boolean;
  userId: string;
  studentId: string;
  nickname: string;
  avatar: string;
  verified: boolean;
  isAdmin: boolean;
}

export interface IFeedback {
  id: string;
  userId: string;
  userNickname: string;
  userStudentId: string;
  userAvatar: string;
  content: string;
  image?: string;
  status: 'pending' | 'replied';
  replyContent?: string;
  replyAt?: string;
  createdAt: string;
  messages: IFeedbackMessage[];
}

export interface IFeedbackMessage {
  id: string;
  sender: 'user' | 'admin';
  content: string;
  image?: string;
  timestamp: string;
}

const DEFAULT_AUTH: AuthState = {
  isLoggedIn: false,
  userId: '',
  studentId: '',
  nickname: '',
  avatar: '',
  verified: false,
  isAdmin: false,
};

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'QT6360zsn**';

interface AppContextValue {
  products: IProduct[];
  ads: IAd[];
  wanted: IWanted[];
  users: IUser[];
  favorites: string[];
  auth: AuthState;
  feedbacks: IFeedback[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addProduct: (p: Omit<IProduct, 'id' | 'createdAt' | 'status' | 'sellerId' | 'sellerNickname' | 'sellerAvatar' | 'is_top' | 'top_expire_at' | 'top_weight'>) => void;
  addWanted: (w: Omit<IWanted, 'id' | 'buyerId' | 'status' | 'createdAt'>) => void;
  setTop: (id: string, top: boolean, weight?: number, expireAt?: string | null) => void;
  setProductStatus: (id: string, status: IProduct['status']) => void;
  addAd: (ad: Omit<IAd, 'id'>) => void;
  updateAd: (id: string, patch: Partial<Omit<IAd, 'id'>>) => void;
  setAdStatus: (id: string, status: IAd['status']) => void;
  /** 修改当前用户昵称（昵称不可与其他用户重复），返回是否成功 */
  updateNickname: (nickname: string) => boolean;
  /** 修改当前用户头像 */
  updateAvatar: (avatar: string) => void;
  /** 普通用户学号登录（开放注册：不存在自动注册） */
  login: (studentId: string) => boolean;
  /** 注册账号，返回 null 表示成功，否则为失败原因 */
  register: (info: { studentId: string; nickname: string; college: string; name: string }) => string | null;
  /** 管理员账号密码登录 */
  adminLogin: (username: string, password: string) => boolean;
  logout: () => void;
  getProductById: (id: string) => IProduct | undefined;
  getUserById: (id: string) => IUser | undefined;
  /** 提交意见反馈 */
  submitFeedback: (content: string, image?: string) => { success: boolean; message?: string; feedbackId?: string };
  /** 管理员回复反馈 */
  replyFeedback: (id: string, reply: string) => void;
  /** 用户继续追加消息 */
  appendFeedbackMessage: (id: string, content: string, image?: string) => void;
  /** 获取当前用户的所有反馈 */
  getMyFeedbacks: () => IFeedback[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<IProduct[]>(() =>
    readJSON<IProduct[]>('products', MOCK_PRODUCTS),
  );
  const [ads, setAds] = useState<IAd[]>(() => readJSON<IAd[]>('ads', MOCK_ADS));
  const [wanted, setWanted] = useState<IWanted[]>(() =>
    readJSON<IWanted[]>('wanted', MOCK_WANTED),
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    readJSON<string[]>('favorites', []),
  );
  const [auth, setAuth] = useState<AuthState>(() =>
    readJSON<AuthState>('auth', DEFAULT_AUTH),
  );
  const [users, setUsers] = useState<IUser[]>(() =>
    readJSON<IUser[]>('users_list', MOCK_USERS),
  );
  const [feedbacks, setFeedbacks] = useState<IFeedback[]>(() =>
    readJSON<IFeedback[]>('feedbacks', []),
  );

  useEffect(() => { writeJSON('products', products); }, [products]);
  useEffect(() => { writeJSON('ads', ads); }, [ads]);
  useEffect(() => { writeJSON('wanted', wanted); }, [wanted]);
  useEffect(() => { writeJSON('favorites', favorites); }, [favorites]);
  useEffect(() => { writeJSON('auth', auth); }, [auth]);
  useEffect(() => { writeJSON('users_list', users); }, [users]);
  useEffect(() => { writeJSON('feedbacks', feedbacks); }, [feedbacks]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const isFavorite = (id: string) => favorites.includes(id);

  const addProduct = (p: Omit<IProduct, 'id' | 'createdAt' | 'status' | 'sellerId' | 'sellerNickname' | 'sellerAvatar' | 'is_top' | 'top_expire_at' | 'top_weight'>) => {
    const newProduct: IProduct = {
      ...p,
      id: `p_${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'on_sale',
      sellerId: auth.userId || 'guest',
      sellerNickname: auth.nickname || '匿名用户',
      sellerAvatar: auth.avatar || MOCK_USERS[0].avatar,
      is_top: false,
      top_expire_at: null,
      top_weight: 0,
    };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const addWanted = (w: Omit<IWanted, 'id' | 'buyerId' | 'status' | 'createdAt'>) => {
    const newWanted: IWanted = {
      ...w,
      id: `w_${Date.now()}`,
      buyerId: auth.userId || 'guest',
      status: 'open',
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    setWanted((prev) => [newWanted, ...prev]);
  };

  const setTop = (id: string, top: boolean, weight = 50, expireAt: string | null = null) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, is_top: top, top_weight: top ? weight : 0, top_expire_at: top ? expireAt : null }
          : p,
      ),
    );
  };

  const setProductStatus = (id: string, status: IProduct['status']) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const addAd = (ad: Omit<IAd, 'id'>) => {
    const newAd: IAd = { ...ad, id: `ad_${Date.now()}` };
    setAds((prev) => [...prev, newAd]);
  };

  const updateAd = (id: string, patch: Partial<Omit<IAd, 'id'>>) => {
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const setAdStatus = (id: string, status: IAd['status']) => {
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const updateNickname = (nickname: string): boolean => {
    const trimmed = nickname.trim();
    if (!trimmed) return false;
    // 昵称不可与其他用户重复
    if (users.some((u) => u.id !== auth.userId && u.nickname === trimmed)) return false;
    setAuth((prev) => (prev.isLoggedIn ? { ...prev, nickname: trimmed } : prev));
    setUsers((prev) =>
      prev.map((u) => (u.id === auth.userId ? { ...u, nickname: trimmed } : u)),
    );
    return true;
  };

  const updateAvatar = (avatar: string) => {
    if (!avatar) return;
    setAuth((prev) => (prev.isLoggedIn ? { ...prev, avatar } : prev));
    setUsers((prev) =>
      prev.map((u) => (u.id === auth.userId ? { ...u, avatar } : u)),
    );
  };

  const register = (info: { studentId: string; nickname: string; college: string; name: string }): string | null => {
    if (users.some((u) => u.studentId === info.studentId)) return '该学号已注册，请直接登录';
    if (users.some((u) => u.nickname === info.nickname.trim())) return '该昵称已被使用，请换一个';
    const newUser: IUser = {
      id: `u_${Date.now()}`,
      studentId: info.studentId,
      nickname: info.nickname.trim(),
      avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/9.jpg',
      verified: false,
      reputationTags: ['新用户'],
      reportCount: 0,
      tradeCount: 0,
      rating: 5.0,
    };
    setUsers((prev) => [...prev, newUser]);
    // 自动登录
    setAuth({
      isLoggedIn: true,
      userId: newUser.id,
      studentId: newUser.studentId,
      nickname: newUser.nickname,
      avatar: newUser.avatar,
      verified: false,
      isAdmin: false,
    });
    return null;
  };

  const login = (studentId: string): boolean => {
    const user = users.find((u) => u.studentId === studentId);
    if (!user) return false;
    setAuth({
      isLoggedIn: true,
      userId: user.id,
      studentId: user.studentId,
      nickname: user.nickname,
      avatar: user.avatar,
      verified: user.verified,
      isAdmin: false,
    });
    return true;
  };

  const adminLogin = (username: string, password: string): boolean => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setAuth({
        isLoggedIn: true,
        userId: 'admin',
        studentId: 'admin',
        nickname: '站点管理员',
        avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/7.jpg',
        verified: true,
        isAdmin: true,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuth(DEFAULT_AUTH);
  };

  const getProductById = (id: string) => products.find((p) => p.id === id);
  const getUserById = (id: string) => users.find((u) => u.id === id) || MOCK_USERS.find((u) => u.id === id);

  const submitFeedback = (content: string, image?: string) => {
    if (!auth.isLoggedIn) return { success: false, message: '请先登录' };
    // 同一用户同时只能有 1 条「待回复」的反馈
    const hasPending = feedbacks.some(
      (f) => f.userId === auth.userId && f.status === 'pending',
    );
    if (hasPending) {
      return {
        success: false,
        message: '您有一条反馈正在处理中，请等待管理员回复后再提交新反馈',
      };
    }
    const now = new Date().toLocaleString('zh-CN');
    const newFeedback: IFeedback = {
      id: `fb_${Date.now()}`,
      userId: auth.userId,
      userNickname: auth.nickname,
      userStudentId: auth.studentId,
      userAvatar: auth.avatar,
      content,
      image,
      status: 'pending',
      createdAt: now,
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'user',
          content,
          image,
          timestamp: now,
        },
      ],
    };
    setFeedbacks((prev) => [newFeedback, ...prev]);
    return { success: true, feedbackId: newFeedback.id };
  };

  const replyFeedback = (id: string, reply: string) => {
    const now = new Date().toLocaleString('zh-CN');
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: 'replied',
              replyContent: reply,
              replyAt: now,
              messages: [
                ...f.messages,
                {
                  id: `msg_${Date.now()}`,
                  sender: 'admin',
                  content: reply,
                  timestamp: now,
                },
              ],
            }
          : f,
      ),
    );
  };

  const appendFeedbackMessage = (id: string, content: string, image?: string) => {
    const now = new Date().toLocaleString('zh-CN');
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === id && f.status === 'replied'
          ? {
              ...f,
              status: 'pending',
              messages: [
                ...f.messages,
                {
                  id: `msg_${Date.now()}`,
                  sender: 'user',
                  content,
                  image,
                  timestamp: now,
                },
              ],
            }
          : f,
      ),
    );
  };

  const getMyFeedbacks = () =>
    feedbacks.filter((f) => f.userId === auth.userId);

  const value = useMemo<AppContextValue>(
    () => ({
      products,
      ads,
      wanted,
      users,
      favorites,
      auth,
      feedbacks,
      toggleFavorite,
      isFavorite,
      addProduct,
      addWanted,
      setTop,
      setProductStatus,
      addAd,
      updateAd,
      setAdStatus,
      updateNickname,
      updateAvatar,
      login,
      register,
      adminLogin,
      logout,
      getProductById,
      getUserById,
      submitFeedback,
      replyFeedback,
      appendFeedbackMessage,
      getMyFeedbacks,
    }),
    [products, ads, wanted, users, favorites, auth, feedbacks],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
