import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment variable
 * Falls back to NEXTAUTH_SECRET if API_KEYS_ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.API_KEYS_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  
  if (!key) {
    throw new Error("API_KEYS_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set for API key encryption");
  }

  // Derive a 32-byte key from the secret using PBKDF2
  return crypto.pbkdf2Sync(key, "api-keys-salt", 100000, KEY_LENGTH, "sha512");
}

/**
 * Encrypt API key value
 */
export function encryptApiKey(keyValue: string): string {
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(keyValue, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Combine IV + tag + encrypted data
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt API key value
 */
export function decryptApiKey(encryptedValue: string): string {
  try {
    const encryptionKey = getEncryptionKey();
    const parts = encryptedValue.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(parts[0]!, "hex");
    const tag = Buffer.from(parts[1]!, "hex");
    const encrypted = parts[2]!;

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[API Keys] Decryption error:", error);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * Mask API key for display (show only last 4 characters)
 */
export function maskApiKey(keyValue: string): string {
  if (!keyValue || keyValue.length <= 4) {
    return "****";
  }
  return `...${keyValue.slice(-4)}`;
}

/**
 * Get active API key for a provider
 * Returns decrypted key value and key ID (for tracking usage)
 */
export async function getActiveApiKey(
  provider: string
): Promise<{ key: string; keyId: string } | null> {
  const { prisma } = await import("@/lib/prisma");
  
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      provider: provider.toLowerCase(),
      isActive: true,
    },
    orderBy: {
      createdAt: "desc", // Use most recent active key
    },
  });

  if (!apiKey) {
    return null;
  }

  try {
    const decryptedKey = decryptApiKey(apiKey.keyValue);
    return { key: decryptedKey, keyId: apiKey.id };
  } catch (error) {
    console.error(`[API Keys] Failed to decrypt key for provider ${provider}:`, error);
    return null;
  }
}

/**
 * Get active API key value only (for backward compatibility)
 */
export async function getActiveApiKeyValue(provider: string): Promise<string | null> {
  const result = await getActiveApiKey(provider);
  return result?.key ?? null;
}

/**
 * Update lastUsedAt timestamp for an API key
 */
export async function markApiKeyUsed(keyId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { lastUsedAt: new Date() },
  });
}

