import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text, ActivityIndicator, IconButton, Divider, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import SimSelector from '../src/components/SimSelector';
import SimIndicator from '../src/components/SimIndicator';
import { SimCard } from '../src/types';
import { COLORS } from '../src/config/constants';
import smsService from '../src/services/smsService';
import contactsService, { Contact as ContactType } from '../src/services/contactsService';
import dualSimService from '../src/services/dualSimService';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  photo?: string;
}

export default function ComposeScreen() {
  const router = useRouter();
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSim, setSelectedSim] = useState<SimCard | null>(null);
  const [showSimSelector, setShowSimSelector] = useState(false);
  const [isDualSim, setIsDualSim] = useState(false);

  useEffect(() => {
    loadContacts();
    loadSimInfo();
  }, []);

  useEffect(() => {
    filterContacts();
    updateSimRecommendation();
  }, [recipient]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      // Load all contacts from device
      const deviceContacts = await contactsService.getAllContacts();
      const contactList: Contact[] = deviceContacts
        .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
        .map((contact) => ({
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phoneNumbers[0], // Use first phone number
          photo: contact.photo,
        }));
      
      // Sort by name
      contactList.sort((a, b) => a.name.localeCompare(b.name));
      
      setContacts(contactList);
      console.log(`Loaded ${contactList.length} contacts for compose`);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSimInfo = async () => {
    try {
      // Check if device has dual SIM
      const hasDualSim = dualSimService.isDualSimDevice();
      setIsDualSim(hasDualSim);
      
      // Get default SIM
      const defaultSim = dualSimService.getDefaultSimCard();
      setSelectedSim(defaultSim);
      console.log('Loaded SIM for compose - dual SIM:', hasDualSim, 'selected:', defaultSim?.displayName);
    } catch (error) {
      console.error('Error loading SIM info:', error);
      // Don't use dual SIM if there's an error
      setIsDualSim(false);
      setSelectedSim(null);
    }
  };

  const updateSimRecommendation = async () => {
    if (!isDualSim || !recipient.trim()) return;
    
    try {
      // Check if recipient is a valid phone number
      const isPhoneNumber = /^[0-9+\-\s()]+$/.test(recipient);
      if (isPhoneNumber && recipient.length > 5) {
        const recommendedSim = await dualSimService.getRecommendedSimForContact(recipient);
        if (recommendedSim) {
          setSelectedSim(recommendedSim);
        }
      }
    } catch (error) {
      console.log('Error updating SIM recommendation:', error);
    }
  };

  const filterContacts = () => {
    if (!recipient.trim() || contacts.length === 0) {
      setFilteredContacts([]);
      setShowSuggestions(false);
      return;
    }

    const query = recipient.toLowerCase().trim();
    
    // Filter contacts by name or phone number
    const filtered = contacts.filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(query);
      const phoneMatch = contact.phoneNumber.replace(/[\s-()]/g, '').includes(query.replace(/[\s-()]/g, ''));
      return nameMatch || phoneMatch;
    });
    
    // Sort: exact matches first, then starts with, then contains
    const sorted = filtered.sort((a, b) => {
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      
      // Exact match
      if (aNameLower === query) return -1;
      if (bNameLower === query) return 1;
      
      // Starts with
      const aStarts = aNameLower.startsWith(query);
      const bStarts = bNameLower.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Alphabetical
      return aNameLower.localeCompare(bNameLower);
    });
    
    setFilteredContacts(sorted.slice(0, 8)); // Show up to 8 suggestions
    setShowSuggestions(sorted.length > 0 && recipient.length > 0);
    
    console.log(`[Compose] Filtered ${sorted.length} contacts for query: "${query}"`);
  };

  const handleContactSelect = (contact: Contact) => {
    setRecipient(contact.phoneNumber);
    setShowSuggestions(false);
    setFilteredContacts([]);
  };

  const handleOpenContactPicker = () => {
    // Show all contacts as suggestions
    setFilteredContacts(contacts.slice(0, 50));
    setShowSuggestions(true);
  };

  const handleSend = async () => {
    if (!recipient.trim() || !message.trim() || isSending) return;

    try {
      setIsSending(true);
      
      // Check permissions first
      const hasPerms = await smsService.hasPermissions();
      if (!hasPerms) {
        const granted = await smsService.requestPermissions();
        if (!granted) {
          alert('SMS permissions are required to send messages. Please enable them in Settings.');
          setIsSending(false);
          return;
        }
      }
      
      // Send SMS with selected SIM (only if dual SIM is available and valid)
      let subscriptionId: number | undefined = undefined;
      
      if (isDualSim && selectedSim?.subscriptionId !== undefined) {
        subscriptionId = selectedSim.subscriptionId;
        console.log('Sending SMS via dual SIM - subscriptionId:', subscriptionId, 'SIM:', selectedSim.displayName);
      } else {
        console.log('Sending SMS via default method (no dual SIM)');
      }
      
      await smsService.sendSMS(recipient, message, undefined, subscriptionId);
      
      // Clear sending state after successful send
      setIsSending(false);
      
      // Navigate to the conversation
      router.replace(`/chat/${recipient}`);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error?.message || 'Failed to send message. Please try again.';
      alert(errorMessage);
      
      // Clear sending state on error
      setIsSending(false);
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.contactAvatar}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.contactAvatarImage} />
        ) : (
          <Text style={styles.contactAvatarText}>
            {item.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
      </View>
    </TouchableOpacity>
  );

  const canSend = recipient.trim().length > 0 && message.trim().length > 0 && !isSending;

  return (
    <View style={styles.outerContainer}>
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.recipientContainer}>
        <Text style={styles.label}>To</Text>
        <TextInput
          style={styles.recipientInput}
          placeholder="Phone number or contact name"
          placeholderTextColor={COLORS.textSecondary}
          value={recipient}
          onChangeText={setRecipient}
          mode="flat"
          dense
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          cursorColor={COLORS.primary}
          selectionColor={COLORS.primaryLight}
          textColor={COLORS.textPrimary}
        />
        <IconButton
          icon="account-circle"
          size={24}
          iconColor={COLORS.primary}
          onPress={handleOpenContactPicker}
        />
      </View>

      {showSuggestions && filteredContacts.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      <Divider />

      {isDualSim && selectedSim && (
        <View style={styles.simIndicatorContainer}>
          <SimIndicator 
            selectedSim={selectedSim} 
            onPress={() => setShowSimSelector(true)}
            showLabel
          />
        </View>
      )}

      <View style={styles.messageContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Message"
          placeholderTextColor={COLORS.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          mode="flat"
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          cursorColor={COLORS.primary}
          selectionColor={COLORS.primaryLight}
          textColor={COLORS.textPrimary}
        />
      </View>

      <View style={styles.sendButtonContainer}>
        <IconButton
          icon="send"
          size={28}
          iconColor={canSend ? COLORS.primary : COLORS.textDisabled}
          disabled={!canSend}
          onPress={handleSend}
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
        />
      </View>

      {isSending && (
        <View style={styles.sendingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.sendingText}>Sending...</Text>
        </View>
      )}
      
      <SimSelector
        visible={showSimSelector}
        onDismiss={() => setShowSimSelector(false)}
        onSelect={(sim) => setSelectedSim(sim)}
        currentSimId={selectedSim?.subscriptionId}
        phoneNumber={recipient}
      />
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  label: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginRight: 12,
    fontWeight: '500',
  },
  recipientInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  contactAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  simIndicatorContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.backgroundGray,
  },
  messageContainer: {
    flex: 1,
    padding: 16,
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sendButtonContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  sendButton: {
    margin: 0,
  },
  sendButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  sendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});
