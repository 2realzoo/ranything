import client from './client'
import type { ChatMessage, ChatResponse, ChatMode } from '@/types'

export async function sendMessage(
  message: string,
  mode: ChatMode = 'hybrid'
): Promise<ChatResponse> {
  const response = await client.post<ChatResponse>('/chat', { message, mode })
  return response.data
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const response = await client.get<ChatMessage[]>('/chat/history')
  return response.data
}

export async function clearHistory(): Promise<void> {
  await client.delete('/chat/history')
}
