import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Image, Animated, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Conversation } from '../types';
import { formatConversationTime } from '../utils/dateUtils';
import { COLORS, SPACING, RADIUS, ELEVATION, TYPOGRAPHY } from '../config/constants';
import contactsService from '../services/contactsService';

interface Props {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

export default function ConversationItem({ conversation, onPress }: Props) {
  const { phoneNumber, contactName, lastMessage, lastMessageTime, unreadCount } = conversation;
  const [displayName, setDisplayName] = useState(contactName || phoneNumber);
  const [contactPhoto, setContactPhoto] = useState<string | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  useEffect(() => {
    loadContactInfo();
  }, [phoneNumber]);

  const loadContactInfo = async () => {
    try {
      const name = await contactsService.getContactName(phoneNumber);
      setDisplayName(name);
      
      const photo = await contactsService.getContactPhoto(phoneNumber);
      setContactPhoto(photo);
    } catch (error) {
      console.log('Could not load contact info:', error);
      setDisplayName(contactsService.formatPhoneNumber(phoneNumber));
    }
  };
  
  const initials = displayName
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  // Generate consistent avatar color based on phone number
  const getAvatarColor = (phone: string) => {
    const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLORS.avatarColors[hash % COLORS.avatarColors.length];
  };
  
  const avatarColor = getAvatarColor(phoneNumber);
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        style={[styles.container, unreadCount > 0 && styles.unreadContainer]} 
        onPress={() => onPress(conversation)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{
          color: COLORS.primaryLight,
          borderless: false,
        }}
      >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        {contactPhoto ? (
          <Image source={{ uri: contactPhoto }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text 
            style={[styles.name, unreadCount > 0 && styles.unreadName]} 
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={[styles.time, unreadCount > 0 && styles.unreadTime]}>
            {formatConversationTime(lastMessageTime)}
          </Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text 
            style={[styles.message, unreadCount > 0 && styles.unreadMessage]} 
            numberOfLines={2}
          >
            {lastMessage}
          </Text>
        </View>
      </View>
      
      {unreadCount > 0 && (
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        </View>
      )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    minHeight: 84,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  unreadContainer: {
    backgroundColor: COLORS.primaryContainer,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...ELEVATION.level2,
  },
  avatarText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.titleMedium,
    fontWeight: '600' as any,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '500' as any,
    color: COLORS.textPrimary,
    flex: 1,
    letterSpacing: 0.15,
  },
  unreadName: {
    fontWeight: '600' as any,
    color: COLORS.textPrimary,
  },
  time: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textTertiary,
    marginLeft: SPACING.sm,
  },
  unreadTime: {
    color: COLORS.primary,
    fontWeight: '600' as any,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  unreadMessage: {
    color: COLORS.textPrimary,
    fontWeight: '500' as any,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    marginLeft: SPACING.sm,
    marginTop: SPACING.xs,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.badge,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs + 2,
    ...ELEVATION.level3,
  },
  badgeText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.badgeText,
    fontWeight: '700' as any,
  },
});
