// EXPORTS: IWanted
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
