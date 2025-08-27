/**
 * Security Middleware
 * Provides authentication, rate limiting, and input validation for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/services/security/SecurityService';
import { EncryptionService } from '@/services/security/EncryptionService';

export interface SecurityMiddlewareConfig {
  requireAuth: boolean;
  enableRateLimiting: boolean;
  enableInputValidation: boolean;
  enableEncryption: boolean;
  allowedMethods: string[];
  maxRequestSize: number;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

export class SecurityMiddleware {
  private static securityService = SecurityService.getInstance();
  private static encryptionService = EncryptionService.getInstance();

  /**
   * Create security middleware
   */
  static create(config: Partial<SecurityMiddlewareConfig> = {}) {
    const defaultConfig: Required<SecurityMiddlewareConfig> = {
      requireAuth: true,
      enableRateLimiting: true,
      enableInputValidation: true,
      enableEncryption: false,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      ...config
    };

    return async (request: NextRequest): Promise<NextResponse | null> => {
      try {
        // 1. Method validation
        if (!defaultConfig.allowedMethods.includes(request.method)) {
          return this.createErrorResponse('Method not allowed', 405);
        }

        // 2. Request size validation
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > defaultConfig.maxRequestSize) {
          return this.createErrorResponse('Request too large', 413);
        }

        // 3. Authentication check
        if (defaultConfig.requireAuth) {
          const authResult = await this.authenticateRequest(request);
          if (!authResult.authenticated) {
            return this.createErrorResponse('Authentication required', 401);
          }
          
          // Add user to request
          (request as AuthenticatedRequest).user = authResult.user;
        }

        // 4. Rate limiting
        if (defaultConfig.enableRateLimiting && (request as AuthenticatedRequest).user) {
          const rateLimitResult = await this.securityService.checkRateLimit(
            (request as AuthenticatedRequest).user!.uid,
            request.nextUrl.pathname
          );
          
          if (!rateLimitResult.allowed) {
            return this.createErrorResponse('Rate limit exceeded', 429, {
              'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
            });
          }
        }

        // 5. Input validation
        if (defaultConfig.enableInputValidation) {
          const validationResult = await this.validateRequest(request);
          if (!validationResult.valid) {
            return this.createErrorResponse('Invalid input', 400, {}, validationResult.errors);
          }
        }

        // 6. Add security headers
        const response = NextResponse.next();
        const securityHeaders = this.securityService.getSecurityHeaders();
        
        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return null; // Continue to handler

      } catch (error) {
        console.error('Security middleware error:', error);
        return this.createErrorResponse('Internal server error', 500);
      }
    };
  }

  /**
   * Authenticate request
   */
  private static async authenticateRequest(request: NextRequest): Promise<{
    authenticated: boolean;
    user?: { uid: string; email: string; displayName?: string };
  }> {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false };
      }

      // For now, we'll do a basic token validation
      // In a production environment, you would verify the JWT token properly
      const token = authHeader.substring(7);
      
      // Basic token format validation (JWT tokens have 3 parts separated by dots)
      if (!token.includes('.') || token.split('.').length !== 3) {
        return { authenticated: false };
      }

      // TODO: Implement proper JWT verification with Firebase Admin SDK
      // For now, we'll assume the token is valid if it has the correct format
      return {
        authenticated: true,
        user: {
          uid: 'temp-user-id', // This would be extracted from the verified token
          email: 'temp@example.com',
          displayName: undefined
        }
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { authenticated: false };
    }
  }

  /**
   * Validate request input
   */
  private static async validateRequest(request: NextRequest): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Validate URL parameters
      const urlParams = request.nextUrl.searchParams;
      for (const [key, value] of urlParams.entries()) {
        const validation = this.securityService.validateInput(value, 'text');
        if (!validation.isValid) {
          errors.push(`Invalid URL parameter '${key}': ${validation.errors.join(', ')}`);
        }
      }

      // Validate request body for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          const body = await request.json();
          const bodyValidation = this.validateJsonBody(body);
          if (!bodyValidation.valid) {
            errors.push(...bodyValidation.errors);
          }
        } else if (contentType?.includes('multipart/form-data')) {
          const formData = await request.formData();
          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              const fileValidation = this.securityService.validateFile(value);
              if (!fileValidation.isValid) {
                errors.push(`Invalid file '${key}': ${fileValidation.errors.join(', ')}`);
              }
            } else if (typeof value === 'string') {
              const validation = this.securityService.validateInput(value, 'text');
              if (!validation.isValid) {
                errors.push(`Invalid form field '${key}': ${validation.errors.join(', ')}`);
              }
            }
          }
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error('Request validation error:', error);
      return { valid: false, errors: ['Request validation failed'] };
    }
  }

  /**
   * Validate JSON request body
   */
  private static validateJsonBody(body: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
      errors.push('Request body must be a valid JSON object');
      return { valid: false, errors };
    }

    // Check for circular references
    try {
      JSON.stringify(body);
    } catch (error) {
      errors.push('Request body contains circular references');
    }

    // Validate specific fields if they exist
    if (body.email && typeof body.email === 'string') {
      const emailValidation = this.securityService.validateInput(body.email, 'email');
      if (!emailValidation.isValid) {
        errors.push(`Invalid email: ${emailValidation.errors.join(', ')}`);
      }
    }

    if (body.name && typeof body.name === 'string') {
      const nameValidation = this.securityService.validateInput(body.name, 'text');
      if (!nameValidation.isValid) {
        errors.push(`Invalid name: ${nameValidation.errors.join(', ')}`);
      }
    }

    if (body.content && typeof body.content === 'string') {
      const contentValidation = this.securityService.validateInput(body.content, 'text');
      if (!contentValidation.isValid) {
        errors.push(`Invalid content: ${contentValidation.errors.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create error response
   */
  private static createErrorResponse(
    message: string,
    status: number,
    headers: Record<string, string> = {},
    errors?: string[]
  ): NextResponse {
    const response = NextResponse.json(
      {
        error: message,
        status,
        timestamp: new Date().toISOString(),
        ...(errors && { details: errors })
      },
      { status }
    );

    // Add security headers
    const securityHeaders = this.securityService.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add custom headers
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  /**
   * Encrypt response data
   */
  static async encryptResponse(data: any, password: string): Promise<any> {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = await this.encryptionService.encrypt(jsonString, password);
      return { encrypted: true, data: encrypted };
    } catch (error) {
      console.error('Response encryption failed:', error);
      return data; // Return original data if encryption fails
    }
  }

  /**
   * Decrypt request data
   */
  static async decryptRequest(encryptedData: any, password: string): Promise<any> {
    try {
      if (!encryptedData.encrypted || !encryptedData.data) {
        return encryptedData;
      }

      const decrypted = await this.encryptionService.decrypt(encryptedData.data, password);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Request decryption failed:', error);
      throw new Error('Failed to decrypt request data');
    }
  }

  /**
   * Log security event
   */
  static logSecurityEvent(event: {
    userId?: string;
    eventType: 'auth_success' | 'auth_failure' | 'file_upload' | 'api_request' | 'validation_error' | 'rate_limit_exceeded' | 'suspicious_activity' | 'navigation' | 'security_check';
    details: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    this.securityService.logSecurityEvent(event);
  }

  /**
   * Get security statistics
   */
  static getSecurityStats() {
    return this.securityService.getSecurityStats();
  }
}
