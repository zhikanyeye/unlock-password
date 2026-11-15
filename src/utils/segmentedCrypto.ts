export const SEGMENTED_TYPE = 'QYS1-AES-GCM' as const;

const SEGMENT_SIZE = 16 * 1024;
const MAX_MESSAGE_BYTES = 200 * 1024;
const TAG_BYTES = 16;
const SALT_BYTES = 16;
const NONCE_PREFIX_BYTES = 8;
const KEY_BYTES = 32;
const MAX_CHUNKS = Math.ceil(MAX_MESSAGE_BYTES / SEGMENT_SIZE);
// Bound JSON parsing before validating the fields (200 KiB plus tags and base64url overhead).
const MAX_ENVELOPE_LENGTH = 300_000;
const encoder = new TextEncoder();

interface Envelope {
  version: 'QYS1';
  algorithm: typeof SEGMENTED_TYPE;
  salt: string;
  noncePrefix: string;
  segmentSize: number;
  byteLength: number;
  chunks: string[];
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encodedLength(byteLength: number): number {
  return Math.ceil(byteLength / 3) * 4 - ((3 - byteLength % 3) % 3);
}

function validEncoding(value: unknown, expectedBytes: number): value is string {
  return typeof value === 'string' &&
    value.length === encodedLength(expectedBytes) &&
    /^[A-Za-z0-9_-]*$/.test(value);
}

function fromBase64Url(value: string, expectedBytes: number): Uint8Array {
  if (!validEncoding(value, expectedBytes)) {
    throw new Error('Invalid segmented ciphertext encoding');
  }

  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  if (binary.length !== expectedBytes) {
    throw new Error('Invalid segmented ciphertext length');
  }
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (toBase64Url(bytes) !== value) {
    throw new Error('Non-canonical segmented ciphertext encoding');
  }
  return bytes;
}

function segmentLength(byteLength: number, index: number): number {
  return Math.min(SEGMENT_SIZE, Math.max(0, byteLength - index * SEGMENT_SIZE));
}

function nonce(prefix: Uint8Array, index: number): Uint8Array {
  const iv = new Uint8Array(12);
  iv.set(prefix);
  new DataView(iv.buffer).setUint32(NONCE_PREFIX_BYTES, index, false);
  return iv;
}

function additionalData(byteLength: number, count: number, index: number): Uint8Array {
  return encoder.encode(`${SEGMENTED_TYPE}|${byteLength}|${SEGMENT_SIZE}|${count}|${index}`);
}

async function deriveKey(rawKey: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', rawKey, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: encoder.encode(`${SEGMENTED_TYPE}|key`) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function parseEnvelope(ciphertext: string): Envelope {
  if (typeof ciphertext !== 'string' || ciphertext.length > MAX_ENVELOPE_LENGTH) {
    throw new Error('Invalid segmented ciphertext size');
  }

  const value: unknown = JSON.parse(ciphertext);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid segmented ciphertext envelope');
  }
  const envelope = value as Record<string, unknown>;
  if (
    Object.keys(envelope).length !== 7 ||
    envelope.version !== 'QYS1' ||
    envelope.algorithm !== SEGMENTED_TYPE ||
    envelope.segmentSize !== SEGMENT_SIZE ||
    typeof envelope.byteLength !== 'number' ||
    !Number.isSafeInteger(envelope.byteLength) ||
    envelope.byteLength < 0 ||
    envelope.byteLength > MAX_MESSAGE_BYTES ||
    !validEncoding(envelope.salt, SALT_BYTES) ||
    !validEncoding(envelope.noncePrefix, NONCE_PREFIX_BYTES) ||
    !Array.isArray(envelope.chunks)
  ) {
    throw new Error('Invalid segmented ciphertext envelope');
  }

  const byteLength = envelope.byteLength;
  const count = Math.max(1, Math.ceil(byteLength / SEGMENT_SIZE));
  if (
    count > MAX_CHUNKS ||
    envelope.chunks.length !== count ||
    !envelope.chunks.every((chunk, index) =>
      validEncoding(chunk, segmentLength(byteLength, index) + TAG_BYTES),
    )
  ) {
    throw new Error('Invalid segmented ciphertext chunks');
  }
  return envelope as unknown as Envelope;
}

export async function encryptSegmented(text: string): Promise<{ ciphertext: string; key: string }> {
  if (typeof text !== 'string' || text.length > MAX_MESSAGE_BYTES) {
    throw new Error('Message exceeds the 200 KiB limit');
  }
  // TextEncoder silently replaces lone UTF-16 surrogates, which would change the round-trip text.
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(++index);
      if (index >= text.length || next < 0xdc00 || next > 0xdfff) {
        throw new Error('Invalid UTF-16 input');
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error('Invalid UTF-16 input');
    }
  }
  const plaintext = encoder.encode(text);
  if (plaintext.length > MAX_MESSAGE_BYTES) {
    throw new Error('Message exceeds the 200 KiB limit');
  }

  const rawKey = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const prefix = crypto.getRandomValues(new Uint8Array(NONCE_PREFIX_BYTES));
  const aesKey = await deriveKey(rawKey, salt);
  const count = Math.max(1, Math.ceil(plaintext.length / SEGMENT_SIZE));
  const chunks: string[] = [];

  for (let index = 0; index < count; index++) {
    const start = index * SEGMENT_SIZE;
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce(prefix, index), additionalData: additionalData(plaintext.length, count, index), tagLength: 128 },
      aesKey,
      plaintext.subarray(start, start + segmentLength(plaintext.length, index)),
    );
    chunks.push(toBase64Url(new Uint8Array(encrypted)));
  }

  const envelope: Envelope = {
    version: 'QYS1',
    algorithm: SEGMENTED_TYPE,
    salt: toBase64Url(salt),
    noncePrefix: toBase64Url(prefix),
    segmentSize: SEGMENT_SIZE,
    byteLength: plaintext.length,
    chunks,
  };
  return { ciphertext: JSON.stringify(envelope), key: toBase64Url(rawKey) };
}

export async function decryptSegmented(ciphertext: string, key: string): Promise<string> {
  const envelope = parseEnvelope(ciphertext);
  const rawKey = fromBase64Url(key, KEY_BYTES);
  const salt = fromBase64Url(envelope.salt, SALT_BYTES);
  const prefix = fromBase64Url(envelope.noncePrefix, NONCE_PREFIX_BYTES);
  const encryptedChunks = envelope.chunks.map((chunk, index) =>
    fromBase64Url(chunk, segmentLength(envelope.byteLength, index) + TAG_BYTES),
  );
  const aesKey = await deriveKey(rawKey, salt);
  const plaintext = new Uint8Array(envelope.byteLength);

  for (let index = 0; index < encryptedChunks.length; index++) {
    const encrypted = encryptedChunks[index];
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce(prefix, index), additionalData: additionalData(envelope.byteLength, envelope.chunks.length, index), tagLength: 128 },
      aesKey,
      encrypted,
    );
    if (decrypted.byteLength !== segmentLength(envelope.byteLength, index)) {
      throw new Error('Invalid segmented ciphertext length');
    }
    plaintext.set(new Uint8Array(decrypted), index * SEGMENT_SIZE);
  }

  return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
}
