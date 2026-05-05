'use client';

import { useChatContext } from '@/contexts/ChatContext';

export function useChat(userId: string | null) {
  return useChatContext();
}

export type { Message, UserChat } from '@/contexts/ChatContext';
