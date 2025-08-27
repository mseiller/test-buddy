/**
 * Input Sanitization
 * Provides comprehensive sanitization for all user inputs
 */

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  trimWhitespace?: boolean;
  removeExtraSpaces?: boolean;
  toLowerCase?: boolean;
  removeEmojis?: boolean;
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedMimeTypes?: string[];
  requireExtension?: boolean;
}

export class InputSanitizer {
  /**
   * Sanitize text input with various options
   */
  static sanitizeText(
    input: string | null | undefined,
    options: SanitizationOptions = {}
  ): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Trim whitespace if requested (default: true)
    if (options.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }

    // Remove or escape HTML if not allowed
    if (!options.allowHtml) {
      sanitized = this.escapeHtml(sanitized);
    }

    // Remove extra spaces
    if (options.removeExtraSpaces) {
      sanitized = sanitized.replace(/\s+/g, ' ');
    }

    // Convert to lowercase
    if (options.toLowerCase) {
      sanitized = sanitized.toLowerCase();
    }

    // Remove emojis
    if (options.removeEmojis) {
      sanitized = this.removeEmojis(sanitized);
    }

    // Remove special characters if not allowed
    if (!options.allowSpecialChars) {
      // Keep alphanumeric, spaces, and basic punctuation
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s.,!?;:()\-_'"]/g, '');
    }

    // Enforce max length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string | null | undefined): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    return email
      .trim()
      .toLowerCase()
      .replace(/[^\w@.-]/g, '') // Only allow word chars, @, ., and -
      .substring(0, 254); // RFC 5321 limit
  }

  /**
   * Sanitize password (minimal sanitization to preserve special chars)
   */
  static sanitizePassword(password: string | null | undefined): string {
    if (!password || typeof password !== 'string') {
      return '';
    }

    // Only trim and enforce reasonable length limit
    return password.trim().substring(0, 128);
  }

  /**
   * Sanitize file name
   */
  static sanitizeFileName(fileName: string | null | undefined): string {
    if (!fileName || typeof fileName !== 'string') {
      return 'unnamed_file';
    }

    return fileName
      .trim()
      // Remove dangerous characters
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      // Remove leading/trailing dots and spaces
      .replace(/^[.\s]+|[.\s]+$/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Limit length
      .substring(0, 255)
      || 'unnamed_file'; // Fallback if empty after sanitization
  }

  /**
   * Sanitize folder name
   */
  static sanitizeFolderName(folderName: string | null | undefined): string {
    if (!folderName || typeof folderName !== 'string') {
      return '';
    }

    return folderName
      .trim()
      // Remove dangerous characters
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      // Remove leading/trailing dots and spaces
      .replace(/^[.\s]+|[.\s]+$/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Limit length
      .substring(0, 50);
  }

  /**
   * Sanitize test name
   */
  static sanitizeTestName(testName: string | null | undefined): string {
    return this.sanitizeText(testName, {
      maxLength: 100,
      allowHtml: false,
      allowSpecialChars: true,
      removeExtraSpaces: true,
      trimWhitespace: true
    });
  }

  /**
   * Sanitize quiz question text
   */
  static sanitizeQuestionText(questionText: string | null | undefined): string {
    return this.sanitizeText(questionText, {
      maxLength: 1000,
      allowHtml: false,
      allowSpecialChars: true,
      removeExtraSpaces: true,
      trimWhitespace: true
    });
  }

  /**
   * Sanitize quiz answer text
   */
  static sanitizeAnswerText(answerText: string | null | undefined): string {
    return this.sanitizeText(answerText, {
      maxLength: 500,
      allowHtml: false,
      allowSpecialChars: true,
      removeExtraSpaces: true,
      trimWhitespace: true
    });
  }

  /**
   * Validate and sanitize file upload
   */
  static validateFile(
    file: File,
    options: FileValidationOptions = {}
  ): { isValid: boolean; errors: string[]; sanitizedName?: string } {
    const errors: string[] = [];

    // Check file size
    const maxSize = options.maxSize || 15 * 1024 * 1024; // 15MB default
    if (file.size > maxSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds limit (${this.formatFileSize(maxSize)})`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Check file type by extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.') + 1);

    if (options.requireExtension !== false && !extension) {
      errors.push('File must have an extension');
    }

    if (options.allowedTypes && options.allowedTypes.length > 0) {
      if (!options.allowedTypes.includes(extension)) {
        errors.push(`File type .${extension} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
      }
    }

    // Check MIME type
    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!options.allowedMimeTypes.includes(file.type)) {
        errors.push(`MIME type ${file.type} is not allowed`);
      }
    }

    // Sanitize file name
    const sanitizedName = this.sanitizeFileName(file.name);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName
    };
  }

  /**
   * Sanitize extracted text from files
   */
  static sanitizeExtractedText(text: string | null | undefined): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace but preserve structure
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim
      .trim()
      // Limit length to prevent memory issues
      .substring(0, 500000); // 500KB text limit
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string | null | undefined): string {
    return this.sanitizeText(query, {
      maxLength: 100,
      allowHtml: false,
      allowSpecialChars: false,
      removeExtraSpaces: true,
      trimWhitespace: true
    });
  }

  /**
   * Sanitize URL parameters
   */
  static sanitizeUrlParam(param: string | null | undefined): string {
    if (!param || typeof param !== 'string') {
      return '';
    }

    return param
      .trim()
      // Remove potentially dangerous characters
      .replace(/[<>"'&]/g, '')
      // Limit length
      .substring(0, 100);
  }

  /**
   * Deep sanitize object recursively
   */
  static sanitizeObject(obj: any, options: SanitizationOptions = {}): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj, options);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key, { maxLength: 50, allowSpecialChars: false });
        if (sanitizedKey) {
          sanitized[sanitizedKey] = this.sanitizeObject(value, options);
        }
      }
      return sanitized;
    }

    return obj;
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Escape HTML characters
   */
  private static escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
  }

  /**
   * Remove emoji characters
   */
  private static removeEmojis(text: string): string {
    // Unicode ranges for emojis
    return text.replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      ''
    );
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  }
}
