'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useChat, Message, UserChat } from '@/hooks/useChat';
import { getUserIdFromToken, getRoleFromToken } from '@/utils/jwt';
import { 
  Send, 
  User as UserIcon, 
  Search, 
  MoreVertical, 
  MessageSquare,
  Circle,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Avatar, 
  Divider, 
  Paper,
  InputAdornment,
  CircularProgress,
  Badge,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChatPage() {
  const [token, setToken] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserChat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ open: boolean; sender: string; content: string }>({
    open: false,
    sender: '',
    content: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    setMessages, 
    conversations, 
    setConversations, 
    isConnected, 
    sendMessage,
    lastIncomingMessage,
    setLastIncomingMessage
  } = useChat(myUserId);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', []);

  useEffect(() => {
    const t = localStorage.getItem('authToken');
    if (t) {
      setToken(t);
      setMyUserId(getUserIdFromToken(t));
      
      const role = getRoleFromToken(t);
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        window.location.href = '/inicio';
      }
    } else {
      window.location.href = '/';
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE, setConversations]);

  const fetchHistory = useCallback(async (otherUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/chat/history/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // Zera contagem de não lidas localmente
        setConversations(prev => 
          prev.map(c => c.id === otherUserId ? { ...c, unreadCount: 0 } : c)
        );
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [token, API_BASE, setMessages, setConversations]);

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token, fetchConversations]);

  useEffect(() => {
    if (selectedUser) {
      fetchHistory(selectedUser.id);
    } else {
      setMessages([]);
    }
  }, [selectedUser, fetchHistory, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sistema de Notificação
  useEffect(() => {
    if (lastIncomingMessage) {
      // Notifica apenas se o chat não estiver aberto com o remetente
      if (selectedUser?.id !== lastIncomingMessage.senderId) {
        setNotification({
          open: true,
          sender: lastIncomingMessage.sender.email.split('@')[0],
          content: lastIncomingMessage.content
        });
      }
      // Limpa para não repetir a mesma notificação
      setLastIncomingMessage(null);
    }
  }, [lastIncomingMessage, selectedUser, setLastIncomingMessage]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedUser || !newMessage.trim()) return;
    sendMessage(selectedUser.id, newMessage);
    setNewMessage('');
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  return (
    <DashboardLayout subtitle="Comunicação Interna">
      <Box sx={{ 
        display: 'flex', 
        height: 'calc(100vh - 120px)', 
        m: 2, 
        backgroundColor: '#fff', 
        borderRadius: 4, 
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        border: '1px solid #eee'
      }}>
        {/* Sidebar - Conversas */}
        <Box sx={{ 
          width: { xs: '100%', md: 350 }, 
          borderRight: '1px solid #eee',
          display: { xs: selectedUser ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          backgroundColor: '#f9f9f9'
        }}>
          <Box sx={{ p: 2, backgroundColor: '#fff' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 1 }}>
              <MessageSquare size={20} className="text-blue-600" />
              Mensagens
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar usuários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} className="text-gray-400" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, backgroundColor: '#f5f5f5' }
              }}
            />
          </Box>
          
          <Divider />
          
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filteredConversations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Nenhuma conversa encontrada</Typography>
              </Box>
            ) : (
              filteredConversations.map((user) => (
                <Box
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: selectedUser?.id === user.id ? '#e3f2fd' : 'transparent',
                    borderLeft: selectedUser?.id === user.id ? '4px solid #1976d2' : '4px solid transparent',
                    '&:hover': { backgroundColor: selectedUser?.id === user.id ? '#e3f2fd' : '#f0f0f0' }
                  }}
                >
                  <Badge 
                    color="error" 
                    badgeContent={user.unreadCount}
                    invisible={user.unreadCount === 0}
                  >
                    <Avatar sx={{ bgcolor: user.role === 'ADMIN' ? '#d32f2f' : '#1976d2' }}>
                      {user.email[0].toUpperCase()}
                    </Avatar>
                  </Badge>
                  <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                      {user.email.split('@')[0]}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                      {user.role}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Janela de Chat */}
        <Box sx={{ 
          flex: 1, 
          display: { xs: selectedUser ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          backgroundColor: '#fff'
        }}>
          {selectedUser ? (
            <>
              {/* Header do Chat */}
              <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid #eee', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                backgroundColor: '#fff'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton 
                    sx={{ display: { md: 'none' } }} 
                    onClick={() => setSelectedUser(null)}
                  >
                    <UserIcon size={20} />
                  </IconButton>
                  <Avatar sx={{ bgcolor: selectedUser.role === 'ADMIN' ? '#d32f2f' : '#1976d2' }}>
                    {selectedUser.email[0].toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {selectedUser.email.split('@')[0]}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Circle size={8} fill={isConnected ? "#4caf50" : "#f44336"} color={isConnected ? "#4caf50" : "#f44336"} />
                      <Typography variant="caption" color="textSecondary">
                        {isConnected ? 'Online' : 'Conectando...'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <IconButton>
                  <MoreVertical size={20} />
                </IconButton>
              </Box>

              {/* Área de Mensagens */}
              <Box sx={{ 
                flex: 1, 
                p: 3, 
                overflowY: 'auto', 
                backgroundColor: '#f0f2f5',
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                {messages.map((msg, index) => {
                  const isMine = msg.senderId === myUserId;
                  return (
                    <Box 
                      key={msg.id || index}
                      sx={{ 
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Paper sx={{ 
                        p: 1.5, 
                        borderRadius: isMine ? '15px 15px 0 15px' : '15px 15px 15px 0',
                        backgroundColor: isMine ? '#005c4b' : '#fff',
                        color: isMine ? '#fff' : '#1a1a1a',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                          {msg.content}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'flex-end', 
                          gap: 0.5, 
                          mt: 0.5 
                        }}>
                          <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                            {format(new Date(msg.createdAt), 'HH:mm', { locale: ptBR })}
                          </Typography>
                          {isMine && (
                            <CheckCheck size={14} className="opacity-70" />
                          )}
                        </Box>
                      </Paper>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input de Mensagem */}
              <Box 
                component="form" 
                onSubmit={handleSend}
                sx={{ 
                  p: 2, 
                  backgroundColor: '#f0f2f5', 
                  borderTop: '1px solid #eee' 
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  backgroundColor: '#fff',
                  borderRadius: 6,
                  p: '4px 12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <TextField
                    fullWidth
                    placeholder="Digite sua mensagem..."
                    variant="standard"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    InputProps={{ 
                      disableUnderline: true,
                      sx: { py: 1 }
                    }}
                  />
                  <IconButton 
                    type="submit" 
                    color="primary"
                    disabled={!newMessage.trim()}
                    sx={{ 
                      backgroundColor: newMessage.trim() ? '#1976d2' : 'transparent',
                      color: newMessage.trim() ? '#fff' : 'inherit',
                      '&:hover': { backgroundColor: newMessage.trim() ? '#1565c0' : 'transparent' }
                    }}
                  >
                    <Send size={20} />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <Box sx={{ 
                width: 100, 
                height: 100, 
                borderRadius: '50%', 
                backgroundColor: '#e3f2fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3
              }}>
                <MessageSquare size={48} className="text-blue-500" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a', mb: 1 }}>
                Seu Chat Interno
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', maxWidth: 300 }}>
                Selecione um usuário na lista ao lado para começar a conversar.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>

      {/* Pop-up de Notificação */}
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
            // Ao clicar na notificação, abre a conversa (opcional)
            const sender = conversations.find(c => c.email.startsWith(notification.sender));
            if (sender) setSelectedUser(sender);
            setNotification(prev => ({ ...prev, open: false }));
          }}
        >
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
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
