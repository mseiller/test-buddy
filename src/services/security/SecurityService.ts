/**
 * Comprehensive Security Service
 * Provides input validation, sanitization, rate limiting, and security monitoring
 */

import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';

export interface SecurityConfig {
  enableRateLimiting: boolean;
  enableInputValidation: boolean;
  enableSanitization: boolean;
  enableAuditLogging: boolean;
  maxRequestsPerMinute: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  maxInputLength: number;
  enableCSP: boolean;
  enableHSTS: boolean;
}

export interface SecurityEvent {
  timestamp: Date;
  userId?: string;
  eventType: 'auth_success' | 'auth_failure' | 'file_upload' | 'api_request' | 'validation_error' | 'rate_limit_exceeded' | 'suspicious_activity' | 'navigation' | 'security_check';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RateLimitInfo {
  userId: string;
  endpoint: string;
  requests: number;
  windowStart: Date;
  blocked: boolean;
}

export class SecurityService {
  private static instance: SecurityService;
  private config: Required<SecurityConfig>;
  private rateLimitMap = new Map<string, RateLimitInfo>();
  private securityEvents: SecurityEvent[] = [];
  private blockedIPs = new Set<string>();
  private suspiciousPatterns = new Set<string>();

  private constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableRateLimiting: true,
      enableInputValidation: true,
      enableSanitization: true,
      enableAuditLogging: true,
      maxRequestsPerMinute: 100,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFileTypes: [
        'text/plain',
        'text/csv',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ],
      maxInputLength: 1000000, // 1MB of text
      enableCSP: true,
      enableHSTS: true,
      ...config
    };

    this.setupSecurityMonitoring();
    console.log('SecurityService initialized with comprehensive security measures');
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<SecurityConfig>): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService(config);
    }
    return SecurityService.instance;
  }

  /**
   * Validate and sanitize user input
   */
  validateInput(input: string, type: 'text' | 'email' | 'filename' | 'url'): { isValid: boolean; sanitized?: string; errors: string[] } {
    const errors: string[] = [];

    if (!input || typeof input !== 'string') {
      errors.push('Input must be a non-empty string');
      return { isValid: false, errors };
    }

    if (input.length > this.config.maxInputLength) {
      errors.push(`Input exceeds maximum length of ${this.config.maxInputLength} characters`);
    }

    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
          errors.push('Invalid email format');
        }
        break;

      case 'filename':
        const filenameRegex = /^[a-zA-Z0-9._-]+$/;
        if (!filenameRegex.test(input)) {
          errors.push('Filename contains invalid characters');
        }
        if (input.length > 255) {
          errors.push('Filename too long');
        }
        break;

      case 'url':
        try {
          new URL(input);
        } catch {
          errors.push('Invalid URL format');
        }
        break;

      case 'text':
      default:
        // Check for potentially dangerous content
        const dangerousPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /data:text\/html/gi
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(input)) {
            errors.push('Input contains potentially dangerous content');
            break;
          }
        }
        break;
    }

    const isValid = errors.length === 0;
    const sanitized = isValid && this.config.enableSanitization ? this.sanitizeInput(input, type) : input;

    return { isValid, sanitized, errors };
  }

  /**
   * Sanitize user input
   */
  private sanitizeInput(input: string, type: 'text' | 'email' | 'filename' | 'url'): string {
    let sanitized = input.trim();

    switch (type) {
      case 'email':
        sanitized = sanitized.toLowerCase();
        break;

      case 'filename':
        sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
        break;

      case 'url':
        // Ensure URL has protocol
        if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
          sanitized = `https://${  sanitized}`;
        }
        break;

      case 'text':
      default:
        // Remove HTML tags and dangerous content
        sanitized = sanitized
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/data:text\/html/gi, '');
        break;
    }

    return sanitized;
  }

  /**
   * Validate file upload
   */
  validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      errors.push(`File size exceeds maximum of ${this.config.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!this.config.allowedFileTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check filename
    const filenameValidation = this.validateInput(file.name, 'filename');
    if (!filenameValidation.isValid) {
      errors.push(...filenameValidation.errors);
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (suspiciousExtensions.includes(fileExtension)) {
      errors.push('File type not allowed for security reasons');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check rate limiting
   */
  async checkRateLimit(userId: string, endpoint: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    if (!this.config.enableRateLimiting) {
      return { allowed: true, remaining: this.config.maxRequestsPerMinute, resetTime: new Date() };
    }

    const key = `${userId}:${endpoint}`;
    const now = new Date();
    const windowMs = 60 * 1000; // 1 minute

    const currentLimit = this.rateLimitMap.get(key);
    
    if (!currentLimit || now.getTime() - currentLimit.windowStart.getTime() > windowMs) {
      // New window or expired window
      this.rateLimitMap.set(key, {
        userId,
        endpoint,
        requests: 1,
        windowStart: now,
        blocked: false
      });
      return { allowed: true, remaining: this.config.maxRequestsPerMinute - 1, resetTime: new Date(now.getTime() + windowMs) };
    }

    if (currentLimit.blocked) {
      return { allowed: false, remaining: 0, resetTime: new Date(currentLimit.windowStart.getTime() + windowMs) };
    }

    if (currentLimit.requests >= this.config.maxRequestsPerMinute) {
      currentLimit.blocked = true;
      this.logSecurityEvent({
        userId,
        eventType: 'rate_limit_exceeded',
        details: { endpoint, requests: currentLimit.requests },
        severity: 'medium'
      });
      return { allowed: false, remaining: 0, resetTime: new Date(currentLimit.windowStart.getTime() + windowMs) };
    }

    currentLimit.requests++;
    return { allowed: true, remaining: this.config.maxRequestsPerMinute - currentLimit.requests, resetTime: new Date(currentLimit.windowStart.getTime() + windowMs) };
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    if (!this.config.enableAuditLogging) return;

    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.securityEvents.push(securityEvent);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', securityEvent);
    }

    // TODO: Send to external security monitoring service
    this.sendToSecurityMonitoring(securityEvent);
  }

  /**
   * Detect suspicious activity
   */
  detectSuspiciousActivity(userId: string, action: string, details: Record<string, any>): boolean {
    const patterns = [
      // Multiple failed login attempts
      { pattern: 'auth_failure', threshold: 5, window: 300000 }, // 5 minutes
      // Rapid file uploads
      { pattern: 'file_upload', threshold: 10, window: 60000 }, // 1 minute
      // API abuse
      { pattern: 'api_request', threshold: 100, window: 60000 }, // 1 minute
    ];

    const recentEvents = this.securityEvents.filter(event => 
      event.userId === userId && 
      event.eventType === action &&
      Date.now() - event.timestamp.getTime() < 300000 // 5 minutes
    );

    for (const { pattern, threshold, window } of patterns) {
      if (action.includes(pattern) && recentEvents.length >= threshold) {
        this.logSecurityEvent({
          userId,
          eventType: 'suspicious_activity',
          details: { action, count: recentEvents.length, threshold },
          severity: 'high'
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    blockedUsers: number;
    rateLimitViolations: number;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    this.securityEvents.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    const rateLimitViolations = this.securityEvents.filter(e => e.eventType === 'rate_limit_exceeded').length;

    return {
      totalEvents: this.securityEvents.length,
      eventsByType,
      eventsBySeverity,
      blockedUsers: this.blockedIPs.size,
      rateLimitViolations
    };
  }

  /**
   * Setup security monitoring
   */
  private setupSecurityMonitoring(): void {
    // Monitor for authentication state changes
    auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        this.logSecurityEvent({
          userId: user.uid,
          eventType: 'auth_success',
          details: { email: user.email, provider: user.providerData[0]?.providerId },
          severity: 'low'
        });
      }
    });

    // Clean up old rate limit entries
    setInterval(() => {
      const now = new Date();
      for (const [key, limit] of this.rateLimitMap.entries()) {
        if (now.getTime() - limit.windowStart.getTime() > 300000) { // 5 minutes
          this.rateLimitMap.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Send security event to monitoring service
   */
  private async sendToSecurityMonitoring(event: SecurityEvent): Promise<void> {
    // TODO: Implement integration with external security monitoring service
    // This could be Sentry, LogRocket, or a custom security monitoring system
    
    if (event.severity === 'critical' || event.severity === 'high') {
      // Send immediate alert for high-severity events
      console.warn('High severity security event detected:', event);
    }
  }

  /**
   * Generate security headers
   */
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    if (this.config.enableCSP) {
      headers['Content-Security-Policy'] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://openrouter.ai https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://apis.google.com",
        "frame-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
    }

    if (this.config.enableHSTS) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    return headers;
  }

  /**
   * Validate API request
   */
  async validateApiRequest(userId: string, endpoint: string, method: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check rate limiting
    const rateLimit = await this.checkRateLimit(userId, endpoint);
    if (!rateLimit.allowed) {
      errors.push('Rate limit exceeded');
    }

    // Check for suspicious activity
    if (this.detectSuspiciousActivity(userId, 'api_request', { endpoint, method })) {
      errors.push('Suspicious activity detected');
    }

    // Log the request
    this.logSecurityEvent({
      userId,
      eventType: 'api_request',
      details: { endpoint, method, allowed: errors.length === 0 },
      severity: errors.length > 0 ? 'medium' : 'low'
    });

    return { valid: errors.length === 0, errors };
  }
}
