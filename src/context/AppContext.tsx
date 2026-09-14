import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_AVATAR,
  addFavorite,
  checkRegistration,
  fetchAds,
  fetchFavoriteIds,
  fetchMyProfile,
  fetchUnreadMessageCount,
  removeFavorite,
  updateAvatarUrl,
  updateNickname as apiUpdateNickname,
} from '@/lib/api';
import { uploadAvatar } from '@/lib/image';
import type { IAd } from '@/data/ads';
import { toast } from 'sonner';

export interface AuthState {
  isLoggedIn: boolean;
  userId: string;
  studentId: string;
  nickname: string;
  avatar: string;
  email: string;
  verified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
}

const DEFAULT_AUTH: AuthState = {
  isLoggedIn: false,
  userId: '',
  studentId: '',
  nickname: '',
  avatar: '',
  email: '',
  verified: false,
  isAdmin: false,
  isBanned: false,
};

export interface RegisterInfo {
  email: string;
  password: string;
  studentId: string;
  nickname: string;
  college: string;
  name: string;
}

interface AppContextValue {
  auth: AuthState;
  /** 首次会话恢复中（刷新页面时短暂为 true） */
  authLoading: boolean;
  ads: IAd[];
  refreshAds: () => Promise<void>;
  /** 未读私信总条数（全局红点） */
  unreadMessages: number;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
  /** 邮箱 + 密码登录，返回 null 表示成功，否则为失败原因 */
  login: (email: string, password: string) => Promise<string | null>;
  /** 管理员登录（邮箱 + 密码，校验 is_admin），返回 null 表示成功 */
  adminLogin: (email: string, password: string) => Promise<string | null>;
  /** 注册，返回 null 表示成功，否则为失败原因 */
  register: (info: RegisterInfo) => Promise<string | null>;
  logout: () => Promise<void>;
  /** 修改昵称（全站唯一），返回 true 或失败原因 */
  updateNickname: (nickname: string) => Promise<true | string>;
  /** 从相册上传新头像 */
  updateAvatar: (file: File) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(DEFAULT_AUTH);
  const [authLoading, setAuthLoading] = useState(true);
  const [ads, setAds] = useState<IAd[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profile = await fetchMyProfile(userId);
      if (!profile) {
        setAuth(DEFAULT_AUTH);
        setFavorites([]);
        return;
      }
      setAuth({
        isLoggedIn: true,
        userId: profile.id,
        studentId: profile.studentId,
        nickname: profile.nickname,
        avatar: profile.avatar,
        email: profile.email,
        verified: profile.verified,
        isAdmin: profile.isAdmin,
        isBanned: profile.isBanned,
      });
      const favIds = await fetchFavoriteIds(userId);
      setFavorites(favIds);
    } catch {
      // 网络异常时保持当前状态
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // 会话恢复 + 登录状态监听
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // 回调内不能直接 await supabase 请求（可能死锁），延后执行
      setTimeout(() => {
        if (session?.user) {
          void loadProfile(session.user.id);
        } else {
          setAuth(DEFAULT_AUTH);
          setFavorites([]);
          setAuthLoading(false);
        }
      }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshAds = useCallback(async () => {
    try {
      setAds(await fetchAds());
    } catch {
      // 忽略，保持旧数据
    }
  }, []);

  useEffect(() => {
    void refreshAds();
  }, [refreshAds]);

  // 全局未读私信数：登录后加载，Realtime 监听消息增改（防抖 600ms）
  useEffect(() => {
    const userId = auth.userId;
    if (!auth.isLoggedIn || !userId) {
      setUnreadMessages(0);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      fetchUnreadMessageCount(userId)
        .then(setUnreadMessages)
        .catch(() => {});
    };
    const debouncedRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, 600);
    };
    refresh();
    // RLS 保证只收到自己参与会话的消息事件；别人发来新消息（INSERT）
    // 或消息被标记已读（UPDATE）都会触发重新计数
    const channel = supabase
      .channel(`unread-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        debouncedRefresh,
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [auth.isLoggedIn, auth.userId]);

  // ---------- 认证 ----------

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return '邮箱或密码不正确';
      return null; // onAuthStateChange 会自动加载资料
    },
    [],
  );

  const adminLogin = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return '邮箱或密码不正确';
      const profile = await fetchMyProfile(data.user.id);
      if (!profile?.isAdmin) {
        await supabase.auth.signOut();
        return '该账号没有管理员权限';
      }
      return null;
    },
    [],
  );

  const register = useCallback(
    async (info: RegisterInfo): Promise<string | null> => {
      const nickname = info.nickname.trim();
      // 注册前可用性检查（RPC）
      const { nicknameTaken, studentIdTaken } = await checkRegistration(
        nickname,
        info.studentId,
      );
      if (nicknameTaken) return '该昵称已被使用，请换一个';
      if (studentIdTaken) return '该学号已注册，请直接登录';

      const { data, error } = await supabase.auth.signUp({
        email: info.email,
        password: info.password,
      });
      if (error) {
        console.error('[register] signUp error:', error);
        if (error.message.toLowerCase().includes('already')) {
          return '该邮箱已注册，请直接登录';
        }
        if (error.message.toLowerCase().includes('rate limit')) {
          return '发送验证邮件过于频繁，请在 Supabase 关闭邮箱验证后重试';
        }
        return `注册失败：${error.message}`;
      }
      const uid = data.user?.id;
      if (!uid) return '注册失败，请稍后重试';

      // signUp 后没有 session = 项目开启了邮箱验证，后续写库会因未登录被 RLS 拦截
      if (!data.session) {
        console.error('[register] no session after signUp (email confirm ON)');
        return '项目开启了邮箱验证，请先在 Supabase 关闭 Confirm email（Authentication → Sign In / Providers → Email）';
      }

      // 写入公开资料 + 隐私资料（邮箱验证已关闭，signUp 后即处于登录态）
      const { error: pErr } = await supabase.from('profiles').insert({
        id: uid,
        nickname,
        college: info.college.trim(),
        avatar_url: DEFAULT_AVATAR,
      });
      if (pErr) {
        console.error('[register] profiles insert error:', pErr);
        if (pErr.code === '23505') return '该昵称已被使用，请换一个';
        return '资料写入失败，请稍后重试';
      }
      const { error: vErr } = await supabase.from('profile_private').insert({
        user_id: uid,
        student_id: info.studentId,
        name: info.name.trim(),
        email: info.email,
      });
      if (vErr) {
        console.error('[register] profile_private insert error:', vErr);
        if (vErr.code === '23505') return '该学号已注册，请直接登录';
        return '资料写入失败，请稍后重试';
      }
      return null;
    },
    [],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ---------- 资料修改 ----------

  const updateNickname = useCallback(
    async (nickname: string): Promise<true | string> => {
      const trimmed = nickname.trim();
      if (!trimmed) return '昵称不能为空';
      if (!auth.isLoggedIn) return '请先登录';
      const result = await apiUpdateNickname(auth.userId, trimmed);
      if (result === true) {
        setAuth((prev) => ({ ...prev, nickname: trimmed }));
      }
      return result;
    },
    [auth.isLoggedIn, auth.userId],
  );

  const updateAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      if (!auth.isLoggedIn) return false;
      try {
        const url = await uploadAvatar(auth.userId, file);
        await updateAvatarUrl(auth.userId, url);
        setAuth((prev) => ({ ...prev, avatar: url }));
        return true;
      } catch {
        return false;
      }
    },
    [auth.isLoggedIn, auth.userId],
  );

  // ---------- 收藏 ----------

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!auth.isLoggedIn) {
        toast.error('请先登录后再收藏');
        return;
      }
      const wasFav = favorites.includes(id);
      // 乐观更新
      setFavorites((prev) =>
        wasFav ? prev.filter((x) => x !== id) : [...prev, id],
      );
      try {
        if (wasFav) await removeFavorite(auth.userId, id);
        else await addFavorite(auth.userId, id);
      } catch {
        // 失败回滚
        setFavorites((prev) =>
          wasFav ? [...prev, id] : prev.filter((x) => x !== id),
        );
        toast.error('操作失败，请稍后重试');
      }
    },
    [auth.isLoggedIn, auth.userId, favorites],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      auth,
      authLoading,
      ads,
      refreshAds,
      unreadMessages,
      favorites,
      isFavorite,
      toggleFavorite,
      login,
      adminLogin,
      register,
      logout,
      updateNickname,
      updateAvatar,
    }),
    [
      auth,
      authLoading,
      ads,
      refreshAds,
      unreadMessages,
      favorites,
      isFavorite,
      toggleFavorite,
      login,
      adminLogin,
      register,
      logout,
      updateNickname,
      updateAvatar,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
