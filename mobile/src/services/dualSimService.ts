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
    if (Platform.OS !== 'android') {
      this.simCards = [];
      this.isDualSim = false;
      return [];
    }

    if (!DualSimManager) {
      console.warn('DualSimManager native module not available');
      this.simCards = [];
      this.isDualSim = false;
      return [];
    }

    try {
      console.log('Loading SIM cards from device...');
      const cards = await DualSimManager.getSimCards();
      
      // Validate the response
      if (!Array.isArray(cards)) {
        console.error('Invalid response from DualSimManager.getSimCards:', typeof cards, cards);
        this.simCards = [];
        this.isDualSim = false;
        return [];
      }

      // Filter out invalid SIM cards and validate required fields
      const validCards = cards.filter((card: any) => {
        if (!card || typeof card !== 'object') {
          console.warn('Skipping invalid SIM card (not an object):', card);
          return false;
        }
        
        if (typeof card.subscriptionId !== 'number' || card.subscriptionId < 0) {
          console.warn('Skipping SIM card with invalid subscriptionId:', card);
          return false;
        }
        
        if (!card.displayName || typeof card.displayName !== 'string') {
          console.warn('Skipping SIM card with invalid displayName:', card);
          return false;
        }
        
        return true;
      });
      
      this.simCards = validCards;
      this.isDualSim = this.simCards.length > 1;
      
      console.log(`✅ Loaded ${this.simCards.length} valid SIM card(s):`);
      this.simCards.forEach((card, index) => {
        console.log(`  SIM ${index + 1}: ${card.displayName} (ID: ${card.subscriptionId}, Default: ${card.isDefaultSms})`);
      });
      
      return this.simCards;
    } catch (error: any) {
      console.error('❌ Error loading SIM cards:', error);
      
      // Provide more specific error information
      let errorMessage = 'Failed to load SIM cards';
      if (error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission denied accessing SIM cards';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Timeout loading SIM cards';
      } else if (error.message) {
        errorMessage = `SIM loading error: ${error.message}`;
      }
      
      console.error(errorMessage);
      this.simCards = [];
      this.isDualSim = false;
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
    try {
      // Validate inputs
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw new Error('Invalid phone number provided');
      }
      
      if (typeof subscriptionId !== 'number' || subscriptionId < 0) {
        throw new Error('Invalid subscription ID provided');
      }

      // Validate that the subscription ID exists in our loaded SIM cards
      const sim = this.getSimCardBySubscriptionId(subscriptionId);
      if (!sim) {
        console.warn(`Saving preference for unknown subscription ID: ${subscriptionId}`);
      }

      // Normalize phone number (remove spaces, dashes, etc.)
      const normalizedNumber = phoneNumber.replace(/[\s\-()]/g, '');
      
      this.simPreferences.set(normalizedNumber, {
        phoneNumber: normalizedNumber,
        subscriptionId,
        lastUsed: Date.now()
      });
      
      await this.saveSimPreferencesToStorage();
      console.log(`Saved SIM preference for ${normalizedNumber}: subscription ${subscriptionId}`);
    } catch (error) {
      console.error(`Error saving SIM preference for ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Clear SIM preference for a specific contact
   */
  async clearSimPreference(phoneNumber: string): Promise<void> {
    try {
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw new Error('Invalid phone number provided');
      }

      const normalizedNumber = phoneNumber.replace(/[\s\-()]/g, '');
      
      if (this.simPreferences.has(normalizedNumber)) {
        this.simPreferences.delete(normalizedNumber);
        await this.saveSimPreferencesToStorage();
        console.log(`Cleared SIM preference for ${normalizedNumber}`);
      }
    } catch (error) {
      console.error(`Error clearing SIM preference for ${phoneNumber}:`, error);
      throw error;
    }
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
    try {
      // Refresh SIM cards if we don't have any loaded
      if (this.simCards.length === 0) {
        console.log('No SIM cards loaded, attempting to reload...');
        await this.loadSimCards();
      }

      // Check if we have a preference for this contact
      const preference = this.getSimPreference(phoneNumber);
      if (preference) {
        const sim = this.getSimCardBySubscriptionId(preference.subscriptionId);
        if (sim) {
          console.log(`Using saved preference for ${phoneNumber}: SIM ${sim.displayName}`);
          return sim;
        } else {
          console.warn(`Saved SIM preference for ${phoneNumber} (subscription ID: ${preference.subscriptionId}) is no longer valid. Clearing preference.`);
          // Remove the stale preference
          await this.clearSimPreference(phoneNumber);
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

      console.warn(`No SIM cards available for ${phoneNumber}`);
      return null;
    } catch (error) {
      console.error(`Error getting recommended SIM for ${phoneNumber}:`, error);
      return null;
    }
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
