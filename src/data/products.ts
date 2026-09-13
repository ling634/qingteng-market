// EXPORTS: IProduct, MOCK_PRODUCTS

export interface IProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  category: string;
  condition: '全新' | '几乎全新' | '轻微使用' | '明显使用';
  images: string[];
  description: string;
  pickupLocation: string;
  sellerId: string;
  sellerNickname: string;
  sellerAvatar: string;
  status: 'on_sale' | 'sold' | 'offline';
  createdAt: string;
  is_top: boolean;
  top_expire_at: string | null;
  top_weight: number;
}

const IMG_MATH = '/images/products/math.jpg';
const IMG_BIKE = '/images/products/bike.jpg';
const IMG_DESK = '/images/products/desk.jpg';
const IMG_BOOKS = '/images/products/books.jpg';
const IMG_SHOES = '/images/products/shoes.jpg';
const IMG_KETTLE = '/images/products/kettle.jpg';

export const MOCK_PRODUCTS: IProduct[] = [
  {
    id: '1',
    title: '高等数学教材（同济第七版）',
    price: 15,
    originalPrice: 45,
    category: '教材数码',
    condition: '轻微使用',
    images: [IMG_MATH],
    description: '上学期用过的高数教材，笔记不多，书页完好无缺页，适合大一新生使用。附赠课后习题答案打印版。',
    pickupLocation: '东区12号楼宿舍楼下',
    sellerId: 'u1',
    sellerNickname: '青藤学子',
    sellerAvatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/1.jpg',
    status: 'on_sale',
    createdAt: '2024-01-15',
    is_top: true,
    top_expire_at: '2024-02-15',
    top_weight: 100,
  },
  {
    id: '2',
    title: '九成新捷安特山地自行车',
    price: 380,
    originalPrice: 899,
    category: '交通工具',
    condition: '几乎全新',
    images: [IMG_BIKE],
    description: '去年双十一购入，骑了不到十次，毕业带不走便宜出，送车锁和车筐。变速顺畅，刹车灵敏，适合校园代步。',
    pickupLocation: '西区体育馆门口',
    sellerId: 'u2',
    sellerNickname: '毕业学长',
    sellerAvatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/3.jpg',
    status: 'on_sale',
    createdAt: '2024-01-10',
    is_top: true,
    top_expire_at: '2024-01-30',
    top_weight: 80,
  },
  {
    id: '3',
    title: '宿舍懒人小书桌',
    price: 25,
    originalPrice: 69,
    category: '生活用品',
    condition: '轻微使用',
    images: [IMG_DESK],
    description: '可折叠床上小书桌，木纹色，边角完好，搬宿舍出闲置。尺寸60×40cm，带抽屉和杯托。',
    pickupLocation: '南区8号楼',
    sellerId: 'u3',
    sellerNickname: '小树同学',
    sellerAvatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/5.jpg',
    status: 'on_sale',
    createdAt: '2024-01-18',
    is_top: true,
    top_expire_at: '2024-01-28',
    top_weight: 60,
  },
  {
    id: '4',
    title: '考研英语真题全套资料',
    price: 45,
    originalPrice: 128,
    category: '教材数码',
    condition: '轻微使用',
    images: [IMG_BOOKS],
    description: '考研英语一真题2010-2023全套，含黄皮书解析，笔记较详细，适合备考同学参考。',
    pickupLocation: '图书馆门口',
    sellerId: 'u1',
    sellerNickname: '青藤学子',
    sellerAvatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/1.jpg',
    status: 'on_sale',
    createdAt: '2024-01-20',
    is_top: false,
    top_expire_at: null,
    top_weight: 0,
  },
  {
    id: '5',
    title: '白色帆布鞋 42码',
    price: 30,
    originalPrice: 99,
    category: '服饰鞋包',
    condition: '明显使用',
    images: [IMG_SHOES],
    description: '经典款白色帆布鞋，穿过一个学期，鞋头有轻微磨损，洗干净了出，42码正码。',
    pickupLocation: '北区3号楼下',
    sellerId: 'u2',
    sellerNickname: '毕业学长',
    sellerAvatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/3.jpg',
    status: 'on_sale',
    createdAt: '2024-01-19',
    is_top: false,
    top_expire_at: null,
    top_weight: 0,
  },
  {
    id: '6',
    title: '米家迷你电热水壶',
    price: 55,
    originalPrice: 129,
    category: '生活用品',
    condition: '几乎全新',
    images: [IMG_KETTLE],
    description: '宿舍用迷你电热水壶，0.6L容量，自动断电，用了两个月，毕业带回家嫌麻烦出。',
    pickupLocation: '东区12号楼',
    sellerId: 'u3',
    sellerNickname: '小树同学',
    sellerAvatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/5.jpg',
    status: 'on_sale',
    createdAt: '2024-01-21',
    is_top: false,
    top_expire_at: null,
    top_weight: 0,
  },
];
