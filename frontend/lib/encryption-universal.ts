/**
 * Universal encryption module using Web Crypto API
 * Works in Node.js, Browser, and Convex runtime
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const KEY_LENGTH = 256; // bits

// Cache the derived key to avoid re-deriving on every operation
let cachedKey: CryptoKey | null = null;
let cachedKeySource: string | null = null;

/**
 * Get the encryption key from environment or provided value
 */
function getKeyMaterial(): string {
  // Try different env var access methods for compatibility
  const key =
    (typeof process !== "undefined" && process.env?.ENCRYPTION_KEY) ||
    (typeof globalThis !== "undefined" && (globalThis as any).ENCRYPTION_KEY);

  if (!key) {
    throw new Error("ENCRYPTION_KEY not configured");
  }
  return key;
}

/**
 * Derive a CryptoKey from the encryption key string
 */
async function deriveKey(keyString?: string): Promise<CryptoKey> {
  const keyMaterial = keyString || getKeyMaterial();

  // Return cached key if same source
  if (cachedKey && cachedKeySource === keyMaterial) {
    return cachedKey;
  }

  // Convert key string to bytes
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  // Import as raw key material for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Fixed salt for deterministic key derivation (same as original)
  const salt = encoder.encode("luca-ruwad-salt");

  // Derive the actual AES key
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
 * Encrypt sensitive data (like access tokens)
 * Returns a base64 encoded string containing: IV + Ciphertext (with auth tag)
 */
export async function encrypt(plaintext: string, keyString?: string): Promise<string> {
  const key = await deriveKey(keyString);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode plaintext
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Encrypt (GCM mode includes authentication tag in output)
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // Combine IV + Ciphertext (which includes auth tag)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt sensitive data
 * Expects a base64 encoded string containing: IV + Ciphertext (with auth tag)
 */
export async function decrypt(encryptedData: string, keyString?: string): Promise<string> {
  const key = await deriveKey(keyString);

  // Decode from base64
  const combined = new Uint8Array(base64ToBuffer(encryptedData));

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getKeyMaterial();
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
