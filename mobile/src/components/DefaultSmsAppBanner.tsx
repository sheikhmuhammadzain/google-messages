import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Card, IconButton } from 'react-native-paper';
import { COLORS } from '../config/constants';

interface DefaultSmsAppBannerProps {
  onSetDefault: () => void;
  onDismiss?: () => void;
  isLoading?: boolean;
  style?: any;
}

export default function DefaultSmsAppBanner({
  onSetDefault,
  onDismiss,
  isLoading = false,
  style
}: DefaultSmsAppBannerProps) {
  return (
    <Card style={[styles.container, style]} mode="outlined">
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Set as Default Messaging App</Text>
          <Text style={styles.message}>
            To receive messages and sync with the web, set this app as your default messaging app.
          </Text>
        </View>

        {onDismiss && (
          <IconButton
            icon="close"
            size={20}
            iconColor={COLORS.textSecondary}
            onPress={onDismiss}
            style={styles.closeButton}
          />
        )}
      </View>
      
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={onSetDefault}
          loading={isLoading}
          disabled={isLoading}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
        >
          {isLoading ? 'Setting up...' : 'Set as Default'}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFE69C',
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  closeButton: {
    margin: -8,
    marginTop: -4,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  actionButton: {
    backgroundColor: '#FFC107',
    elevation: 0,
  },
  buttonContent: {
    paddingHorizontal: 8,
  },
});

export { DefaultSmsAppBanner };