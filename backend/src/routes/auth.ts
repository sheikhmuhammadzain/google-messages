import { Router, Request, Response } from 'express';
import AuthService from '../services/AuthService';
import SocketService from '../services/SocketService';

const router = Router();

/**
 * Generate QR code for pairing
 * GET /api/auth/generate-qr
 */
router.get('/generate-qr', async (req: Request, res: Response) => {
  try {
    const { token, qrData, expiresIn } = await AuthService.generateQRToken();
    
    res.json({
      success: true,
      data: {
        qrData,
        token,
        expiresIn
      }
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code'
    });
  }
});

/**
 * Wait for QR pairing (long-polling endpoint)
 * POST /api/auth/wait-pairing
 */
router.post('/wait-pairing', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Wait for mobile to scan QR (with timeout)
    const sessionToken = await SocketService.waitForQRPairing(token, 300000); // 5 minutes
    
    res.json({
      success: true,
      data: {
        sessionToken
      }
    });
  } catch (error) {
    res.status(408).json({
      success: false,
      error: 'Pairing timeout'
    });
  }
});

/**
 * Verify session token
 * POST /api/auth/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Session token is required'
      });
    }

    const result = await AuthService.verifySessionToken(sessionToken);
    
    if (result.valid) {
      res.json({
        success: true,
        data: {
          deviceId: result.deviceId
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Invalid session'
      });
    }
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

/**
 * Health check
 * GET /api/auth/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth service is running'
  });
});

export default router;
