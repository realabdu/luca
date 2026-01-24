import { createHash, randomBytes } from "crypto";
import { ConvexHttpClient } from "convex/browser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export interface ApiKeyValidationResult {
  valid: boolean;
  organizationId?: string;
  permissions?: string[];
  error?: string;
}

/**
 * Generate a new API key
 * Format: luca_pk_[32 random hex chars]
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(16).toString("hex");
  const key = `luca_pk_${randomPart}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 16); // "luca_pk_" + first 8 chars

  return { key, keyHash, keyPrefix };
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate an API key from a request
 */
export async function validateApiKey(
  request: Request,
  requiredPermission?: string
): Promise<ApiKeyValidationResult> {
  if (!client) {
    return { valid: false, error: "Convex not configured" };
  }

  // Extract API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  let apiKey: string;

  // Support both "Bearer <key>" and just "<key>"
  if (authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.substring(7);
  } else {
    apiKey = authHeader;
  }

  // Validate key format
  if (!apiKey.startsWith("luca_pk_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  // Hash the key and look it up
  const keyHash = hashApiKey(apiKey);

  try {
    const result = await client.query(api.apiKeys.validateKey, { keyHash });

    if (!result) {
      return { valid: false, error: "Invalid API key" };
    }

    if (result.revokedAt) {
      return { valid: false, error: "API key has been revoked" };
    }

    // Check permission if required
    if (requiredPermission && !result.permissions.includes(requiredPermission)) {
      return {
        valid: false,
        error: `API key missing required permission: ${requiredPermission}`,
      };
    }

    // Update last used timestamp (fire and forget)
    client.mutation(api.apiKeys.updateLastUsed, { keyHash }).catch(() => {
      // Ignore errors
    });

    return {
      valid: true,
      organizationId: result.organizationId,
      permissions: result.permissions,
    };
  } catch (error) {
    console.error("API key validation error:", error);
    return { valid: false, error: "Failed to validate API key" };
  }
}

/**
 * Extract organization ID from a validated API key request
 * Returns null if not authenticated
 */
export async function getOrganizationFromApiKey(
  request: Request,
  requiredPermission?: string
): Promise<string | null> {
  const result = await validateApiKey(request, requiredPermission);
  return result.valid && result.organizationId ? result.organizationId : null;
}
