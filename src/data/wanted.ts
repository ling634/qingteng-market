// EXPORTS: IWanted
export interface IWanted {
  id: string
  title: string
  category: string
  budget: string
  description: string
  buyerId: string
  /** 求购中 open → 已预订 reserved → 已买到 done；下架 closed */
  status: 'open' | 'reserved' | 'done' | 'closed'
  createdAt: string
}
