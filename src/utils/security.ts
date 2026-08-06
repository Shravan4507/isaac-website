import * as OTPAuth from 'otpauth';

// 1. Password Hashing (using browser-native SubtleCrypto)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "isaac-salt-2026-secure");
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. Helper to derive a key for GCM encryption/decryption
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 10000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypts a plaintext string using a password
export async function encryptData(plaintext: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secretKey, salt);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(plaintext)
  );

  // Concatenate salt + iv + encrypted data
  const result = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.byteLength);
  result.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

  // Encode to Base64
  return btoa(String.fromCharCode(...result));
}

// Decrypts an encrypted Base64 string using a password
export async function decryptData(ciphertextBase64: string, secretKey: string): Promise<string> {
  const decoder = new TextDecoder();
  const binaryString = atob(ciphertextBase64);
  const data = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    data[i] = binaryString.charCodeAt(i);
  }

  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encrypted = data.slice(28);

  const key = await deriveKey(secretKey, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );
  return decoder.decode(decrypted);
}

// 3. TOTP Generation and Verification (using otpauth)
export function generateTOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function generateTOTPURI(secretBase32: string, label: string, issuer: string = "ISAAC"): string {
  const totp = new OTPAuth.TOTP({
    issuer: issuer,
    label: label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32)
  });
  return totp.toString();
}

export function verifyTOTPToken(token: string, secretBase32: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: 'ISAAC',
    label: 'ClubAdmin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32)
  });

  const delta = totp.validate({
    token: token.trim(),
    window: 1
  });

  return delta !== null;
}

// 4. Base64 & WebAuthn signature verification helpers
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert DER signature to raw 64-byte signature
export function derToRaw(derBuffer: ArrayBuffer): ArrayBuffer {
  const der = new Uint8Array(derBuffer);
  if (der[0] !== 0x30) throw new Error("Invalid DER signature");

  let offset = 2; // Skip sequence tag and length

  const readInteger = () => {
    if (der[offset++] !== 0x02) throw new Error("Invalid DER integer tag");
    let len = der[offset++];
    if (der[offset] === 0x00) {
      offset++;
      len--;
    }
    const res = der.slice(offset, offset + len);
    offset += len;
    return res;
  };

  const r = readInteger();
  const s = readInteger();

  const pad = (arr: Uint8Array, len: number) => {
    if (arr.length === len) return arr;
    const res = new Uint8Array(len);
    if (arr.length < len) {
      res.set(arr, len - arr.length);
    } else {
      return arr.slice(arr.length - len);
    }
    return res;
  };

  const raw = new Uint8Array(64);
  raw.set(pad(r, 32), 0);
  raw.set(pad(s, 32), 32);
  return raw.buffer;
}

// Verify WebAuthn ECDSA P-256 signature
export async function verifyPasskeySignature(
  publicKeyBase64: string,
  authenticatorData: ArrayBuffer,
  clientDataJSON: ArrayBuffer,
  signatureDER: ArrayBuffer
): Promise<boolean> {
  try {
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "ECDSA",
        namedCurve: "P-256",
        hash: { name: "SHA-256" }
      },
      true,
      ["verify"]
    );

    // Hash clientDataJSON
    const clientDataHash = await window.crypto.subtle.digest("SHA-256", clientDataJSON);

    // Concatenate authenticatorData and clientDataHash
    const authData = new Uint8Array(authenticatorData);
    const hashData = new Uint8Array(clientDataHash);
    const signedData = new Uint8Array(authData.byteLength + hashData.byteLength);
    signedData.set(authData, 0);
    signedData.set(hashData, authData.byteLength);

    // Convert signature from DER to raw format
    const rawSignature = derToRaw(signatureDER);

    // Verify signature
    return await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" }
      },
      publicKey,
      rawSignature,
      signedData.buffer
    );
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}
