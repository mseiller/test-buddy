/**
 * Data Encryption Service
 * Provides encryption and decryption for sensitive data
 */

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private config: Required<EncryptionConfig>;

  private constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      ivLength: 12,
      saltLength: 16,
      iterations: 100000,
      ...config
    };

    console.log('EncryptionService initialized with secure encryption settings');
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<EncryptionConfig>): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService(config);
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a secure random key
   */
  private async generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.config.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.config.algorithm, length: this.config.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate random bytes
   */
  private generateRandomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }

  /**
   * Convert array buffer or uint8array to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to array buffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string, password: string): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder();
      const salt = this.generateRandomBytes(this.config.saltLength);
      const iv = this.generateRandomBytes(this.config.ivLength);
      const key = await this.generateKey(password, salt);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv
        },
        key,
        encoder.encode(data)
      );

      return {
        encrypted: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
        algorithm: this.config.algorithm
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      const salt = new Uint8Array(this.base64ToArrayBuffer(encryptedData.salt));
      const iv = new Uint8Array(this.base64ToArrayBuffer(encryptedData.iv));
      const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
      const key = await this.generateKey(password, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.config.algorithm,
          iv
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  async hash(data: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder();
    const dataSalt = salt || this.arrayBufferToBase64(this.generateRandomBytes(16));
    const saltBuffer = new Uint8Array(this.base64ToArrayBuffer(dataSalt));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(data),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: this.config.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return {
      hash: this.arrayBufferToBase64(hashBuffer),
      salt: dataSalt
    };
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string, salt: string): Promise<boolean> {
    try {
      const { hash: computedHash } = await this.hash(data, salt);
      return computedHash === hash;
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random string
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
    
    return result;
  }

  /**
   * Encrypt sensitive user data
   */
  async encryptUserData(data: Record<string, any>, userId: string): Promise<EncryptedData> {
    const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    const encryptedData: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.includes(key) && typeof value === 'string') {
        const password = await this.generateUserKey(userId, key);
        const encrypted = await this.encrypt(value, password);
        encryptedData[key] = encrypted;
      } else {
        encryptedData[key] = value;
      }
    }

    const dataKey = await this.generateUserKey(userId, 'data');
    return await this.encrypt(JSON.stringify(encryptedData), dataKey);
  }

  /**
   * Decrypt sensitive user data
   */
  async decryptUserData(encryptedData: EncryptedData, userId: string): Promise<Record<string, any>> {
    const dataKey = await this.generateUserKey(userId, 'data');
    const decrypted = await this.decrypt(encryptedData, dataKey);
    const data = JSON.parse(decrypted);

    const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    const decryptedData: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.includes(key) && value && typeof value === 'object' && 'encrypted' in value) {
        const password = await this.generateUserKey(userId, key);
        decryptedData[key] = await this.decrypt(value as EncryptedData, password);
      } else {
        decryptedData[key] = value;
      }
    }

    return decryptedData;
  }

  /**
   * Generate user-specific encryption key
   */
  private async generateUserKey(userId: string, purpose: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = `${userId}:${purpose}:${process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'default-secret'}`;
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return this.arrayBufferToBase64(hash).substring(0, 32);
  }

  /**
   * Encrypt file content
   */
  async encryptFile(file: File, password: string): Promise<{ encryptedFile: File; metadata: EncryptedData }> {
    const arrayBuffer = await file.arrayBuffer();
    const content = this.arrayBufferToBase64(arrayBuffer);
    const encrypted = await this.encrypt(content, password);

    const encryptedBlob = new Blob([JSON.stringify(encrypted)], { type: 'application/octet-stream' });
    const encryptedFile = new File([encryptedBlob], `${file.name}.encrypted`, { type: 'application/octet-stream' });

    return { encryptedFile, metadata: encrypted };
  }

  /**
   * Decrypt file content
   */
  async decryptFile(encryptedFile: File, password: string): Promise<File> {
    const text = await encryptedFile.text();
    const encryptedData: EncryptedData = JSON.parse(text);
    const decryptedContent = await this.decrypt(encryptedData, password);
    const arrayBuffer = this.base64ToArrayBuffer(decryptedContent);

    const originalName = encryptedFile.name.replace('.encrypted', '');
    return new File([arrayBuffer], originalName, { type: 'application/octet-stream' });
  }
}
