import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SimCard, SimPreference } from '../types';

const { DualSimManager } = NativeModules;

const SIM_PREFERENCES_KEY = '@sim_preferences';

class DualSimService {
  private simCards: SimCard[] = [];
  private simPreferences: Map<string, SimPreference> = new Map();
  private isDualSim: boolean = false;

  /**
   * Initialize the service - load SIM cards and preferences
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await this.loadSimCards();
      await this.loadSimPreferences();
    } catch (error) {
      console.error('Error initializing DualSimService:', error);
    }
  }

  /**
   * Load available SIM cards from device
   */
  async loadSimCards(): Promise<SimCard[]> {
    if (Platform.OS !== 'android' || !DualSimManager) {
      this.simCards = [];
      return [];
    }

    try {
      const cards = await DualSimManager.getSimCards();
      this.simCards = cards || [];
      this.isDualSim = this.simCards.length > 1;
      
      console.log(`Loaded ${this.simCards.length} SIM card(s):`, this.simCards);
      return this.simCards;
    } catch (error) {
      console.error('Error loading SIM cards:', error);
      this.simCards = [];
      return [];
    }
  }

  /**
   * Get list of available SIM cards
   */
  getSimCards(): SimCard[] {
    return this.simCards;
  }

  /**
   * Check if device has dual SIM capability
   */
  isDualSimDevice(): boolean {
    return this.isDualSim;
  }

  /**
   * Get default SIM subscription ID for SMS
   */
  async getDefaultSmsSubscriptionId(): Promise<number> {
    if (Platform.OS !== 'android' || !DualSimManager) {
      return -1;
    }

    try {
      const subId = await DualSimManager.getDefaultSmsSubscriptionId();
      return subId;
    } catch (error) {
      console.error('Error getting default SMS subscription:', error);
      return -1;
    }
  }

  /**
   * Get the default SIM card
   */
  getDefaultSimCard(): SimCard | null {
    const defaultSim = this.simCards.find(sim => sim.isDefaultSms);
    return defaultSim || (this.simCards.length > 0 ? this.simCards[0] : null);
  }

  /**
   * Get SIM card by subscription ID
   */
  getSimCardBySubscriptionId(subscriptionId: number): SimCard | null {
    return this.simCards.find(sim => sim.subscriptionId === subscriptionId) || null;
  }

  /**
   * Send SMS using specific SIM card
   */
  async sendSmsWithSim(
    phoneNumber: string,
    message: string,
    messageId: string,
    subscriptionId: number
  ): Promise<boolean> {
    if (Platform.OS !== 'android' || !DualSimManager) {
      throw new Error('Dual SIM is only supported on Android');
    }

    try {
      await DualSimManager.sendSmsWithSim(phoneNumber, message, messageId, subscriptionId);
      
      // Save preference for this contact
      await this.saveSimPreference(phoneNumber, subscriptionId);
      
      return true;
    } catch (error) {
      console.error('Error sending SMS with SIM:', error);
      throw error;
    }
  }

  /**
   * Load SIM preferences from storage
   */
  private async loadSimPreferences(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(SIM_PREFERENCES_KEY);
      if (data) {
        const preferences: SimPreference[] = JSON.parse(data);
        this.simPreferences.clear();
        preferences.forEach(pref => {
          this.simPreferences.set(pref.phoneNumber, pref);
        });
        console.log(`Loaded ${preferences.length} SIM preferences`);
      }
    } catch (error) {
      console.error('Error loading SIM preferences:', error);
    }
  }

  /**
   * Save SIM preferences to storage
   */
  private async saveSimPreferencesToStorage(): Promise<void> {
    try {
      const preferences = Array.from(this.simPreferences.values());
      await AsyncStorage.setItem(SIM_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving SIM preferences:', error);
    }
  }

  /**
   * Save SIM preference for a contact
   */
  async saveSimPreference(phoneNumber: string, subscriptionId: number): Promise<void> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedNumber = phoneNumber.replace(/[\s\-()]/g, '');
    
    this.simPreferences.set(normalizedNumber, {
      phoneNumber: normalizedNumber,
      subscriptionId,
      lastUsed: Date.now()
    });
    
    await this.saveSimPreferencesToStorage();
  }

  /**
   * Get SIM preference for a contact
   */
  getSimPreference(phoneNumber: string): SimPreference | null {
    const normalizedNumber = phoneNumber.replace(/[\s\-()]/g, '');
    return this.simPreferences.get(normalizedNumber) || null;
  }

  /**
   * Get recommended SIM for a contact
   * This checks:
   * 1. User's previous preference for this contact
   * 2. Default SMS SIM
   * 3. First available SIM
   */
  async getRecommendedSimForContact(phoneNumber: string): Promise<SimCard | null> {
    // Check if we have a preference for this contact
    const preference = this.getSimPreference(phoneNumber);
    if (preference) {
      const sim = this.getSimCardBySubscriptionId(preference.subscriptionId);
      if (sim) {
        console.log(`Using saved preference for ${phoneNumber}: SIM ${sim.displayName}`);
        return sim;
      }
    }

    // Use default SMS SIM
    const defaultSim = this.getDefaultSimCard();
    if (defaultSim) {
      console.log(`Using default SIM for ${phoneNumber}: ${defaultSim.displayName}`);
      return defaultSim;
    }

    // Fallback to first available SIM
    if (this.simCards.length > 0) {
      console.log(`Using first available SIM for ${phoneNumber}: ${this.simCards[0].displayName}`);
      return this.simCards[0];
    }

    return null;
  }

  /**
   * Clear all SIM preferences
   */
  async clearSimPreferences(): Promise<void> {
    this.simPreferences.clear();
    await AsyncStorage.removeItem(SIM_PREFERENCES_KEY);
  }

  /**
   * Get statistics about SIM usage
   */
  getSimUsageStats(): { [key: number]: number } {
    const stats: { [key: number]: number } = {};
    
    this.simPreferences.forEach(pref => {
      stats[pref.subscriptionId] = (stats[pref.subscriptionId] || 0) + 1;
    });
    
    return stats;
  }
}

export default new DualSimService();
