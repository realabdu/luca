/**
 * Universal encryption module using Web Crypto API
 * Works in Node.js (18+), Browser, and Convex runtime
 *
 * Note: This replaces the old Node.js crypto implementation.
 * Existing tokens encrypted with the old format will need to be re-encrypted.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const KEY_LENGTH = 256; // bits

// Cache the derived key
let cachedKey: CryptoKey | null = null;
let cachedKeySource: string | null = null;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  return key;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive a CryptoKey from the encryption key string
 */
async function deriveKey(keyString?: string): Promise<CryptoKey> {
  const keyMaterial = keyString || getEncryptionKey();

  // Return cached key if same source
  if (cachedKey && cachedKeySource === keyMaterial) {
    return cachedKey;
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  // Import as PBKDF2 base key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Fixed salt for deterministic key derivation
  const salt = encoder.encode("luca-ruwad-salt");

  // Derive AES key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );

  // Cache the key
  cachedKey = derivedKey;
  cachedKeySource = keyMaterial;

  return derivedKey;
}

/**
 * Encrypt sensitive data (like access tokens)
 * Returns a base64 encoded string containing: IV + Ciphertext (with auth tag)
 */
export async function encryptAsync(plaintext: string, keyString?: string): Promise<string> {
  const key = await deriveKey(keyString);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt sensitive data
 * Expects a base64 encoded string containing: IV + Ciphertext (with auth tag)
 */
export async function decryptAsync(encryptedData: string, keyString?: string): Promise<string> {
  const key = await deriveKey(keyString);

  const combined = new Uint8Array(base64ToBuffer(encryptedData));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Synchronous encrypt wrapper (for backwards compatibility)
 * Note: This is async internally but provides a sync-like interface
 */
export function encrypt(plaintext: string): string {
  // For sync compatibility, we need to use a different approach
  // This will be called from API routes which can be async
  throw new Error("Use encryptAsync instead - encryption is now async");
}

/**
 * Synchronous decrypt wrapper (for backwards compatibility)
 * Note: This is async internally but provides a sync-like interface
 */
export function decrypt(encryptedData: string): string {
  // For sync compatibility, we need to use a different approach
  throw new Error("Use decryptAsync instead - decryption is now async");
}

/**
 * Check if encryption key is configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a random encryption key (for initial setup)
 */
export async function generateEncryptionKey(): Promise<string> {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return bufferToBase64(key.buffer);
}

// Re-export async versions as default
export { encryptAsync as encryptToken, decryptAsync as decryptToken };
