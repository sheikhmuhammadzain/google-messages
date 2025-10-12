import { PrismaClient } from '@prisma/client';

class Database {
  private static instance: Database;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('💾 Already connected to PostgreSQL');
      return;
    }

    try {
      // Test the connection
      await this.prisma.$connect();
      
      this.isConnected = true;
      console.log('✅ Connected to PostgreSQL successfully');

    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Disconnected from PostgreSQL');
    } catch (error) {
      console.error('❌ Error disconnecting from PostgreSQL:', error);
      throw error;
    }
  }

  getClient(): PrismaClient {
    return this.prisma;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default Database.getInstance();
