import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Lovable auto-provisions APP_USER_CONNECTION_KEY_SECRET (base64, 32 bytes)
// when an App User Connector is linked. Fall back to deriving a stable key
// from the service role secret so Canvas tokens can still be encrypted on
// self-hosted deploys.
function key(): Buffer {
  const raw = process.env['APP_USER_CONNECTION_KEY_SECRET'];
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
    return createHash("sha256").update(raw).digest();
  }
  const fallback = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!fallback) throw new Error("No encryption secret available on the server");
  return createHash("sha256").update(fallback).digest();
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
