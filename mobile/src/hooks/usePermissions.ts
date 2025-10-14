import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import smsService from '../services/smsService';

export interface PermissionsState {
  hasSmsPermissions: boolean | null;
  isDefaultSmsApp: boolean | null;
  isLoading: boolean;
  error: string | null;
}

export interface PermissionsActions {
  checkPermissions: () => Promise<void>;
  requestSmsPermissions: () => Promise<boolean>;
  requestDefaultSmsApp: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UsePermissionsReturn extends PermissionsState, PermissionsActions {
  canSendSms: boolean;
  canReceiveSms: boolean;
  needsPermissionSetup: boolean;
  needsDefaultSmsSetup: boolean;
}

/**
 * Unified hook for managing SMS permissions and default app status
 */
export function usePermissions(): UsePermissionsReturn {
  const [state, setState] = useState<PermissionsState>({
    hasSmsPermissions: null,
    isDefaultSmsApp: null,
    isLoading: false,
    error: null,
  });

  const updateState = useCallback((updates: Partial<PermissionsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const checkPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      updateState({
        hasSmsPermissions: false,
        isDefaultSmsApp: false,
        isLoading: false,
      });
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      // Check SMS permissions
      const hasPerms = await smsService.hasPermissions();
      
      // Check default SMS app status
      const isDefault = await smsService.isDefaultSmsApp();

      updateState({
        hasSmsPermissions: hasPerms,
        isDefaultSmsApp: isDefault,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to check permissions',
        isLoading: false,
      });
    }
  }, [updateState]);

  const requestSmsPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      updateState({ isLoading: true, error: null });

      const granted = await smsService.requestPermissions();
      
      updateState({
        hasSmsPermissions: granted,
        isLoading: false,
      });

      return granted;
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to request permissions',
        isLoading: false,
      });
      return false;
    }
  }, [updateState]);

  const requestDefaultSmsApp = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      await smsService.requestDefaultSmsApp();
      
      // Wait a bit for the system to update, then recheck
      setTimeout(async () => {
        try {
          const isDefault = await smsService.isDefaultSmsApp();
          updateState({
            isDefaultSmsApp: isDefault,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error rechecking default SMS status:', error);
          updateState({ isLoading: false });
        }
      }, 1000);
    } catch (error) {
      console.error('Error requesting default SMS app:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to set as default SMS app',
        isLoading: false,
      });
    }
  }, [updateState]);

  const refresh = useCallback(async () => {
    await checkPermissions();
  }, [checkPermissions]);

  // Initial check on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Re-check permissions and default SMS when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Small delay to allow system state to settle
        setTimeout(() => {
          checkPermissions();
        }, 400);
      }
    });
    return () => sub.remove();
  }, [checkPermissions]);

  // Derived state
  const canSendSms = state.hasSmsPermissions === true;
  const canReceiveSms = state.hasSmsPermissions === true && state.isDefaultSmsApp === true;
  const needsPermissionSetup = state.hasSmsPermissions === false;
  const needsDefaultSmsSetup = state.hasSmsPermissions === true && state.isDefaultSmsApp === false;

  return {
    ...state,
    checkPermissions,
    requestSmsPermissions,
    requestDefaultSmsApp,
    refresh,
    canSendSms,
    canReceiveSms,
    needsPermissionSetup,
    needsDefaultSmsSetup,
  };
}

export default usePermissions;