// EXPORTS: IUser
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
  isBanned?: boolean
  isAdmin?: boolean
}
