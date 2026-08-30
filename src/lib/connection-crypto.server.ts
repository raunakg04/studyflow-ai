import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Lovable auto-provisions APP_USER_CONNECTION_KEY_SECRET (base64, 32 bytes)
// when an App User Connector is linked. Fall back to the service role key
// material so Canvas tokens can still be encrypted on self-hosted deploys.
function key(): Buffer {
  const raw = process.env['APP_USER_CONNECTION_KEY_SECRET'];
  if (raw) return Buffer.from(raw, "base64");
  const fallback = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!fallback) throw new Error("No encryption secret available on the server");
  return createHashKey(fallback);
}

function createHashKey(seed: string): Buffer {
  // Derive a stable 32-byte key from the seed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(seed).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
