import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Linking, Platform } from 'react-native';
import { Text, Button, Card, Divider, Switch } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../src/config/constants';
import { getDeviceInfo } from '../src/utils/deviceUtils';
import socketService from '../src/services/socketService';
import smsService from '../src/services/smsService';

export default function SettingsScreen() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasSmsPermissions, setHasSmsPermissions] = useState(false);
  const [isDefaultSmsApp, setIsDefaultSmsApp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeviceInfo();
    checkConnectionStatus();
    checkPermissionsStatus();

    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    socketService.on('connected', handleConnected);
    socketService.on('disconnected', handleDisconnected);

    return () => {
      socketService.off('connected', handleConnected);
      socketService.off('disconnected', handleDisconnected);
    };
  }, []);

  const loadDeviceInfo = async () => {
    const info = await getDeviceInfo();
    setDeviceInfo(info);
  };

  const checkConnectionStatus = () => {
    setIsConnected(socketService.connected);
  };

  const checkPermissionsStatus = async () => {
    if (Platform.OS !== 'android') return;
    
    try {
      const hasPerms = await smsService.hasPermissions();
      setHasSmsPermissions(hasPerms);
      
      const isDefault = await smsService.isDefaultSmsApp();
      setIsDefaultSmsApp(isDefault);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handleRequestSmsPermissions = async () => {
    setLoading(true);
    try {
      const granted = await smsService.requestPermissions();
      setHasSmsPermissions(granted);
      
      if (granted) {
        Alert.alert('Success', 'SMS permissions granted successfully!');
      } else {
        Alert.alert(
          'Permissions Denied',
          'SMS permissions are required to send and receive messages. Please grant permissions in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultSmsApp = async () => {
    setLoading(true);
    try {
      await smsService.requestDefaultSmsApp();
      // Wait a bit and recheck status
      setTimeout(async () => {
        const isDefault = await smsService.isDefaultSmsApp();
        setIsDefaultSmsApp(isDefault);
        setLoading(false);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to set as default SMS app');
      setLoading(false);
    }
  };

  const handleOpenAppSettings = () => {
    Linking.openSettings();
  };

  const handleScanQR = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes');
        return;
      }
    }
    setIsScanning(true);
  };

  const handleQRScanned = (data: string) => {
    try {
      setIsScanning(false);
      socketService.scanQR(data);
      
      Alert.alert(
        'Success',
        'QR code scanned! Waiting for pairing confirmation...',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process QR code');
    }
  };

  if (isScanning) {
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={({ data }) => handleQRScanned(data)}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <Button
          mode="contained"
          onPress={() => setIsScanning(false)}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {Platform.OS === 'android' && (
        <>
          <Card style={styles.card}>
            <Card.Title title="SMS Permissions" />
            <Card.Content>
              <View style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>SMS Permissions</Text>
                  <Text style={styles.permissionSubtitle}>
                    Required to send and receive SMS messages
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: hasSmsPermissions ? COLORS.success : COLORS.error },
                  ]}
                />
              </View>
              
              <Button
                mode="contained"
                onPress={handleRequestSmsPermissions}
                style={styles.button}
                disabled={loading || hasSmsPermissions}
                icon={hasSmsPermissions ? 'check-circle' : 'alert-circle'}
              >
                {hasSmsPermissions ? 'Permissions Granted' : 'Grant Permissions'}
              </Button>
              
              {!hasSmsPermissions && (
                <Button
                  mode="outlined"
                  onPress={handleOpenAppSettings}
                  style={styles.button}
                  icon="cog"
                >
                  Open App Settings
                </Button>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Default SMS App" />
            <Card.Content>
              <View style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionTitle}>Default Messaging App</Text>
                  <Text style={styles.permissionSubtitle}>
                    Set this app as your default SMS app for full functionality
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: isDefaultSmsApp ? COLORS.success : COLORS.warning },
                  ]}
                />
              </View>
              
              <Button
                mode="contained"
                onPress={handleSetDefaultSmsApp}
                style={styles.button}
                disabled={loading || isDefaultSmsApp}
                icon={isDefaultSmsApp ? 'check-circle' : 'cellphone-message'}
              >
                {isDefaultSmsApp ? 'Currently Default App' : 'Set as Default'}
              </Button>
              
              {!isDefaultSmsApp && (
                <Text style={styles.warningText}>
                  ⚠️ Some features may not work correctly if not set as default SMS app
                </Text>
              )}
            </Card.Content>
          </Card>
        </>
      )}

      <Card style={styles.card}>
        <Card.Title title="Device Information" />
        <Card.Content>
          <Text style={styles.label}>Device ID:</Text>
          <Text style={styles.value}>{deviceInfo?.deviceId}</Text>
          
          <Text style={styles.label}>Device Name:</Text>
          <Text style={styles.value}>{deviceInfo?.deviceName}</Text>
          
          <Text style={styles.label}>Model:</Text>
          <Text style={styles.value}>{deviceInfo?.deviceModel}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Connection Status" />
        <Card.Content>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isConnected ? COLORS.success : COLORS.error },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected to server' : 'Disconnected'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Pair with Web" />
        <Card.Content>
          <Text style={styles.description}>
            Scan the QR code displayed on the web app to pair this device and sync messages.
          </Text>
          <Button
            mode="contained"
            onPress={handleScanQR}
            style={styles.button}
            icon="qrcode-scan"
          >
            Scan QR Code
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="About" />
        <Card.Content>
          <Text style={styles.description}>
            Google Messages Clone v1.0.0
          </Text>
          <Text style={styles.description}>
            Send and receive SMS messages from your phone and sync with web.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  camera: {
    flex: 1,
  },
  cancelButton: {
    margin: 16,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.text,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  permissionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.warning || '#F57C00',
    marginTop: 12,
    lineHeight: 18,
  },
});
