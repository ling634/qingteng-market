// EXPORTS: IMessage, IConversation, MOCK_CONVERSATIONS
export interface IMessage {
  id: string
  senderId: string
  content: string
  timestamp: string
  type: 'text' | 'system'
}

export interface IConversation {
  id: string
  productId?: string
  participants: string[]
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messages: IMessage[]
}

export const MOCK_CONVERSATIONS: IConversation[] = [
  {
    id: '1',
    productId: '1',
    participants: ['current_user', 'user_2'],
    lastMessage: '好的，明天下午三点见！',
    lastMessageAt: '2024-01-15 14:30',
    unreadCount: 2,
    messages: [
      {
        id: 'm1',
        senderId: 'current_user',
        content: '请问这本高数教材还在吗？',
        timestamp: '2024-01-15 10:00',
        type: 'text',
      },
      {
        id: 'm2',
        senderId: 'user_2',
        content: '在的，九成新，笔记很少~',
        timestamp: '2024-01-15 10:15',
        type: 'text',
      },
      {
        id: 'm3',
        senderId: 'current_user',
        content: '可以便宜点吗？20元行吗',
        timestamp: '2024-01-15 10:20',
        type: 'text',
      },
      {
        id: 'm4',
        senderId: 'user_2',
        content: '可以的，哪里自提方便？',
        timestamp: '2024-01-15 14:20',
        type: 'text',
      },
      {
        id: 'm5',
        senderId: 'current_user',
        content: '图书馆门口可以吗？',
        timestamp: '2024-01-15 14:25',
        type: 'text',
      },
      {
        id: 'm6',
        senderId: 'user_2',
        content: '好的，明天下午三点见！',
        timestamp: '2024-01-15 14:30',
        type: 'text',
      },
    ],
  },
  {
    id: '2',
    productId: '3',
    participants: ['current_user', 'user_3'],
    lastMessage: '我在宿舍楼下了',
    lastMessageAt: '2024-01-14 19:00',
    unreadCount: 0,
    messages: [
      {
        id: 'm1',
        senderId: 'user_3',
        content: '你好，自行车能试骑吗？',
        timestamp: '2024-01-14 18:30',
        type: 'text',
      },
      {
        id: 'm2',
        senderId: 'current_user',
        content: '可以的，来3号宿舍楼',
        timestamp: '2024-01-14 18:45',
        type: 'text',
      },
      {
        id: 'm3',
        senderId: 'user_3',
        content: '我在宿舍楼下了',
        timestamp: '2024-01-14 19:00',
        type: 'text',
      },
    ],
  },
  {
    id: '3',
    participants: ['current_user', 'user_4'],
    lastMessage: '收一个吹风机，有吗？',
    lastMessageAt: '2024-01-13 09:10',
    unreadCount: 1,
    messages: [
      {
        id: 'm1',
        senderId: 'user_4',
        content: '你好，看到你在求购吹风机',
        timestamp: '2024-01-13 09:00',
        type: 'text',
      },
      {
        id: 'm2',
        senderId: 'user_4',
        content: '收一个吹风机，有吗？',
        timestamp: '2024-01-13 09:10',
        type: 'text',
      },
    ],
  },
]