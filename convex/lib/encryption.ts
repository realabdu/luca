/**
 * Encryption utilities for Convex runtime
 * Uses Web Crypto API which is available in Convex
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

// Cache derived keys
const keyCache = new Map<string, CryptoKey>();

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
async function deriveKey(keyString: string): Promise<CryptoKey> {
  // Return cached key if available
  if (keyCache.has(keyString)) {
    return keyCache.get(keyString)!;
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);

  // Import as PBKDF2 base key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Fixed salt for deterministic derivation
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

  keyCache.set(keyString, derivedKey);
  return derivedKey;
}

/**
 * Encrypt data using AES-GCM
 * @param plaintext - The text to encrypt
 * @param encryptionKey - The encryption key from environment
 */
export async function encrypt(plaintext: string, encryptionKey: string): Promise<string> {
  const key = await deriveKey(encryptionKey);

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
 * Decrypt data using AES-GCM
 * @param encryptedData - The base64 encoded encrypted data
 * @param encryptionKey - The encryption key from environment
 */
export async function decrypt(encryptedData: string, encryptionKey: string): Promise<string> {
  const key = await deriveKey(encryptionKey);

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
