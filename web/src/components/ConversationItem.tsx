import {
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { Conversation } from '../types';
import { formatConversationTime } from '../utils/dateUtils';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { COLORS } from '../config/constants';

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationItem({ conversation, isActive, onSelect }: Props) {
  const { phoneNumber, contactName, lastMessage, lastMessageTime, unreadCount } = conversation;
  
  const displayName = contactName || phoneNumber;
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isUnread = unreadCount > 0;

  return (
    <ListItem 
      disablePadding 
      sx={{
        backgroundColor: isUnread ? COLORS.backgroundGray : 'transparent',
        borderRadius: 0,
        '&:hover': {
          backgroundColor: isUnread ? COLORS.backgroundGray : COLORS.hover,
        },
      }}
    >
      <ListItemButton
        selected={isActive}
        onClick={() => onSelect(conversation)}
        sx={{
          minHeight: 72,
          py: 1.5,
          px: 2,
          '&.Mui-selected': {
            backgroundColor: COLORS.selected,
            '&:hover': {
              backgroundColor: COLORS.selected,
            },
          },
          '&:hover': {
            backgroundColor: isActive ? COLORS.selected : (isUnread ? COLORS.backgroundGray : COLORS.hover),
          },
        }}
      >
        <ListItemAvatar sx={{ minWidth: 56 }}>
          <Avatar 
            sx={{ 
              bgcolor: avatarColor, 
              width: 40, 
              height: 40,
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {initials}
          </Avatar>
        </ListItemAvatar>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Header row with name and timestamp */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography 
              variant="body1" 
              fontWeight={isUnread ? 600 : 400}
              color={COLORS.textPrimary}
              noWrap
              sx={{ 
                fontSize: '16px',
                flex: 1,
                mr: 1
              }}
            >
              {displayName}
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography 
                variant="caption" 
                color={isUnread ? COLORS.textPrimary : COLORS.textSecondary}
                fontWeight={isUnread ? 500 : 400}
                sx={{ fontSize: '12px' }}
              >
                {formatConversationTime(lastMessageTime)}
              </Typography>
              {isUnread && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: COLORS.unreadIndicator,
                    ml: 0.5
                  }}
                />
              )}
            </Box>
          </Box>
          
          {/* Message preview row */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="body2"
              color={isUnread ? COLORS.textPrimary : COLORS.textSecondary}
              fontWeight={isUnread ? 500 : 400}
              noWrap
              sx={{ 
                fontSize: '14px',
                flex: 1,
                mr: 1,
                // Show up to 2 lines on larger screens
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {lastMessage}
            </Typography>
            {isUnread && unreadCount > 1 && (
              <Chip
                label={unreadCount > 99 ? '99+' : unreadCount}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: COLORS.unreadIndicator,
                  color: 'white',
                  '& .MuiChip-label': {
                    px: 1,
                  }
                }}
              />
            )}
          </Box>
        </Box>
      </ListItemButton>
    </ListItem>
  );
}
