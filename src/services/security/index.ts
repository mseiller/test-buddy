/**
 * Security Services Index
 * Provides unified access to all security-related services
 */

export { SecurityService } from './SecurityService';
export { EncryptionService } from './EncryptionService';
export type { SecurityConfig, SecurityEvent, RateLimitInfo } from './SecurityService';
export type { EncryptionConfig, EncryptedData } from './EncryptionService';

import { SecurityService } from './SecurityService';
import { EncryptionService } from './EncryptionService';

/**
 * Unified Security Management Service
 * Provides a centralized interface for all security operations
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private securityService: SecurityService;
  private encryptionService: EncryptionService;

  private constructor() {
    this.securityService = SecurityService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Initialize security services with configuration
   */
  static initialize(config?: {
    security?: Partial<import('./SecurityService').SecurityConfig>;
    encryption?: Partial<import('./EncryptionService').EncryptionConfig>;
  }): SecurityManager {
    const instance = SecurityManager.getInstance();
    
    if (config?.security) {
      instance.securityService = SecurityService.getInstance(config.security);
    }
    
    if (config?.encryption) {
      instance.encryptionService = EncryptionService.getInstance(config.encryption);
    }
    
    return instance;
  }

  /**
   * Get security service instance
   */
  getSecurityService(): SecurityService {
    return this.securityService;
  }

  /**
   * Get encryption service instance
   */
  getEncryptionService(): EncryptionService {
    return this.encryptionService;
  }

  /**
   * Validate and sanitize input
   */
  validateInput(input: string, type: 'text' | 'email' | 'filename' | 'url') {
    return this.securityService.validateInput(input, type);
  }

  /**
   * Validate file upload
   */
  validateFile(file: File) {
    return this.securityService.validateFile(file);
  }

  /**
   * Check rate limiting
   */
  async checkRateLimit(userId: string, endpoint: string) {
    return this.securityService.checkRateLimit(userId, endpoint);
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: Omit<import('./SecurityService').SecurityEvent, 'timestamp'>) {
    this.securityService.logSecurityEvent(event);
  }

  /**
   * Detect suspicious activity
   */
  detectSuspiciousActivity(userId: string, action: string, details: Record<string, any>) {
    return this.securityService.detectSuspiciousActivity(userId, action, details);
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return this.securityService.getSecurityStats();
  }

  /**
   * Get security headers
   */
  getSecurityHeaders() {
    return this.securityService.getSecurityHeaders();
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string, password: string) {
    return this.encryptionService.encrypt(data, password);
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: import('./EncryptionService').EncryptedData, password: string) {
    return this.encryptionService.decrypt(encryptedData, password);
  }

  /**
   * Hash data
   */
  async hash(data: string, salt?: string) {
    return this.encryptionService.hash(data, salt);
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string, salt: string) {
    return this.encryptionService.verifyHash(data, hash, salt);
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length?: number) {
    return this.encryptionService.generateSecureToken(length);
  }

  /**
   * Encrypt user data
   */
  async encryptUserData(data: Record<string, any>, userId: string) {
    return this.encryptionService.encryptUserData(data, userId);
  }

  /**
   * Decrypt user data
   */
  async decryptUserData(encryptedData: import('./EncryptionService').EncryptedData, userId: string) {
    return this.encryptionService.decryptUserData(encryptedData, userId);
  }

  /**
   * Encrypt file
   */
  async encryptFile(file: File, password: string) {
    return this.encryptionService.encryptFile(file, password);
  }

  /**
   * Decrypt file
   */
  async decryptFile(encryptedFile: File, password: string) {
    return this.encryptionService.decryptFile(encryptedFile, password);
  }

  /**
   * Validate API request
   */
  async validateApiRequest(userId: string, endpoint: string, method: string) {
    return this.securityService.validateApiRequest(userId, endpoint, method);
  }

  /**
   * Comprehensive security check for user action
   */
  async performSecurityCheck(userId: string, action: string, data?: any) {
    const results = {
      inputValid: true,
      rateLimitOk: true,
      suspiciousActivity: false,
      errors: [] as string[]
    };

    try {
      // Check rate limiting
      const rateLimit = await this.checkRateLimit(userId, action);
      if (!rateLimit.allowed) {
        results.rateLimitOk = false;
        results.errors.push('Rate limit exceeded');
      }

      // Check for suspicious activity
      if (this.detectSuspiciousActivity(userId, action, { data })) {
        results.suspiciousActivity = true;
        results.errors.push('Suspicious activity detected');
      }

      // Validate input data if provided
      if (data && typeof data === 'string') {
        const validation = this.validateInput(data, 'text');
        if (!validation.isValid) {
          results.inputValid = false;
          results.errors.push(...validation.errors);
        }
      }

      // Log the security check
      this.logSecurityEvent({
        userId,
        eventType: 'security_check',
        details: {
          action,
          results,
          dataType: typeof data
        },
        severity: results.errors.length > 0 ? 'medium' : 'low'
      });

    } catch (error) {
      console.error('Security check failed:', error);
      results.errors.push('Security check failed');
    }

    return results;
  }

  /**
   * Get security health status
   */
  getSecurityHealth() {
    const stats = this.getSecurityStats();
    const recentEvents = stats.totalEvents;
    const highSeverityEvents = (stats.eventsBySeverity.high || 0) + (stats.eventsBySeverity.critical || 0);
    const rateLimitViolations = stats.rateLimitViolations;

    let health = 'excellent';
    let score = 100;

    // Deduct points for various security issues
    if (highSeverityEvents > 10) {
      score -= 30;
      health = 'poor';
    } else if (highSeverityEvents > 5) {
      score -= 20;
      health = 'fair';
    } else if (highSeverityEvents > 0) {
      score -= 10;
      health = 'good';
    }

    if (rateLimitViolations > 50) {
      score -= 20;
      health = score < 70 ? 'poor' : 'fair';
    } else if (rateLimitViolations > 20) {
      score -= 10;
      health = score < 70 ? 'fair' : 'good';
    }

    if (recentEvents > 1000) {
      score -= 10;
      health = score < 70 ? 'fair' : 'good';
    }

    return {
      health,
      score: Math.max(0, score),
      stats: {
        totalEvents: recentEvents,
        highSeverityEvents,
        rateLimitViolations,
        blockedUsers: stats.blockedUsers
      },
      recommendations: this.getSecurityRecommendations(score, stats)
    };
  }

  /**
   * Get security recommendations based on current status
   */
  private getSecurityRecommendations(score: number, stats: any) {
    const recommendations = [];

    if (score < 70) {
      recommendations.push('Immediate action required: Review security logs and investigate high-severity events');
    }

    if (stats.eventsBySeverity.critical > 0) {
      recommendations.push('Critical security events detected: Implement immediate security measures');
    }

    if (stats.rateLimitViolations > 20) {
      recommendations.push('High rate limit violations: Consider implementing stricter rate limiting');
    }

    if (stats.blockedUsers > 0) {
      recommendations.push('Users are being blocked: Review blocking criteria and user behavior');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security status is good. Continue monitoring and regular security reviews.');
    }

    return recommendations;
  }
}

// Export the security manager as default
export default SecurityManager;
