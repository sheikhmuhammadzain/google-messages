import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
  photo?: string;
}

class ContactsService {
  private contactsCache: Map<string, Contact> = new Map();
  private phoneToContactMap: Map<string, Contact> = new Map();
  private initialized = false;

  /**
   * Request contacts permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  /**
   * Check if contacts permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
    }
  }

  /**
   * Load all contacts and cache them
   */
  async loadContacts(): Promise<Contact[]> {
    try {
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        console.log('No contacts permission, requesting...');
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Contacts permission not granted');
        }
      }

      const rawContacts = await Contacts.getAll();
      const contacts: Contact[] = [];

      rawContacts.forEach((rawContact) => {
        if (rawContact.phoneNumbers && rawContact.phoneNumbers.length > 0) {
          const contact: Contact = {
            id: rawContact.recordID,
            name: rawContact.displayName || rawContact.givenName || 'Unknown',
            phoneNumbers: rawContact.phoneNumbers.map((p) => this.normalizePhoneNumber(p.number)),
            photo: rawContact.thumbnailPath || undefined,
          };

          contacts.push(contact);
          this.contactsCache.set(contact.id, contact);

          // Map each phone number to this contact
          contact.phoneNumbers.forEach((phone) => {
            this.phoneToContactMap.set(phone, contact);
          });
        }
      });

      this.initialized = true;
      console.log(`Loaded ${contacts.length} contacts`);
      return contacts;
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  }

  /**
   * Get contact by phone number
   */
  async getContactByPhoneNumber(phoneNumber: string): Promise<Contact | null> {
    if (!this.initialized) {
      await this.loadContacts();
    }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    // Try exact match first
    let contact = this.phoneToContactMap.get(normalizedPhone);
    
    // If no exact match, try partial match (last 10 digits)
    if (!contact && normalizedPhone.length >= 10) {
      const lastDigits = normalizedPhone.slice(-10);
      for (const [phone, cont] of this.phoneToContactMap.entries()) {
        if (phone.endsWith(lastDigits) || lastDigits.endsWith(phone.slice(-10))) {
          contact = cont;
          break;
        }
      }
    }

    return contact || null;
  }

  /**
   * Get contact name by phone number
   */
  async getContactName(phoneNumber: string): Promise<string> {
    const contact = await this.getContactByPhoneNumber(phoneNumber);
    return contact?.name || phoneNumber;
  }

  /**
   * Get contact photo by phone number
   */
  async getContactPhoto(phoneNumber: string): Promise<string | null> {
    const contact = await this.getContactByPhoneNumber(phoneNumber);
    return contact?.photo || null;
  }

  /**
   * Search contacts by name or phone number
   */
  async searchContacts(query: string): Promise<Contact[]> {
    if (!this.initialized) {
      await this.loadContacts();
    }

    const lowerQuery = query.toLowerCase();
    const results: Contact[] = [];

    this.contactsCache.forEach((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(lowerQuery);
      const phoneMatch = contact.phoneNumbers.some((phone) => 
        phone.includes(query.replace(/\D/g, ''))
      );

      if (nameMatch || phoneMatch) {
        results.push(contact);
      }
    });

    return results.slice(0, 20); // Limit to 20 results
  }

  /**
   * Get all contacts (from cache)
   */
  async getAllContacts(): Promise<Contact[]> {
    if (!this.initialized) {
      await this.loadContacts();
    }
    return Array.from(this.contactsCache.values());
  }

  /**
   * Normalize phone number for comparison
   * Removes all non-digit characters
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '');
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Format based on length
    if (cleaned.length === 10) {
      // US format: (555) 123-4567
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      // US with country code: +1 (555) 123-4567
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length > 10) {
      // International format
      return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
    }

    // Default: just return cleaned number
    return phoneNumber;
  }

  /**
   * Refresh contacts cache
   */
  async refreshContacts(): Promise<void> {
    this.contactsCache.clear();
    this.phoneToContactMap.clear();
    this.initialized = false;
    await this.loadContacts();
  }

  /**
   * Clear contacts cache
   */
  clearCache(): void {
    this.contactsCache.clear();
    this.phoneToContactMap.clear();
    this.initialized = false;
  }
}

export default new ContactsService();
