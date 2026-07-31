import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// AES-256 needs a 32-byte key, supplied as 64 hex chars via ENCRYPTION_KEY.
const REQUIRED_KEY_BYTES = 32;
// Local-only dev key. NEVER used in production — getKey() fails closed there.
const DEV_FALLBACK_KEY_HEX =
  "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

// Resolve the AES key, failing CLOSED in production. If a live deployment
// forgets ENCRYPTION_KEY, encrypting patient notes under the hardcoded dev
// key (which ships in the source) would make "encryption at rest"
// meaningless — anyone with the repo could decrypt them. Throwing instead
// means a misconfigured prod refuses to write/read notes rather than
// protecting them with a publicly-known key. Resolved lazily so a missing
// key only breaks note handling, not the whole module import.
function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY is not set. Refusing to encrypt/decrypt patient notes " +
          "with the built-in development key in production.",
      );
    }
    return Buffer.from(DEV_FALLBACK_KEY_HEX, "hex");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== REQUIRED_KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must be ${REQUIRED_KEY_BYTES} bytes (${REQUIRED_KEY_BYTES * 2} hex characters).`,
    );
  }
  return key;
}

export function encryptText(text) {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    // Format: iv:authTag:encryptedContent (all hex strings)
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Encryption failed");
  }
}

export function decryptText(encryptedText) {
  if (!encryptedText) return "";

  // Check if it fits the encrypted format (iv:authTag:content)
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    // If not encrypted, return as is (for dev seed files/compatibility)
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, encryptedContentHex] = parts;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedContentHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.warn("Decryption failed, returning raw text:", err);
    return encryptedText; // Fallback to raw text if decryption fails
  }
}
