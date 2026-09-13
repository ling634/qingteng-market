// EXPORTS: IUser, MOCK_USERS
export interface IUser {
  id: string
  studentId: string
  email?: string
  nickname: string
  avatar: string
  verified: boolean
  reputationTags: string[]
  reportCount: number
  tradeCount: number
  rating: number
}

export const MOCK_USERS: IUser[] = [
  {
    id: '1',
    studentId: '2023001001',
    email: 'linxiaoy@edu.cn',
    nickname: '林小绿',
    avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/1.jpg',
    verified: true,
    reputationTags: ['正常交易', '快速回复', '好评卖家'],
    reportCount: 0,
    tradeCount: 28,
    rating: 4.9,
  },
  {
    id: '2',
    studentId: '2022002002',
    email: 'chenye@edu.cn',
    nickname: '陈野',
    avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/3.jpg',
    verified: true,
    reputationTags: ['正常交易', '爽快买家'],
    reportCount: 0,
    tradeCount: 15,
    rating: 4.7,
  },
  {
    id: '3',
    studentId: '2021003003',
    nickname: '青藤店长',
    avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/5.jpg',
    verified: true,
    reputationTags: ['认证商户', '林间好店'],
    reportCount: 1,
    tradeCount: 56,
    rating: 4.6,
  },
]