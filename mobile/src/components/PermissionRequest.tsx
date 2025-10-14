import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Icon, ActivityIndicator } from 'react-native-paper';

interface PermissionRequestProps {
  onRetry: () => void;
  isLoading?: boolean;
}

export default function PermissionRequest({ onRetry, isLoading = false }: PermissionRequestProps) {
  const openSettings = () => {
    Alert.alert(
      'Open Settings',
      'Please enable SMS permissions in your device settings to use this app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon source="message-text" size={64} color="#1A73E8" />
      </View>

      <Text style={styles.title}>SMS Permission Required</Text>
      
      <Text style={styles.description}>
        This app needs access to your SMS messages to display and send texts.
      </Text>

      <Text style={styles.steps}>
        To enable SMS access:
      </Text>
      
      <View style={styles.stepsList}>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>1.</Text>
          <Text style={styles.stepText}>Tap "Grant Permissions" below</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>2.</Text>
          <Text style={styles.stepText}>Allow all SMS-related permissions</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>3.</Text>
          <Text style={styles.stepText}>Return to the app to continue</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} onPress={onRetry} disabled={isLoading}>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size={18} color="#ffffff" />
            <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Requesting...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Grant Permissions</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={openSettings} disabled={isLoading}>
        <Text style={styles.secondaryButtonText}>Open Settings Manually</Text>
      </TouchableOpacity>

      <Text style={styles.privacyNote}>
        🔒 Your messages are never uploaded to any server. All data stays on your device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.85,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#5F6368',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  steps: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  stepsList: {
    width: '100%',
    marginBottom: 32,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A73E8',
    width: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#5F6368',
    flex: 1,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#1A73E8',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#DADCE0',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#1A73E8',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  privacyNote: {
    fontSize: 12,
    color: '#5F6368',
    textAlign: 'center',
    lineHeight: 18,
  },
});
