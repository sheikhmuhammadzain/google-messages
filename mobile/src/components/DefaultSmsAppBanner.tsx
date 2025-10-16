import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  style,
}: DefaultSmsAppBannerProps) {
  return (
    <Card style={[styles.container, style]} mode="elevated">
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconButton
            icon="alert-circle-outline"
            size={22}
            iconColor={stylesVars.icon}
            style={{ margin: 0 }}
            disabled
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Set as default SMS app</Text>
          <Text style={styles.message}>
            For full functionality (send/receive and web sync), set this app as your default messaging app.
          </Text>
        </View>

        {onDismiss && (
          <IconButton
            icon="close"
            size={18}
            iconColor={stylesVars.close}
            onPress={onDismiss}
            style={styles.closeButton}
            accessibilityLabel="Dismiss"
          />
        )}
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          onPress={onSetDefault}
          loading={isLoading}
          disabled={isLoading}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
          uppercase={false}
        >
          {isLoading ? 'Opening settings…' : 'Set as default'}
        </Button>
      </View>
    </Card>
  );
}

const stylesVars = {
  bg: '#FFF7DA',
  border: '#FFE7A0',
  text: '#6F5A00',
  icon: '#B88700',
  close: '#8A7B4F',
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: stylesVars.bg,
    borderColor: stylesVars.border,
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  iconContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: stylesVars.text,
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  message: {
    fontSize: 13,
    color: stylesVars.text,
    lineHeight: 18,
    opacity: 0.9,
  },
  closeButton: {
    margin: -6,
  },
  actions: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  actionButton: {
    borderRadius: 22,
    backgroundColor: '#FFD54F',
  },
  buttonContent: {
    paddingHorizontal: 14,
    height: 40,
  },
});

export { DefaultSmsAppBanner };
