'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { getUserIdFromToken } from '@/utils/jwt';
import { Snackbar, Alert, Typography, Box } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: {
    email: string;
  };
}

export interface UserChat {
  id: string;
  email: string;
  role: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversations: UserChat[];
  setConversations: React.Dispatch<React.SetStateAction<UserChat[]>>;
  isConnected: boolean;
  sendMessage: (receiverId: string, content: string) => void;
  lastIncomingMessage: Message | null;
  setLastIncomingMessage: React.Dispatch<React.SetStateAction<Message | null>>;
  activeConversationId: string | null;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastIncomingMessage, setLastIncomingMessage] = useState<Message | null>(null);
  const [conversations, setConversations] = useState<UserChat[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ open: boolean; sender: string; content: string }>({
    open: false,
    sender: '',
    content: ''
  });

  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  
  const myUserId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      return token ? getUserIdFromToken(token) : null;
    }
    return null;
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', []);

  useEffect(() => {
    if (!myUserId) return;

    const socket = io(`${API_BASE}/chat`, {
      auth: { token: localStorage.getItem('authToken'), userId: myUserId },
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('newMessage', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setLastIncomingMessage(message);

      // Notifica se:
      // 1. A mensagem é recebida (não enviada por mim)
      // 2. O remetente não é o usuário com quem estou conversando agora
      if (message.senderId !== myUserId && message.senderId !== activeConversationId) {
        setNotification({
          open: true,
          sender: message.sender.email.split('@')[0],
          content: message.content
        });
      }

      // Atualizar contagem de não lidas e última mensagem nas conversas
      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.senderId
            ? { 
                ...c, 
                lastMessage: message.content, 
                lastMessageDate: message.createdAt,
                unreadCount: c.unreadCount + 1 
              }
            : c
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [myUserId, API_BASE, activeConversationId]); // Re-connect or at least update listener dependency if needed

  const sendMessage = (receiverId: string, content: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('sendMessage', { receiverId, content });
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      setMessages, 
      conversations, 
      setConversations, 
      isConnected, 
      sendMessage,
      lastIncomingMessage,
      setLastIncomingMessage,
      activeConversationId,
      setActiveConversationId
    }}>
      {children}

      {/* Notificação Global */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity="info" 
          variant="filled"
          sx={{ 
            width: '100%', 
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer'
          }}
          onClick={() => {
            router.push('/chat');
            setNotification(prev => ({ ...prev, open: false }));
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Nova mensagem de {notification.sender}
            </Typography>
            <Typography variant="body2" sx={{ 
              maxWidth: 250, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {notification.content}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
