import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  keyboardShortcuts: {
    enabled: boolean;
  };
  ui: {
    showTimestamps: boolean;
    compactMode: boolean;
  };
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  theme: 'light',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
  },
  keyboardShortcuts: {
    enabled: true,
  },
  ui: {
    showTimestamps: true,
    compactMode: false,
  },
};

const STORAGE_KEY = 'app_settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return defaultSettings;
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({
      ...prev,
      ...updates,
      notifications: { ...prev.notifications, ...(updates.notifications || {}) },
      keyboardShortcuts: { ...prev.keyboardShortcuts, ...(updates.keyboardShortcuts || {}) },
      ui: { ...prev.ui, ...(updates.ui || {}) },
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
