import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: 'firebase' | 'openrouter' | 'stripe' | 'general';
  userId?: string;
  metadata?: Record<string, any>;
  timestamp?: any;
}

class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async log(entry: LogEntry): Promise<void> {
    try {
      // Always log to console in development
      if (!this.isProduction) {
        console.log(`[${entry.level.toUpperCase()}] ${entry.service}: ${entry.message}`, entry.metadata);
      }

      // In production, send to Firebase
      if (this.isProduction && typeof window !== 'undefined') {
        const logData = {
          ...entry,
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        };

        await addDoc(collection(db, 'logs'), logData);
      }
    } catch (error) {
      // Fallback to console if Firebase fails
      console.error('Failed to log to Firebase:', error);
      console.log(`[${entry.level.toUpperCase()}] ${entry.service}: ${entry.message}`, entry.metadata);
    }
  }

  async info(message: string, service: LogEntry['service'], metadata?: Record<string, any>, userId?: string): Promise<void> {
    await this.log({ level: 'info', message, service, metadata, userId });
  }

  async warn(message: string, service: LogEntry['service'], metadata?: Record<string, any>, userId?: string): Promise<void> {
    await this.log({ level: 'warn', message, service, metadata, userId });
  }

  async error(message: string, service: LogEntry['service'], metadata?: Record<string, any>, userId?: string): Promise<void> {
    await this.log({ level: 'error', message, service, metadata, userId });
  }

  async debug(message: string, service: LogEntry['service'], metadata?: Record<string, any>, userId?: string): Promise<void> {
    await this.log({ level: 'debug', message, service, metadata, userId });
  }
}

export const logger = new Logger();
