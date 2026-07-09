import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY || "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"; // Fallback dev key
const KEY = Buffer.from(KEY_HEX, "hex");

export function encryptText(text) {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
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
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedContentHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.warn("Decryption failed, returning raw text:", err);
    return encryptedText; // Fallback to raw text if decryption fails
  }
}
