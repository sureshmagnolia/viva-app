/**
 * Native Web Crypto API (crypto.subtle) utility for AES-256-GCM End-to-End Encryption.
 * Provides client-side zero-knowledge encryption for viva-app room synchronization.
 */

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to Uint8Array
function base64ToUint8Array(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a given room code using PBKDF2.
 * @param {string} roomCode 
 * @returns {Promise<CryptoKey>}
 */
export async function deriveRoomKey(roomCode) {
  if (!roomCode) throw new Error("Room code is required for encryption key derivation.");
  const normalizedCode = String(roomCode).trim().toUpperCase();
  const enc = new TextEncoder();
  
  // Import raw room password
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(normalizedCode),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Use room code as deterministic salt
  const salt = enc.encode(`viva_salt_${normalizedCode}`);

  // Derive AES-256-GCM key
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 10000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an object into an AES-256-GCM base64 payload packet.
 * @param {Object} dataObj 
 * @param {CryptoKey} cryptoKey 
 * @returns {Promise<{iv: string, ciphertext: string, isEncrypted: true}>}
 */
export async function encryptPayload(dataObj, cryptoKey) {
  if (!cryptoKey) return dataObj; // Return unencrypted if key not initialized

  try {
    const enc = new TextEncoder();
    const jsonStr = JSON.stringify(dataObj);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      cryptoKey,
      enc.encode(jsonStr)
    );

    return {
      isEncrypted: true,
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(encryptedBuffer)
    };
  } catch (err) {
    console.error("Encryption failed:", err);
    throw err;
  }
}

/**
 * Decrypts an AES-256-GCM base64 packet back to original JavaScript object.
 * @param {Object} payload 
 * @param {CryptoKey} cryptoKey 
 * @returns {Promise<Object|null>} Decrypted object or null if invalid key/tampered payload
 */
export async function decryptPayload(payload, cryptoKey) {
  if (!payload) return null;
  if (!payload.isEncrypted || !payload.iv || !payload.ciphertext) {
    // If packet is not encrypted format, return as-is for backward compatibility or null
    return payload;
  }
  if (!cryptoKey) return null;

  try {
    const dec = new TextDecoder();
    const iv = base64ToUint8Array(payload.iv);
    const ciphertext = base64ToUint8Array(payload.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      cryptoKey,
      ciphertext
    );

    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch (err) {
    // Key mismatch or tampered payload
    console.warn("Decryption failed (mismatched room key or tampered packet):", err);
    return null;
  }
}
