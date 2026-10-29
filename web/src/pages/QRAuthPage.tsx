import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { MessageOutlined } from '@mui/icons-material';
import QRCode from 'qrcode.react';
import apiService from '../services/apiService';
import { STORAGE_KEYS, COLORS } from '../config/constants';

export default function QRAuthPage() {
  const navigate = useNavigate();
  const [qrData, setQrData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isWaitingForPairing, setIsWaitingForPairing] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const sessionToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (sessionToken) {
      verifyAndRedirect(sessionToken);
    } else {
      generateQRCode();
    }
  }, []);

  const verifyAndRedirect = async (sessionToken: string) => {
    const isValid = await apiService.verifySession(sessionToken);
    if (isValid) {
      navigate('/messages');
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
      generateQRCode();
    }
  };

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const qrResult = await apiService.generateQR();
      setQrData(qrResult.qrData);
      
      setIsLoading(false);
      
      // Wait for pairing
      waitForPairing(qrResult.token);
    } catch (err) {
      setError('Failed to generate QR code. Please refresh the page.');
      setIsLoading(false);
    }
  };

  const waitForPairing = async (pairingToken: string) => {
    try {
      setIsWaitingForPairing(true);
      
      // Long-polling request
      const sessionToken = await apiService.waitForPairing(pairingToken);
      
      // Save session token
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
      
      // Redirect to messages
      navigate('/messages');
    } catch (err) {
      setError('Pairing timeout. Please try again.');
      setIsWaitingForPairing(false);
      
      // Generate new QR code
      setTimeout(() => generateQRCode(), 2000);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e8f0fe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="md">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="center"
          justifyContent="center"
        >
          {/* Left side - Branding */}
          <Box
            sx={{
              flex: 1,
              textAlign: { xs: 'center', md: 'left' },
              maxWidth: 400,
            }}
          >
            <Box display="flex" alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }} mb={3}>
              <MessageOutlined 
                sx={{ 
                  fontSize: 48, 
                  color: COLORS.primary,
                  mr: 2 
                }} 
              />
              <Typography 
                variant="h4" 
                fontWeight={600} 
                color={COLORS.textPrimary}
              >
                Messages
              </Typography>
            </Box>
            
            <Typography 
              variant="h5" 
              color={COLORS.textSecondary}
              mb={2}
              fontWeight={400}
            >
              Send messages from your computer
            </Typography>
            
            <Typography 
              variant="body1" 
              color={COLORS.textSecondary}
              mb={4}
            >
              Use Messages on your computer to send SMS, MMS and chat messages. 
              Your phone stays synced with all your conversations.
            </Typography>

            <Typography variant="body2" color={COLORS.textSecondary}>
              <strong>To get started:</strong>
            </Typography>
            <Typography variant="body2" color={COLORS.textSecondary} component="div">
              <Box component="ol" sx={{ pl: 2, m: 0 }}>
                <li>Open Messages on your Android phone</li>
                <li>Tap Settings → "Messages for web"</li>
                <li>Use your phone to scan the QR code</li>
              </Box>
            </Typography>
          </Box>

          {/* Right side - QR Code */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 4, 
                textAlign: 'center',
                backgroundColor: 'white',
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                maxWidth: 400,
                width: '100%'
              }}
            >
              <Typography 
                variant="h6" 
                fontWeight={500}
                color={COLORS.textPrimary}
                mb={2}
              >
                Scan to connect
              </Typography>

              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    textAlign: 'left',
                    '& .MuiAlert-message': {
                      fontSize: '14px'
                    }
                  }}
                >
                  {error}
                </Alert>
              )}

              {isLoading ? (
                <Box 
                  display="flex" 
                  flexDirection="column"
                  alignItems="center"
                  py={6}
                >
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body2" color={COLORS.textSecondary}>
                    Generating QR code...
                  </Typography>
                </Box>
              ) : (
                <Stack alignItems="center" spacing={3}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      backgroundColor: '#FFFFFF',
                      borderColor: isWaitingForPairing ? COLORS.primary : COLORS.border,
                      borderWidth: isWaitingForPairing ? 2 : 1,
                      borderRadius: 2,
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <QRCode 
                      value={qrData} 
                      size={Math.min(220, window.innerWidth - 120)} 
                      level="H"
                      fgColor={COLORS.textPrimary}
                      includeMargin
                    />
                  </Paper>

                  {isWaitingForPairing && (
                    <Stack 
                      direction="row" 
                      alignItems="center" 
                      spacing={1}
                      sx={{
                        color: COLORS.primary,
                        backgroundColor: COLORS.primaryLight,
                        px: 3,
                        py: 1,
                        borderRadius: 3,
                      }}
                    >
                      <CircularProgress size={16} color="inherit" />
                      <Typography variant="body2" fontWeight={500}>
                        Waiting for scan...
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
