import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../src/config/constants';
import { getDeviceInfo } from '../src/utils/deviceUtils';
import socketService from '../src/services/socketService';
import smsService from '../src/services/smsService';
import dualSimService from '../src/services/dualSimService';

// Custom theme matching Google Messages
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryDark,
    secondary: COLORS.accent,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
  },
};

export default function RootLayout() {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Request SMS permissions
      const hasPermissions = await smsService.requestPermissions();
      
      if (hasPermissions) {
        console.log('✅ SMS permissions granted');
        
        // Initialize dual SIM service
        await dualSimService.initialize();
        const simCards = dualSimService.getSimCards();
        if (simCards.length > 1) {
          console.log(`✅ Dual SIM detected: ${simCards.length} SIM cards`);
        } else if (simCards.length === 1) {
          console.log('✅ Single SIM detected');
        }
      } else {
        console.warn('⚠️ SMS permissions denied');
      }

      // Initialize socket connection
      const deviceInfo = await getDeviceInfo();
      socketService.initialize(deviceInfo);

      // Global socket listeners (active regardless of current screen)
      socketService.on('send:message', async (data: { phoneNumber: string; message: string; tempId?: string }) => {
        try {
          console.log('[Root] Web requested send to', data.phoneNumber);
          await smsService.sendSMS(data.phoneNumber, data.message);
        } catch (e) {
          console.error('[Root] Failed to send web-initiated message:', e);
        }
      });

      socketService.on('request:sync', async () => {
        try {
          console.log('[Root] Web requested sync');
          const convs = await smsService.getConversations();
          socketService.syncConversations(convs);
        } catch (e) {
          console.error('[Root] Failed to sync conversations:', e);
        }
      });

      socketService.on('mark:read', async (data: { conversationId: string }) => {
        try {
          console.log('[Root] Web requested mark as read for', data.conversationId);
          await smsService.markAsRead(data.conversationId);
          // After marking, push fresh conversations to web
          try {
            const convs = await smsService.getConversations();
            socketService.syncConversations(convs);
          } catch (syncErr) {
            console.error('[Root] Failed to sync conversations after mark-as-read:', syncErr);
          }
        } catch (e) {
          console.error('[Root] Failed to mark as read:', e);
        }
      });
      
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '500',
            fontSize: 20,
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Messages',
            headerShown: true,
            headerShadowVisible: true,
          }} 
        />
        <Stack.Screen 
          name="chat/[id]" 
          options={{ 
            title: '',
            headerShown: true,
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="compose" 
          options={{ 
            title: 'New message',
            headerShown: true,
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings',
            presentation: 'modal',
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.textPrimary,
          }} 
        />
      </Stack>
    </PaperProvider>
  );
}
