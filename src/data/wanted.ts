// EXPORTS: IWanted, MOCK_WANTED
export interface IWanted {
  id: string
  title: string
  category: string
  budget: string
  description: string
  buyerId: string
  status: 'open' | 'closed'
  createdAt: string
}

export const MOCK_WANTED: IWanted[] = [
  {
    id: '1',
    title: '收高等数学教材',
    category: '教材数码',
    budget: '10-30元',
    description: '求购大一高数教材，轻微使用即可，带笔记最好',
    buyerId: 'user_002',
    status: 'open',
    createdAt: '2024-01-15 10:30'
  },
  {
    id: '2',
    title: '收二手自行车',
    category: '交通工具',
    budget: '100-200元',
    description: '代步用，能骑就行，最好有车锁，东区自提',
    buyerId: 'user_003',
    status: 'open',
    createdAt: '2024-01-14 16:20'
  },
  {
    id: '3',
    title: '收宿舍台灯',
    category: '生活用品',
    budget: '20-50元',
    description: '护眼灯优先，可充电款最好，毕业季甩卖的来',
    buyerId: 'user_001',
    status: 'closed',
    createdAt: '2024-01-10 09:15'
  }
]