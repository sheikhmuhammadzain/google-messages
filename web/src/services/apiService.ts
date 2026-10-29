import { API_URL } from '../config/constants';
import { QRData } from '../types';

class ApiService {
  /**
   * Generate QR code for pairing
   */
  async generateQR(): Promise<QRData> {
    try {
      const response = await fetch(`${API_URL}/api/auth/generate-qr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Generate QR error:', error);
      throw error;
    }
  }

  /**
   * Wait for QR pairing (long-polling)
   */
  async waitForPairing(token: string): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/auth/wait-pairing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (result.success) {
        return result.data.sessionToken;
      } else {
        throw new Error(result.error || 'Pairing failed');
      }
    } catch (error) {
      console.error('Wait pairing error:', error);
      throw error;
    }
  }

  /**
   * Verify session token
   */
  async verifySession(sessionToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Verify session error:', error);
      return false;
    }
  }
}

export default new ApiService();
