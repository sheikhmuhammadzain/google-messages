import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Database from '../config/database';

const prisma = Database.getClient();

class AuthService {
  private readonly JWT_SECRET: string;
  private readonly QR_TOKEN_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
  }

  /**
   * Generate a QR code token for pairing
   */
  async generateQRToken(): Promise<{ token: string; qrData: string; expiresIn: number }> {
    const token = uuidv4();
    const timestamp = Date.now();
    const expiresIn = this.QR_TOKEN_EXPIRY;
    
    const qrData = JSON.stringify({
      token,
      timestamp,
      expiresIn
    });

    return { token, qrData, expiresIn };
  }

  /**
   * Verify QR token and create pairing
   */
  async verifyQRToken(qrData: string, deviceId: string, deviceName: string, deviceModel: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    try {
      const payload = JSON.parse(qrData);
      const { token, timestamp, expiresIn } = payload;

      // Check if token is expired
      if (Date.now() - timestamp > expiresIn) {
        return { success: false, error: 'QR code expired' };
      }

      // Find or create device
      let device = await prisma.device.findUnique({
        where: { deviceId }
      });
      
      if (!device) {
        device = await prisma.device.create({
          data: {
            deviceId,
            deviceName,
            deviceModel,
            pairingToken: token,
            pairingTokenExpiry: new Date(timestamp + expiresIn)
          }
        });
      } else {
        device = await prisma.device.update({
          where: { deviceId },
          data: { lastSeen: new Date() }
        });
      }

      // Create session
      const sessionToken = this.generateSessionToken(deviceId);
      await prisma.session.create({
        data: {
          deviceId,
          sessionToken,
          expiresAt: new Date(Date.now() + this.SESSION_EXPIRY)
        }
      });

      return { success: true, sessionToken };
    } catch (error) {
      console.error('QR verification error:', error);
      return { success: false, error: 'Invalid QR code' };
    }
  }

  /**
   * Generate session token
   */
  generateSessionToken(deviceId: string): string {
    return jwt.sign({ deviceId, timestamp: Date.now() }, this.JWT_SECRET, {
      expiresIn: '30d'
    });
  }

  /**
   * Verify session token
   */
  async verifySessionToken(token: string): Promise<{ valid: boolean; deviceId?: string; error?: string }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { deviceId: string };
      
      // Check if session exists and is valid
      const session = await prisma.session.findUnique({
        where: { 
          sessionToken: token
        }
      });

      if (!session || session.expiresAt < new Date()) {
        return { valid: false, error: 'Session not found or expired' };
      }

      // Update last seen
      await prisma.session.update({
        where: { sessionToken: token },
        data: { lastSeen: new Date() }
      });

      return { valid: true, deviceId: decoded.deviceId };
    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Register mobile device
   */
  async registerDevice(deviceId: string, deviceName: string, deviceModel: string): Promise<void> {
    const device = await prisma.device.findUnique({
      where: { deviceId }
    });
    
    if (!device) {
      await prisma.device.create({
        data: {
          deviceId,
          deviceName,
          deviceModel
        }
      });
    } else {
      await prisma.device.update({
        where: { deviceId },
        data: {
          deviceName,
          deviceModel,
          lastSeen: new Date()
        }
      });
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }
}

export default new AuthService();
