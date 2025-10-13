import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { Conversation } from '../types';
import { formatConversationTime } from '../utils/dateUtils';
import { COLORS } from '../config/constants';
import contactsService from '../services/contactsService';

interface Props {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

export default function ConversationItem({ conversation, onPress }: Props) {
  const { phoneNumber, contactName, lastMessage, lastMessageTime, unreadCount } = conversation;
  const [displayName, setDisplayName] = useState(contactName || phoneNumber);
  const [contactPhoto, setContactPhoto] = useState<string | null>(null);
  
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

  return (
    <TouchableOpacity 
      style={[styles.container, unreadCount > 0 && styles.unreadContainer]} 
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
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
        <View style={styles.unreadDot} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    minHeight: 72,
  },
  unreadContainer: {
    backgroundColor: COLORS.backgroundGray,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    flex: 1,
    letterSpacing: 0.1,
  },
  unreadName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 12,
    fontWeight: '400',
  },
  unreadTime: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  unreadMessage: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
});
