import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  List,
  Divider,
  Paper,
  Alert,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  Send as SendIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  SignalCellularConnectedNoInternet4Bar as OfflineIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import ConversationItem from '../components/ConversationItem';
import MessageBubble from '../components/MessageBubble';
import { useMessagesStore } from '../store/messagesStore';
import socketService from '../services/socketService';
import { STORAGE_KEYS, COLORS } from '../config/constants';
import { Message, Conversation } from '../types';

const DRAWER_WIDTH = 360;
const MOBILE_DRAWER_WIDTH = 320;

export default function MessagesPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    conversations,
    messages,
    activeConversation,
    setConversations,
    setMessages,
    addMessage,
    updateMessageStatus,
    setActiveConversation,
    markConversationRead,
  } = useMessagesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isMobileConnected, setIsMobileConnected] = useState(true);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    initializeSocket();
    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    filterConversations();
  }, [searchQuery, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeConversation]);

  const initializeSocket = () => {
    const sessionToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    
    if (!sessionToken) {
      navigate('/');
      return;
    }

    socketService.initialize(sessionToken);

    socketService.on('connected', () => {
      setIsConnected(true);
    });

    socketService.on('disconnected', () => {
      setIsConnected(false);
    });

    socketService.on('authenticated', () => {
      console.log('Authenticated, requesting sync...');
    });

    socketService.on('conversations:sync', (data: { conversations: Conversation[] }) => {
      setConversations(data.conversations);
    });

    socketService.on('messages:sync', (data: { messages: Message[] }) => {
      const msgs = data.messages || [];
      if (msgs.length > 0) {
        // Use the conversationId from the payload to avoid stale activeConversation
        const convId = msgs[0].conversationId || msgs[0].phoneNumber;
        if (convId) {
          setMessages(convId, msgs);
          return;
        }
      }
      // Fallback: if payload empty, refresh current conversation messages map
      if (activeConversation) {
        setMessages(activeConversation, msgs);
      }
    });

    socketService.on('message:new', (message: Message) => {
      addMessage(message);
    });

    socketService.on('message:status', (data: { messageId: string; status: string }) => {
      updateMessageStatus(data.messageId, data.status);
    });

    socketService.on('mobile:disconnected', () => {
      setIsMobileConnected(false);
    });

    socketService.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
    });
  };

  const filterConversations = () => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(
      (conv) =>
        conv.phoneNumber.toLowerCase().includes(query) ||
        conv.contactName?.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
    );
    setFilteredConversations(filtered);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation.id);

    // Optimistically clear unread badge in the list
    markConversationRead(conversation.id);
    
    // Tell mobile to mark as read in the SMS DB
    socketService.markAsRead(conversation.id);
    
    // Optionally request a sync
    socketService.requestSync();
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeConversation) return;

    const tempId = `temp_${Date.now()}`;
    const phoneNumber = activeConversation;

    // Add optimistic message
    const tempMessage: Message = {
      id: tempId,
      conversationId: phoneNumber,
      phoneNumber,
      body: messageText.trim(),
      timestamp: Date.now(),
      type: 'sent',
      status: 'sending',
      read: true,
    };

    addMessage(tempMessage);
    socketService.sendMessage(phoneNumber, messageText.trim(), tempId);
    setMessageText('');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    socketService.disconnect();
    navigate('/');
  };

  const handleRefresh = () => {
    socketService.requestSync();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeConversationData = conversations.find(c => c.id === activeConversation);
  const activeMessages = activeConversation ? messages.get(activeConversation) || [] : [];

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: COLORS.backgroundGray }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: { xs: MOBILE_DRAWER_WIDTH, sm: DRAWER_WIDTH },
          flexShrink: 0,
          display: { xs: activeConversation ? 'none' : 'block', md: 'block' },
          '& .MuiDrawer-paper': {
            width: { xs: MOBILE_DRAWER_WIDTH, sm: DRAWER_WIDTH },
            boxSizing: 'border-box',
            backgroundColor: COLORS.background,
            borderRight: `1px solid ${COLORS.border}`,
            position: { xs: 'relative', md: 'fixed' },
          },
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            backgroundColor: COLORS.primary,
            color: 'white',
            px: 2,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 64,
          }}
        >
          <Typography variant="h6" fontWeight={500} sx={{ fontSize: '20px' }}>
            Messages
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            <IconButton 
              color="inherit" 
              onClick={handleRefresh} 
              title="Refresh"
              size="small"
              sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
            <IconButton 
              color="inherit" 
              onClick={handleLogout} 
              title="Logout"
              size="small"
              sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Search Bar */}
        <Box sx={{ p: 2, backgroundColor: COLORS.background }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: COLORS.surfaceVariant,
                borderRadius: '24px',
                fontSize: '15px',
                '& input': {
                  py: 1.5,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: COLORS.textSecondary, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Connection Status Alerts */}
        {!isConnected && (
          <Alert 
            severity="warning" 
            icon={<OfflineIcon />}
            sx={{ 
              mx: 2, 
              mb: 1,
              fontSize: '13px',
              '& .MuiAlert-message': {
                fontSize: '13px'
              }
            }}
          >
            Connecting to server...
          </Alert>
        )}

        {!isMobileConnected && (
          <Alert 
            severity="error" 
            sx={{ 
              mx: 2, 
              mb: 1,
              fontSize: '13px',
              '& .MuiAlert-message': {
                fontSize: '13px'
              }
            }}
          >
            Phone disconnected
          </Alert>
        )}

        <Divider sx={{ borderColor: COLORS.border }} />

        {/* Conversations List */}
        <List 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            py: 0,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: COLORS.border,
              borderRadius: '3px',
            },
          }}
        >
          {filteredConversations.length === 0 ? (
            <Box 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                color: COLORS.textSecondary 
              }}
            >
              <Typography variant="body2">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </Typography>
              {!searchQuery && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Send a message from your phone to get started
                </Typography>
              )}
            </Box>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversation}
                onSelect={handleConversationSelect}
              />
            ))
          )}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: { xs: activeConversation ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        backgroundColor: COLORS.backgroundGray,
        ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
        width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` }
      }}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <Paper 
              elevation={0}
              sx={{ 
                borderBottom: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.background,
                zIndex: 1
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 64
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  {/* Back button for mobile */}
                  <IconButton
                    onClick={() => setActiveConversation(null)}
                    sx={{ 
                      display: { xs: 'block', md: 'none' },
                      color: COLORS.textSecondary,
                      mr: 1
                    }}
                    size="small"
                  >
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Typography 
                    variant="h6" 
                    fontWeight={500}
                    color={COLORS.textPrimary}
                    sx={{ fontSize: '18px' }}
                  >
                    {activeConversationData?.contactName || activeConversationData?.phoneNumber}
                  </Typography>
                  {/* Online status indicator could go here */}
                </Box>
                <IconButton 
                  size="small"
                  sx={{ color: COLORS.textSecondary }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Paper>

            {/* Messages Area */}
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                backgroundColor: COLORS.backgroundGray,
                py: 1,
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: COLORS.border,
                  borderRadius: '3px',
                },
              }}
            >
              {activeMessages.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  height="100%"
                  gap={2}
                  px={4}
                >
                  <Typography 
                    variant="h6" 
                    color={COLORS.textSecondary}
                    fontWeight={400}
                  >
                    💬
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color={COLORS.textSecondary}
                    textAlign="center"
                  >
                    No messages with {activeConversationData?.contactName || activeConversationData?.phoneNumber} yet
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color={COLORS.textTertiary}
                    textAlign="center"
                  >
                    Send a message to start the conversation
                  </Typography>
                </Box>
              ) : (
                <>
                  {activeMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </Box>

            {/* Input Area */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 2,
                borderTop: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.background,
                borderRadius: 0
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Text message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '24px',
                      backgroundColor: COLORS.surfaceVariant,
                      fontSize: '15px',
                      '& input': {
                        py: 1.5,
                      },
                      '& textarea': {
                        py: 1.5,
                      },
                      '& fieldset': {
                        borderColor: 'transparent',
                      },
                      '&:hover fieldset': {
                        borderColor: COLORS.border,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: COLORS.primary,
                        borderWidth: '2px',
                      },
                    },
                  }}
                />
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  sx={{
                    backgroundColor: messageText.trim() ? COLORS.primary : COLORS.surfaceVariant,
                    color: messageText.trim() ? 'white' : COLORS.textSecondary,
                    width: 48,
                    height: 48,
                    '&:hover': {
                      backgroundColor: messageText.trim() ? COLORS.primaryDark : COLORS.surfaceVariant,
                    },
                    '&.Mui-disabled': {
                      backgroundColor: COLORS.surfaceVariant,
                      color: COLORS.textSecondary,
                    },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          </>
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
            gap={3}
            px={4}
            sx={{ backgroundColor: COLORS.background }}
          >
            <Typography 
              variant="h5" 
              color={COLORS.textSecondary}
              fontWeight={400}
              sx={{ fontSize: '28px' }}
            >
              💬
            </Typography>
            <Box textAlign="center">
              <Typography 
                variant="h6" 
                color={COLORS.textPrimary}
                fontWeight={400}
                mb={1}
              >
                Select a conversation to start messaging
              </Typography>
              {conversations.length === 0 && (
                <Typography variant="body2" color={COLORS.textSecondary}>
                  Send a message from your phone to get started
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
