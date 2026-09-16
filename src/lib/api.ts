import { supabase } from '@/lib/supabase';
import type { IProduct } from '@/data/products';
import type { IAd } from '@/data/ads';
import type { IWanted } from '@/data/wanted';
import type { IUser } from '@/data/users';

/** 默认头像（内联 SVG，绿色圆形 + 人形剪影） */
export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#dcfce7"/><circle cx="32" cy="24" r="10" fill="#16a34a"/><path d="M12 56c2-12 10-18 20-18s18 6 20 18" fill="#16a34a"/></svg>',
  );

// ---------------------------------------------------------------
// 类型映射
// ---------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapProduct(row: any): IProduct {
  const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    originalPrice:
      row.original_price != null ? Number(row.original_price) : undefined,
    category: row.category,
    condition: row.condition,
    images: row.images ?? [],
    thumbs: row.thumbs ?? [],
    description: row.description ?? '',
    pickupLocation: row.pickup_location ?? '',
    sellerId: row.seller_id,
    sellerNickname: seller?.nickname ?? '同学',
    sellerAvatar: seller?.avatar_url || DEFAULT_AVATAR,
    status: row.status,
    createdAt: (row.created_at ?? '').slice(0, 10),
    is_top: row.is_top ?? false,
    top_expire_at: row.top_expire_at ?? null,
    top_weight: row.top_weight ?? 0,
  };
}

const PRODUCT_SELECT =
  '*, seller:profiles!products_seller_id_fkey(nickname, avatar_url)';

/** 商品详情页的卖家信誉信息 */
export interface ISellerInfo {
  id: string;
  nickname: string;
  avatar: string;
  verified: boolean;
  rating: number;
  tradeCount: number;
  reportCount: number;
  reputationTags: string[];
}

const PRODUCT_DETAIL_SELECT =
  '*, seller:profiles!products_seller_id_fkey(id, nickname, avatar_url, verified, rating, trade_count, report_count, reputation_tags)';

function mapSeller(row: any): ISellerInfo | undefined {
  const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;
  if (!seller) return undefined;
  return {
    id: seller.id,
    nickname: seller.nickname,
    avatar: seller.avatar_url || DEFAULT_AVATAR,
    verified: seller.verified ?? false,
    rating: Number(seller.rating ?? 5),
    tradeCount: seller.trade_count ?? 0,
    reportCount: seller.report_count ?? 0,
    reputationTags: seller.reputation_tags ?? [],
  };
}

function mapAd(row: any): IAd {
  return {
    id: row.id,
    slot_key: row.slot_key,
    title: row.title,
    image_url: row.image_url,
    link: row.link ?? '#',
    start_at: (row.start_at ?? '').slice(0, 10),
    end_at: (row.end_at ?? '').slice(0, 10),
    status: row.status,
  };
}

function mapWanted(row: any): IWanted {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    budget: row.budget ?? '',
    description: row.description ?? '',
    buyerId: row.buyer_id,
    status: row.status,
    createdAt: (row.created_at ?? '').slice(0, 10),
  };
}

// ---------------------------------------------------------------
// 商品
// ---------------------------------------------------------------

export type ProductSort = 'newest' | 'price-asc' | 'price-desc';

export interface ProductPageQuery {
  category?: string;
  keyword?: string;
  sort?: ProductSort;
  page: number;
  pageSize?: number;
}

export async function fetchTopProducts(limit = 3): Promise<IProduct[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_top', true)
    .eq('status', 'on_sale')
    .or(`top_expire_at.is.null,top_expire_at.gt.${now}`)
    .order('top_weight', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function fetchLatestProducts(limit = 6): Promise<IProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'on_sale')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

/** 分页查询在售商品（不含置顶，置顶单独取） */
export async function fetchProductsPage(
  q: ProductPageQuery,
): Promise<{ items: IProduct[]; total: number; hasMore: boolean }> {
  const pageSize = q.pageSize ?? 15;
  const from = q.page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('status', 'on_sale')
    .eq('is_top', false);

  if (q.category && q.category !== 'all') {
    query = query.eq('category', q.category);
  }
  const kw = q.keyword?.trim();
  if (kw) {
    const safe = kw.replace(/[%_,()"]/g, ' ');
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (q.sort === 'price-asc') query = query.order('price', { ascending: true });
  else if (q.sort === 'price-desc')
    query = query.order('price', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  const total = count ?? 0;
  return {
    items: (data ?? []).map(mapProduct),
    total,
    hasMore: to + 1 < total,
  };
}

export async function fetchProductById(
  id: string,
): Promise<{ product: IProduct; seller?: ISellerInfo } | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { product: mapProduct(data), seller: mapSeller(data) };
}

export async function fetchRelatedProducts(
  category: string,
  excludeId: string,
  limit = 4,
): Promise<IProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'on_sale')
    .eq('category', category)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function fetchMyProducts(userId: string): Promise<IProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function fetchProductsByIds(ids: string[]): Promise<IProduct[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .in('id', ids);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

/** 管理后台：全部商品（含下架） */
export async function fetchAllProductsAdmin(): Promise<IProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export interface NewProductInput {
  category: string;
  title: string;
  price: number;
  originalPrice?: number;
  condition: string;
  description: string;
  pickupLocation: string;
  images: string[];
  thumbs: string[];
}

export async function insertProduct(
  sellerId: string,
  input: NewProductInput,
): Promise<void> {
  const { error } = await supabase.from('products').insert({
    seller_id: sellerId,
    title: input.title,
    price: input.price,
    original_price: input.originalPrice ?? null,
    category: input.category,
    condition: input.condition,
    description: input.description,
    pickup_location: input.pickupLocation,
    images: input.images,
    thumbs: input.thumbs,
  });
  if (error) throw error;
}

export async function setProductStatus(
  id: string,
  status: IProduct['status'],
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status !== 'on_sale') {
    // 售出/下架都清除置顶
    patch.is_top = false;
    patch.top_weight = 0;
    patch.top_expire_at = null;
  }
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}

/** 删除商品（RLS：卖家本人或管理员；收藏级联删除，会话/交易记录保留快照） */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function setProductTop(
  id: string,
  top: boolean,
  weight = 1,
  expireAt: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      is_top: top,
      top_weight: top ? weight : 0,
      top_expire_at: top ? expireAt : null,
    })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------
// 求购
// ---------------------------------------------------------------

export interface WantedPageQuery {
  tab?: string; // all | open | closed
  category?: string;
  keyword?: string;
  page: number;
  pageSize?: number;
}

export async function fetchWantedPage(
  q: WantedPageQuery,
): Promise<{ items: IWanted[]; total: number; hasMore: boolean }> {
  const pageSize = q.pageSize ?? 15;
  const from = q.page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('wanted')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (q.tab === 'open' || q.tab === 'closed') query = query.eq('status', q.tab);
  if (q.category && q.category !== 'all')
    query = query.eq('category', q.category);
  const kw = q.keyword?.trim();
  if (kw) {
    const safe = kw.replace(/[%_,()"]/g, ' ');
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  const total = count ?? 0;
  return {
    items: (data ?? []).map(mapWanted),
    total,
    hasMore: to + 1 < total,
  };
}

export async function insertWanted(
  buyerId: string,
  input: { title: string; category: string; budget: string; description: string },
): Promise<void> {
  const { error } = await supabase.from('wanted').insert({
    buyer_id: buyerId,
    title: input.title,
    category: input.category,
    budget: input.budget,
    description: input.description,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------
// 广告位
// ---------------------------------------------------------------

export async function fetchAds(): Promise<IAd[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapAd);
}

export async function insertAd(ad: Omit<IAd, 'id'>): Promise<void> {
  const { error } = await supabase.from('ads').insert({
    slot_key: ad.slot_key,
    title: ad.title,
    image_url: ad.image_url,
    link: ad.link,
    start_at: ad.start_at,
    end_at: ad.end_at,
    status: ad.status,
  });
  if (error) throw error;
}

export async function updateAd(
  id: string,
  patch: Partial<Omit<IAd, 'id'>>,
): Promise<void> {
  const { error } = await supabase.from('ads').update(patch).eq('id', id);
  if (error) throw error;
}

export async function setAdStatus(
  id: string,
  status: IAd['status'],
): Promise<void> {
  const { error } = await supabase.from('ads').update({ status }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------
// 收藏
// ---------------------------------------------------------------

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.product_id as string);
}

export async function addFavorite(
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, product_id: productId });
  if (error && error.code !== '23505') throw error;
}

export async function removeFavorite(
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}

// ---------------------------------------------------------------
// 用户资料
// ---------------------------------------------------------------

export interface IMyProfile {
  id: string;
  nickname: string;
  college: string;
  avatar: string;
  verified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  rating: number;
  tradeCount: number;
  reportCount: number;
  reputationTags: string[];
  studentId: string;
  email: string;
}

export async function fetchMyProfile(userId: string): Promise<IMyProfile | null> {
  const [{ data: p, error: e1 }, { data: priv }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('profile_private')
      .select('student_id, email')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (e1) throw e1;
  if (!p) return null;
  return {
    id: p.id,
    nickname: p.nickname,
    college: p.college ?? '',
    avatar: p.avatar_url || DEFAULT_AVATAR,
    verified: p.verified ?? false,
    isAdmin: p.is_admin ?? false,
    isBanned: p.is_banned ?? false,
    rating: Number(p.rating ?? 5),
    tradeCount: p.trade_count ?? 0,
    reportCount: p.report_count ?? 0,
    reputationTags: p.reputation_tags ?? [],
    studentId: priv?.student_id ?? '',
    email: priv?.email ?? '',
  };
}

export async function updateNickname(
  userId: string,
  nickname: string,
): Promise<true | string> {
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', userId);
  if (error) {
    if (error.code === '23505') return '该昵称已被使用，请换一个';
    return '保存失败，请稍后重试';
  }
  return true;
}

export async function updateAvatarUrl(
  userId: string,
  url: string,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (error) throw error;
}

/** 管理后台：全部用户（含学号，依赖 patch_01 的管理员隐私读取策略） */
export async function fetchAllUsersAdmin(): Promise<IUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      '*, private:profile_private!profile_private_user_id_fkey(student_id)',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((p: any) => {
    const priv = Array.isArray(p.private) ? p.private[0] : p.private;
    return {
      id: p.id,
      studentId: priv?.student_id ?? '',
      nickname: p.nickname,
      avatar: p.avatar_url || DEFAULT_AVATAR,
      verified: p.verified ?? false,
      reputationTags: p.reputation_tags ?? [],
      reportCount: p.report_count ?? 0,
      tradeCount: p.trade_count ?? 0,
      rating: Number(p.rating ?? 5),
      isBanned: p.is_banned ?? false,
      isAdmin: p.is_admin ?? false,
    };
  });
}

export async function setUserBanned(
  userId: string,
  banned: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: banned })
    .eq('id', userId);
  if (error) throw error;
}

// ---------------------------------------------------------------
// 反馈工单
// ---------------------------------------------------------------

export interface IFeedbackMessage {
  id: string;
  sender: 'user' | 'admin';
  content: string;
  image?: string;
  timestamp: string;
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
  /** 管理员已读时间（ISO），undefined = 未读 */
  readAt?: string;
  createdAt: string;
  messages: IFeedbackMessage[];
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapFeedback(row: any): IFeedback {
  const user = Array.isArray(row.user) ? row.user[0] : row.user;
  const priv = user ? (Array.isArray(user.private) ? user.private[0] : user.private) : null;
  const msgs = (row.messages ?? [])
    .slice()
    .sort((a: any, b: any) => (a.created_at < b.created_at ? -1 : 1))
    .map((m: any) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      image: m.image ?? undefined,
      timestamp: fmtTime(m.created_at),
    }));
  return {
    id: row.id,
    userId: row.user_id,
    userNickname: user?.nickname ?? '',
    userStudentId: priv?.student_id ?? '',
    userAvatar: user?.avatar_url || DEFAULT_AVATAR,
    content: row.content,
    image: row.image ?? undefined,
    status: row.status,
    replyContent: row.reply_content ?? undefined,
    replyAt: row.reply_at ? fmtTime(row.reply_at) : undefined,
    readAt: row.read_at ?? undefined,
    createdAt: fmtTime(row.created_at),
    messages: msgs,
  };
}

export async function fetchMyFeedbacks(userId: string): Promise<IFeedback[]> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select('*, messages:feedback_messages(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) =>
    mapFeedback({ ...row, user: null }),
  );
}

export async function fetchAllFeedbacksAdmin(): Promise<IFeedback[]> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select(
      '*, messages:feedback_messages(*), user:profiles!feedbacks_user_id_fkey(nickname, avatar_url, private:profile_private!profile_private_user_id_fkey(student_id))',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapFeedback);
}

/** 提交反馈，一人一 pending 由数据库唯一索引保证 */
export async function submitFeedback(
  userId: string,
  content: string,
  image?: string,
): Promise<{ success: boolean; message?: string }> {
  const { data: fb, error } = await supabase
    .from('feedbacks')
    .insert({ user_id: userId, content, image: image ?? null })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        message: '您有一条反馈正在处理中，请等待管理员回复后再提交新反馈',
      };
    }
    return { success: false, message: '提交失败，请稍后重试' };
  }
  const { error: mErr } = await supabase.from('feedback_messages').insert({
    feedback_id: fb.id,
    sender: 'user',
    content,
    image: image ?? null,
  });
  if (mErr) return { success: false, message: '提交失败，请稍后重试' };
  return { success: true };
}

export async function appendFeedbackMessage(
  feedbackId: string,
  content: string,
  image?: string,
): Promise<void> {
  const { error } = await supabase.from('feedback_messages').insert({
    feedback_id: feedbackId,
    sender: 'user',
    content,
    image: image ?? null,
  });
  if (error) throw error;
}

export async function replyFeedback(
  feedbackId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase.from('feedback_messages').insert({
    feedback_id: feedbackId,
    sender: 'admin',
    content,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------
// 举报
// ---------------------------------------------------------------

export interface IReport {
  id: string;
  targetType: 'product' | 'user';
  targetId: string;
  reason: string;
  detail: string;
  status: 'open' | 'resolved';
  reporterNickname: string;
  /** 管理员已读时间（ISO），undefined = 未读 */
  readAt?: string;
  createdAt: string;
}

export async function insertReport(
  reporterId: string,
  input: {
    targetType: 'product' | 'user';
    targetId: string;
    reason: string;
    detail: string;
  },
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    detail: input.detail,
  });
  if (error) throw error;
}

export async function fetchReportsAdmin(): Promise<IReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      '*, reporter:profiles!reports_reporter_id_fkey(nickname)',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    const reporter = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
    return {
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      detail: r.detail ?? '',
      status: r.status,
      reporterNickname: reporter?.nickname ?? '未知用户',
      readAt: r.read_at ?? undefined,
      createdAt: fmtTime(r.created_at),
    };
  });
}

export async function setReportStatus(
  id: string,
  status: 'open' | 'resolved',
): Promise<void> {
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  if (error) throw error;
}

/** 管理员：一键已读全部反馈工单 */
export async function markAllFeedbacksRead(): Promise<void> {
  const { error } = await supabase
    .from('feedbacks')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

/** 管理员：一键已读全部举报 */
export async function markAllReportsRead(): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

// ---------------------------------------------------------------
// 站内私信
// ---------------------------------------------------------------

export interface IConversationItem {
  id: string;
  productId: string | null;
  otherId: string;
  otherNickname: string;
  otherAvatar: string;
  otherVerified: boolean;
  product?: { id: string; title: string; price: number; image: string };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface IChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'system';
  readAt: string | null;
  createdAt: string;
}

export async function fetchConversations(
  userId: string,
): Promise<IConversationItem[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      '*, product:products(id, title, price, thumbs, images), buyer:profiles!conversations_buyer_id_fkey(id, nickname, avatar_url, verified), seller:profiles!conversations_seller_id_fkey(id, nickname, avatar_url, verified)',
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  // 未读数（我作为接收方、未读的消息）
  const { data: unread } = await supabase
    .from('messages')
    .select('conversation_id')
    .is('read_at', null)
    .neq('sender_id', userId);
  const unreadMap = new Map<string, number>();
  (unread ?? []).forEach((m: any) => {
    unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1);
  });

  return (data ?? []).map((row: any) => {
    const buyer = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer;
    const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;
    const isBuyer = row.buyer_id === userId;
    const other = isBuyer ? seller : buyer;
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    return {
      id: row.id,
      productId: row.product_id,
      otherId: other?.id ?? '',
      otherNickname: other?.nickname ?? '同学',
      otherAvatar: other?.avatar_url || DEFAULT_AVATAR,
      otherVerified: other?.verified ?? false,
      product: product
        ? {
            id: product.id,
            title: product.title,
            price: Number(product.price),
            image: product.thumbs?.[0] || product.images?.[0] || '',
          }
        : undefined,
      lastMessage: row.last_message ?? '',
      lastMessageAt: row.last_message_at ?? row.created_at,
      unreadCount: unreadMap.get(row.id) ?? 0,
    };
  });
}

/** 获取或创建会话（商品咨询 productId 非空；求购联系为 null） */
export async function getOrCreateConversation(
  productId: string | null,
  me: string,
  otherId: string,
  systemHint?: string,
): Promise<string> {
  let query = supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', me)
    .eq('seller_id', otherId);
  query = productId
    ? query.eq('product_id', productId)
    : query.is('product_id', null);
  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ product_id: productId, buyer_id: me, seller_id: otherId })
    .select('id')
    .single();
  if (error) {
    // 并发下唯一索引冲突 → 重新查询
    if (error.code === '23505') {
      const { data: again } = await query.maybeSingle();
      if (again) return again.id;
    }
    throw error;
  }
  if (systemHint) {
    await supabase.from('messages').insert({
      conversation_id: created.id,
      sender_id: me,
      content: systemHint,
      type: 'system',
    });
  }
  return created.id;
}

export async function fetchMessages(
  conversationId: string,
): Promise<IChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((m: any) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    content: m.content,
    type: m.type,
    readAt: m.read_at,
    createdAt: m.created_at,
  }));
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<IChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    content: data.content,
    type: data.type,
    readAt: data.read_at,
    createdAt: data.created_at,
  };
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

/** 我的未读消息总条数（RLS 自动限定为我参与的会话） */
export async function fetchUnreadMessageCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .neq('sender_id', userId);
  if (error) throw error;
  return count ?? 0;
}

/** 一键已读：把我所有会话里别人发来的未读消息全部标记已读 */
export async function markAllMessagesRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .neq('sender_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

/** 管理员待处理条数：未读意见反馈 + 未读举报（RLS 限定仅管理员可查，非管理员调用会报错，由调用方限定） */
export async function fetchUnreadAdminCount(): Promise<number> {
  const [fb, rp] = await Promise.all([
    supabase
      .from('feedbacks')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
  ]);
  if (fb.error) throw fb.error;
  if (rp.error) throw rp.error;
  return (fb.count ?? 0) + (rp.count ?? 0);
}

// ---------------------------------------------------------------
// 交易记录（本期只读，通常为空）
// ---------------------------------------------------------------

export interface ITradeRecord {
  id: string;
  productTitle: string;
  productImage: string;
  buyerId: string;
  sellerId: string;
  price: number;
  status: 'completed' | 'cancelled';
  buyerRating?: number;
  buyerComment?: string;
  sellerRating?: number;
  sellerComment?: string;
  completedAt?: string;
}

export async function fetchMyTrades(userId: string): Promise<ITradeRecord[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    id: t.id,
    productTitle: t.product_title,
    productImage: t.product_image,
    buyerId: t.buyer_id,
    sellerId: t.seller_id,
    price: Number(t.price),
    status: t.status,
    buyerRating: t.buyer_rating ?? undefined,
    buyerComment: t.buyer_comment ?? undefined,
    sellerRating: t.seller_rating ?? undefined,
    sellerComment: t.seller_comment ?? undefined,
    completedAt: t.completed_at ? fmtTime(t.completed_at) : undefined,
  }));
}

// ---------------------------------------------------------------
// 注册可用性检查（RPC，匿名可调用）
// ---------------------------------------------------------------

export async function checkRegistration(
  nickname: string,
  studentId: string,
): Promise<{ nicknameTaken: boolean; studentIdTaken: boolean }> {
  const { data, error } = await supabase.rpc('check_registration', {
    p_nickname: nickname,
    p_student_id: studentId,
  });
  if (error) return { nicknameTaken: false, studentIdTaken: false };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    nicknameTaken: row?.nickname_taken ?? false,
    studentIdTaken: row?.student_id_taken ?? false,
  };
}
