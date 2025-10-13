import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../config/constants';
import { DeviceInfo } from '../types';

/**
 * Generate or retrieve device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return `device_${Date.now()}`;
  }
}

/**
 * Get device information
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = await getDeviceId();
  const deviceName = Device.deviceName || 'Unknown Device';
  const deviceModel = `${Device.manufacturer || 'Unknown'} ${Device.modelName || 'Unknown'}`;
  
  return {
    deviceId,
    deviceName,
    deviceModel
  };
}

/**
 * Save device info to storage
 */
export async function saveDeviceInfo(info: DeviceInfo): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_INFO, JSON.stringify(info));
  } catch (error) {
    console.error('Error saving device info:', error);
  }
}

/**
 * Load device info from storage
 */
export async function loadDeviceInfo(): Promise<DeviceInfo | null> {
  try {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_INFO);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading device info:', error);
    return null;
  }
}
