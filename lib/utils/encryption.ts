import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Generate one with: openssl rand -hex 32');
  }
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    // Hex string (32 bytes = 64 hex chars)
    return key;
  }
  
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters). Generate with: openssl rand -hex 32');
  }
  
  return key;
}

/**
 * Derive a key from the encryption key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plaintext - Text to encrypt
 * @param key - Encryption key (hex string or buffer)
 * @returns Encrypted string in format: salt:iv:tag:encrypted
 */
export function encrypt(plaintext: string, key?: string): string {
  const encryptionKey = key || getEncryptionKey();
  
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from password and salt
  const derivedKey = deriveKey(encryptionKey, salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag
  const tag = cipher.getAuthTag();
  
  // Return format: salt:iv:tag:encrypted (all hex)
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt encrypted text using AES-256-GCM
 * @param encrypted - Encrypted string in format: salt:iv:tag:encrypted
 * @param key - Encryption key (hex string or buffer)
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string, key?: string): string {
  const encryptionKey = key || getEncryptionKey();
  
  // Split the encrypted string
  const parts = encrypted.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format. Expected: salt:iv:tag:encrypted');
  }
  
  const [saltHex, ivHex, tagHex, encryptedHex] = parts;
  
  // Convert hex strings to buffers
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  // Derive key from password and salt
  const derivedKey = deriveKey(encryptionKey, salt);
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);
  
  // Decrypt
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Test encryption/decryption (for validation)
 */
export function testEncryption(): boolean {
  try {
    const testText = 'test-connection-string';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    return decrypted === testText;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}

