import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, AppState } from 'react-native';
import { FAB, Searchbar, Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import ConversationItem from '../src/components/ConversationItem';
import PermissionRequest from '../src/components/PermissionRequest';
import DefaultSmsAppBanner from '../src/components/DefaultSmsAppBanner';
import { Conversation } from '../src/types';
import { COLORS } from '../src/config/constants';
import smsService from '../src/services/smsService';
import socketService from '../src/services/socketService';
import contactsService from '../src/services/contactsService';
import { useSmsListener } from '../src/hooks/useSmsListener';
import usePermissions from '../src/hooks/usePermissions';
import { DeviceEventEmitter } from 'react-native';

export default function InboxScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  const permissions = usePermissions();

  // Remove the old checkPermissions useEffect since usePermissions handles it

  // Handle incoming SMS messages in real-time
  useSmsListener({
    onSmsReceived: useCallback((event: any) => {
      console.log('New SMS received in inbox:', event.phoneNumber);
      // Reload conversations to show new message
      loadConversations();
    }, []),
  });

  // Refresh conversations when screen comes into focus
  // This ensures unread badges update after marking messages as read in chat
  useFocusEffect(
    useCallback(() => {
      if (permissions.hasSmsPermissions) {
        console.log('[Inbox] Screen focused, refreshing conversations to update badges...');
        // Small delay to ensure any mark-as-read operations are complete
        setTimeout(() => {
          loadConversations();
        }, 200);
      }
    }, [permissions.hasSmsPermissions])
  );

  // Listen for app state changes to detect when returning from Google Messages
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && permissions.hasSmsPermissions) {
        console.log('[Inbox] App became active, refreshing conversations to sync with Google Messages...');
        // Longer delay to ensure Google Messages has updated the SMS database
        setTimeout(() => {
          loadConversations();
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [permissions.hasSmsPermissions]);

  // Periodic refresh to sync with Google Messages changes
  useEffect(() => {
    if (!permissions.hasSmsPermissions) return;

    const interval = setInterval(() => {
      console.log('[Inbox] Periodic refresh to sync with Google Messages...');
      loadConversations();
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [permissions.hasSmsPermissions]);

  useEffect(() => {
    if (permissions.hasSmsPermissions) {
      loadConversations();
      
      // Load contacts in background
      contactsService.loadContacts().catch(err => 
        console.log('Could not load contacts:', err)
      );
    }

    return () => {
      // No-op
    };
  }, [permissions.hasSmsPermissions]);

  useEffect(() => {
    filterConversations();
  }, [searchQuery, conversations]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('conversation:read', (evt: { phoneNumber: string }) => {
      console.log('[Inbox] conversation:read event for', evt?.phoneNumber);
      loadConversations();
    });

    const softSub = DeviceEventEmitter.addListener('conversation:softRead', (evt: { phoneNumber: string }) => {
      console.log('[Inbox] conversation:softRead for', evt?.phoneNumber);
      // Update UI counts in-place without forcing DB reload (fallback when not default SMS app)
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.phoneNumber === evt.phoneNumber) {
            console.log(`[Inbox] Clearing unread count for ${c.phoneNumber}: ${c.unreadCount} -> 0`);
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
        return updated;
      });
      setFilteredConversations(prev => prev.map(c => c.phoneNumber === evt.phoneNumber ? { ...c, unreadCount: 0 } : c));
    });

    // Respond to server request:sync to push fresh state
    const onRequestSync = async () => {
      console.log('[Inbox] request:sync received - syncing conversations');
      await syncToWeb();
    };
    socketService.on('request:sync', onRequestSync);

    return () => {
      sub.remove();
      softSub.remove();
      socketService.off('request:sync', onRequestSync);
    };
  }, []);

  const handleRetryPermissions = async () => {
    await permissions.requestSmsPermissions();
  };

  const handleSetDefaultSmsApp = async () => {
    await permissions.requestDefaultSmsApp();
  };

  const handleDismissBanner = () => {
    setBannerDismissed(true);
  };



  const loadConversations = async () => {
    try {
      console.log('[Inbox] Loading conversations...');
      setIsLoading(true);
      const convs = await smsService.getConversations();
      console.log(`[Inbox] Loaded ${convs.length} conversations`);
      
      // Log unread counts for debugging
      const unreadConvs = convs.filter(c => c.unreadCount > 0);
      console.log(`[Inbox] ${unreadConvs.length} conversations with unread messages:`);
      unreadConvs.forEach(c => {
        console.log(`  - ${c.phoneNumber}: ${c.unreadCount} unread`);
      });
      
      setConversations(convs);
      
      // Sync to web if connected
      if (socketService.connected) {
        socketService.syncConversations(convs);
      }
    } catch (error) {
      console.error('[Inbox] Error loading conversations:', error);
      // Check if it's a permission error
      if (error instanceof Error && error.message.includes('permission')) {
        permissions.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const handleSyncWithGoogleMessages = async () => {
    setIsRefreshing(true);
    try {
      console.log('[Inbox] Manual sync with Google Messages...');
      // Force refresh conversations to sync with Google Messages
      await smsService.forceRefreshConversations();
      await loadConversations();
      console.log('[Inbox] Manual sync completed');
    } catch (error) {
      console.error('Error syncing with Google Messages:', error);
    } finally {
      setIsRefreshing(false);
    }
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

  const syncToWeb = async () => {
    try {
      const convs = await smsService.getConversations();
      socketService.syncConversations(convs);
    } catch (error) {
      console.error('Error syncing to web:', error);
    }
  };

  const handleSendMessage = async (phoneNumber: string, message: string) => {
    try {
      // For web-initiated messages, use default/recommended SIM
      // This will be handled automatically by smsService if subscriptionId is undefined
      await smsService.sendSMS(phoneNumber, message);
      await loadConversations(); // Refresh conversations
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat/${conversation.phoneNumber}`);
  };

  const handleNewMessage = () => {
    router.push('/compose');
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <ConversationItem conversation={item} onPress={handleConversationPress} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>Tap the compose button to start a conversation</Text>
    </View>
  );

  // Show permission request screen if permissions not granted
  if (permissions.needsPermissionSetup) {
    return <PermissionRequest onRetry={handleRetryPermissions} isLoading={permissions.isLoading} />;
  }

  // Show loading while checking permissions or loading conversations
  if (permissions.hasSmsPermissions === null || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {permissions.hasSmsPermissions === null ? 'Checking permissions...' : 'Loading messages...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Default SMS App Banner */}
      {permissions.needsDefaultSmsSetup && !bannerDismissed && (
        <DefaultSmsAppBanner
          onSetDefault={handleSetDefaultSmsApp}
          onDismiss={handleDismissBanner}
          isLoading={permissions.isLoading}
        />
      )}
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search conversations"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={COLORS.textSecondary}
          inputStyle={styles.searchInput}
          elevation={0}
        />
        <IconButton
          icon="refresh"
          size={24}
          iconColor={COLORS.primary}
          onPress={handleRefresh}
          style={styles.refreshButton}
        />
        <IconButton
          icon="sync"
          size={24}
          iconColor={COLORS.accent}
          onPress={handleSyncWithGoogleMessages}
          style={styles.syncButton}
        />
      </View>
      
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleNewMessage}
        color={COLORS.background}
        customSize={56}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 28,
    elevation: 0,
    flex: 1,
    marginRight: 8,
  },
  refreshButton: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 20,
    elevation: 1,
  },
  syncButton: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 20,
    elevation: 1,
  },
  searchInput: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
    elevation: 6,
  },
});
