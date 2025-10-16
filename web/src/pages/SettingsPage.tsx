import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Stack,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Notifications as NotificationsIcon,
  Keyboard as KeyboardIcon,
  Palette as PaletteIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../hooks/useNotifications';
import { formatShortcut } from '../hooks/useKeyboardShortcuts';
import { COLORS } from '../config/constants';

const KEYBOARD_SHORTCUTS = [
  { key: 'Enter', ctrl: true, description: 'Send message' },
  { key: 'k', ctrl: true, description: 'Search conversations' },
  { key: 'Escape', ctrl: false, description: 'Close conversation' },
  { key: 'n', ctrl: true, description: 'New message' },
  { key: '/', ctrl: false, description: 'Focus search' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { permission, isSupported, requestPermission } = useNotifications();

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return; // Don't enable if permission denied
      }
    }
    updateSettings({ notifications: { ...settings.notifications, enabled } });
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.backgroundGray, pb: 4 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', py: 2, gap: 2 }}>
            <IconButton onClick={() => navigate('/messages')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" fontWeight={500}>
              Settings
            </Typography>
          </Box>
        </Container>
      </Container>

      <Container maxWidth="md" sx={{ mt: 3 }}>
        <Stack spacing={3}>
          {/* Notifications Section */}
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${COLORS.border}` }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <NotificationsIcon sx={{ color: COLORS.primary }} />
              <Typography variant="h6" fontWeight={500}>
                Notifications
              </Typography>
            </Stack>

            {!isSupported && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Notifications are not supported in this browser
              </Alert>
            )}

            {isSupported && permission === 'denied' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Notification permission denied. Please enable in browser settings.
              </Alert>
            )}

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.enabled}
                    onChange={(e) => handleNotificationToggle(e.target.checked)}
                    disabled={!isSupported}
                  />
                }
                label="Enable notifications"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.desktop}
                    onChange={(e) =>
                      updateSettings({
                        notifications: { ...settings.notifications, desktop: e.target.checked },
                      })
                    }
                    disabled={!settings.notifications.enabled}
                  />
                }
                label="Desktop notifications"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.sound}
                    onChange={(e) =>
                      updateSettings({
                        notifications: { ...settings.notifications, sound: e.target.checked },
                      })
                    }
                    disabled={!settings.notifications.enabled}
                  />
                }
                label="Notification sound"
              />

              {permission === 'default' && isSupported && (
                <Button variant="outlined" onClick={requestPermission} sx={{ alignSelf: 'flex-start' }}>
                  Request Permission
                </Button>
              )}
            </Stack>
          </Paper>

          {/* Keyboard Shortcuts Section */}
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${COLORS.border}` }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <KeyboardIcon sx={{ color: COLORS.primary }} />
              <Typography variant="h6" fontWeight={500}>
                Keyboard Shortcuts
              </Typography>
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.keyboardShortcuts.enabled}
                  onChange={(e) =>
                    updateSettings({
                      keyboardShortcuts: { ...settings.keyboardShortcuts, enabled: e.target.checked },
                    })
                  }
                />
              }
              label="Enable keyboard shortcuts"
              sx={{ mb: 2 }}
            />

            {settings.keyboardShortcuts.enabled && (
              <List dense>
                {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText primary={shortcut.description} />
                    <Chip
                      label={formatShortcut(shortcut)}
                      size="small"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        backgroundColor: COLORS.surfaceVariant,
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          {/* Appearance Section */}
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${COLORS.border}` }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <PaletteIcon sx={{ color: COLORS.primary }} />
              <Typography variant="h6" fontWeight={500}>
                Appearance
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.ui.showTimestamps}
                    onChange={(e) =>
                      updateSettings({ ui: { ...settings.ui, showTimestamps: e.target.checked } })
                    }
                  />
                }
                label="Show message timestamps on hover"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.ui.compactMode}
                    onChange={(e) =>
                      updateSettings({ ui: { ...settings.ui, compactMode: e.target.checked } })
                    }
                  />
                }
                label="Compact mode"
              />

              <Alert severity="info" icon={<InfoIcon />}>
                Dark mode coming soon!
              </Alert>
            </Stack>
          </Paper>

          {/* About Section */}
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${COLORS.border}` }}>
            <Typography variant="h6" fontWeight={500} mb={2}>
              About
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Messages for Web - Send SMS from your computer
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Version: 1.0.0
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Button variant="outlined" color="error" onClick={resetSettings}>
              Reset All Settings
            </Button>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
