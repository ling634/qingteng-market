// EXPORTS: ITrade, MOCK_TRADES

export interface ITrade {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  buyerId: string;
  buyerNickname: string;
  buyerAvatar: string;
  sellerId: string;
  sellerNickname: string;
  sellerAvatar: string;
  price: number;
  status: 'completed' | 'cancelled';
  buyerRating?: number;
  buyerComment?: string;
  sellerRating?: number;
  sellerComment?: string;
  completedAt?: string;
}

export const MOCK_TRADES: ITrade[] = [
  {
    id: '1',
    productId: '2',
    productTitle: '九成新捷安特山地自行车',
    productImage:
      '/images/products/bike.jpg',
    buyerId: '1',
    buyerNickname: '林小绿',
    buyerAvatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/1.jpg',
    sellerId: '2',
    sellerNickname: '陈野',
    sellerAvatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/3.jpg',
    price: 380,
    status: 'completed',
    buyerRating: 5,
    buyerComment: '学长人超好，自行车比描述的还新，满意！',
    sellerRating: 5,
    sellerComment: '爽快买家，准时到，交易愉快~',
    completedAt: '2024-01-12',
  },
  {
    id: '2',
    productId: '3',
    productTitle: '宿舍懒人小书桌',
    productImage:
      '/images/products/desk.jpg',
    buyerId: '1',
    buyerNickname: '林小绿',
    buyerAvatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/1.jpg',
    sellerId: '3',
    sellerNickname: '青藤店长',
    sellerAvatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/5.jpg',
    price: 25,
    status: 'completed',
    buyerRating: 4,
    buyerComment: '书桌挺新的，就是有点小瑕疵，整体不错',
    sellerRating: 5,
    sellerComment: '很有礼貌的同学~',
    completedAt: '2024-01-08',
  },
  {
    id: '3',
    productId: '1',
    productTitle: '高等数学教材（同济第七版）',
    productImage:
      '/images/products/math.jpg',
    buyerId: '2',
    buyerNickname: '陈野',
    buyerAvatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/3.jpg',
    sellerId: '1',
    sellerNickname: '林小绿',
    sellerAvatar:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/1.jpg',
    price: 15,
    status: 'completed',
    buyerRating: 5,
    buyerComment: '教材很新，笔记也很详细，帮大忙了！',
    sellerRating: 5,
    sellerComment: '准时到，交易顺利',
    completedAt: '2024-01-16',
  },
];
