'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    email: string;
  };
}

export interface UserChat {
  id: string;
  email: string;
  role: string;
  unreadCount: number;
}

export function useChat(userId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastIncomingMessage, setLastIncomingMessage] = useState<Message | null>(null);
  const [conversations, setConversations] = useState<UserChat[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${API_BASE}/chat`, {
      query: { userId },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to chat socket');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from chat socket');
    });

    socket.on('newMessage', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setLastIncomingMessage(message);
      // Atualizar contagem de não lidas nas conversas
      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.senderId
            ? { ...c, unreadCount: c.unreadCount + 1 }
            : c
        )
      );
    });

    socket.on('messageSent', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, API_BASE]);

  const sendMessage = useCallback((receiverId: string, content: string) => {
    if (socketRef.current && content.trim()) {
      socketRef.current.emit('sendMessage', { receiverId, content });
    }
  }, []);

  return {
    messages,
    setMessages,
    conversations,
    setConversations,
    isConnected,
    sendMessage,
    lastIncomingMessage,
    setLastIncomingMessage
  };
}
