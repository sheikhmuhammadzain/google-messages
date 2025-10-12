import { Box, Paper, Typography } from '@mui/material';
import { Message } from '../types';
import { formatChatTime } from '../utils/dateUtils';
import { COLORS } from '../config/constants';

interface Props {
  message: Message;
  showTimestamp?: boolean;
}

export default function MessageBubble({ message, showTimestamp = true }: Props) {
  const isSent = message.type === 'sent';

  return (
    <Box
      display="flex"
      justifyContent={isSent ? 'flex-end' : 'flex-start'}
      mb={0.25}
      px={3}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: '65%',
          minWidth: '48px',
          px: 1.5,
          py: 1,
          borderRadius: '18px',
          backgroundColor: isSent ? COLORS.sentBubble : COLORS.receivedBubble,
          color: isSent ? COLORS.sentText : COLORS.receivedText,
          // Subtle corner cutoffs for Google Messages style
          borderBottomRightRadius: isSent ? '2px' : '18px',
          borderBottomLeftRadius: !isSent ? '2px' : '18px',
          // Subtle shadow for depth
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          // Remove default Paper styles
          backgroundImage: 'none',
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            wordBreak: 'break-word', 
            lineHeight: 1.4,
            fontSize: '15px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.body}
        </Typography>
        
        {showTimestamp && (
          <Box 
            display="flex" 
            justifyContent="flex-end" 
            alignItems="center" 
            mt={0.25}
            gap={0.5}
          >
            <Typography
              variant="caption"
              sx={{
                opacity: isSent ? 0.7 : 0.6,
                fontSize: '11px',
                color: 'inherit',
                lineHeight: 1,
              }}
            >
              {formatChatTime(message.timestamp)}
            </Typography>
            
            {isSent && message.status && (
              <Typography
                variant="caption"
                sx={{ 
                  opacity: 0.7, 
                  fontSize: '11px',
                  color: 'inherit',
                  lineHeight: 1,
                }}
              >
                {message.status === 'sending' && '⏳'}
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'failed' && '✗'}
              </Typography>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
