import { createFileRoute } from '@tanstack/react-router'
import { Chats } from '@/features/chats'

export const Route = createFileRoute('/_authenticated/chats/')({
  staticData: { title: '聊天' },
  component: Chats,
})
