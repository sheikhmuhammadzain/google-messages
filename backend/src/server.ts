import express, { Application, Request, Response } from 'express';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import Database from './config/database';
import authRoutes from './routes/auth';
import SocketService from './services/SocketService';

// Load environment variables
dotenv.config();

class Server {
  private app: Application;
  private httpServer: HTTPServer;
  private io: SocketIOServer;
  private readonly PORT: number;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || '3000', 10);
    
    // Create HTTP server
    this.httpServer = new HTTPServer(this.app);
    
    // Initialize Socket.IO
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeServices();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'Google Messages Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      console.error('Server error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  private initializeServices(): void {
    // Initialize Socket service
    SocketService.initialize(this.io);
  }

  private async connectDatabase(): Promise<void> {
    try {
      await Database.connect();
      console.log('📊 PostgreSQL + Prisma ready');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      // Continue without database in development
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.connectDatabase();

      // Start server
      this.httpServer.listen(this.PORT, () => {
        console.log('\n' + '='.repeat(50));
        console.log('🚀 Google Messages Backend Server');
        console.log('='.repeat(50));
        console.log(`📡 Server running on port: ${this.PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 HTTP: http://localhost:${this.PORT}`);
        console.log(`🔌 WebSocket: ws://localhost:${this.PORT}`);
        console.log('='.repeat(50) + '\n');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('\n⚠️  Shutting down gracefully...');
    
    try {
      // Close Socket.IO connections
      this.io.close();
      
      // Close HTTP server
      this.httpServer.close();
      
      // Disconnect database
      await Database.disconnect();
      
      console.log('✅ Server shut down successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start server
const server = new Server();
server.start();

export default Server;
