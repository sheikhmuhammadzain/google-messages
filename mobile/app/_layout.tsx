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
