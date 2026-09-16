// EXPORTS: IProduct

export interface IProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  category: string;
  condition: '全新' | '几乎全新' | '轻微使用' | '明显使用';
  /** 详情页大图 URL 列表 */
  images: string[];
  /** 列表缩略图 URL 列表（≤400px） */
  thumbs: string[];
  description: string;
  pickupLocation: string;
  sellerId: string;
  sellerNickname: string;
  sellerAvatar: string;
  status: 'on_sale' | 'reserved' | 'sold' | 'offline';
  createdAt: string;
  is_top: boolean;
  top_expire_at: string | null;
  top_weight: number;
  /** 「X 人想要」：收藏人数 ∪ 私聊买家数（同一买家只记一次），由 attachWantCounts 挂载 */
  wantCount?: number;
}
