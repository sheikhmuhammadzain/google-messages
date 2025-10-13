import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { FAB, Searchbar, Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import ConversationItem from '../src/components/ConversationItem';
import PermissionRequest from '../src/components/PermissionRequest';
import { Conversation } from '../src/types';
import { COLORS } from '../src/config/constants';
import smsService from '../src/services/smsService';
import socketService from '../src/services/socketService';
import contactsService from '../src/services/contactsService';
import { useSmsListener } from '../src/hooks/useSmsListener';

export default function InboxScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  // Handle incoming SMS messages in real-time
  useSmsListener({
    onSmsReceived: useCallback((event) => {
      console.log('New SMS received in inbox:', event.phoneNumber);
      // Reload conversations to show new message
      loadConversations();
    }, []),
  });

  // Refresh conversations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (hasPermissions) {
        console.log('Inbox screen focused, refreshing conversations...');
        loadConversations();
      }
    }, [hasPermissions])
  );

  useEffect(() => {
    if (hasPermissions) {
      loadConversations();
      setupSocketListeners();
      
      // Load contacts in background
      contactsService.loadContacts().catch(err => 
        console.log('Could not load contacts:', err)
      );
    }

    return () => {
      // Cleanup socket listeners
    };
  }, [hasPermissions]);

  useEffect(() => {
    filterConversations();
  }, [searchQuery, conversations]);

  const checkPermissions = async () => {
    try {
      const hasPerms = await smsService.hasPermissions();
      setHasPermissions(hasPerms);
      
      if (!hasPerms) {
        // Try to request permissions
        const granted = await smsService.requestPermissions();
        setHasPermissions(granted);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermissions(false);
    }
  };

  const handleRetryPermissions = async () => {
    await checkPermissions();
  };

  const setupSocketListeners = () => {
    socketService.on('request:sync', () => {
      console.log('Sync requested from web');
      syncToWeb();
    });

    socketService.on('send:message', async (data) => {
      const { phoneNumber, message } = data;
      await handleSendMessage(phoneNumber, message);
    });
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
        setHasPermissions(false);
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
  if (hasPermissions === false) {
    return <PermissionRequest onRetry={handleRetryPermissions} />;
  }

  // Show loading while checking permissions or loading conversations
  if (hasPermissions === null || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {hasPermissions === null ? 'Checking permissions...' : 'Loading messages...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
  },
  searchbar: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 28,
    elevation: 0,
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
