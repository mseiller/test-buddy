import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsole } from '@/utils/console';

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
      // Only log to console in development
      safeConsole.log(`[${entry.level.toUpperCase()}] ${entry.service}: ${entry.message}`, entry.metadata);

      // Always send to Firebase (both dev and prod)
      if (typeof window !== 'undefined') {
        const logData = {
          ...entry,
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          environment: this.isProduction ? 'production' : 'development',
        };

        await addDoc(collection(db, 'logs'), logData);
      }
    } catch (error) {
      // Only show Firebase errors in development
      safeConsole.error('Failed to log to Firebase:', error);
      safeConsole.log(`[${entry.level.toUpperCase()}] ${entry.service}: ${entry.message}`, entry.metadata);
      // In production, silently fail - don't expose any errors to users
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
