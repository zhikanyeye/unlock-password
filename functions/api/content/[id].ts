const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REVOKE_TOKEN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const REVOKE_HASH = /^[0-9a-f]{64}$/;
const ALLOWED_EXPIRATION_TIMES: readonly number[] = [
  3600000, 86400000, 604800000, 2592000000, 15552000000, -1,
];
const ALLOWED_TYPES: readonly string[] = [
  'AES', 'DES', 'TripleDES', 'Rabbit', 'RC4', 'QYS1-AES-GCM',
];

interface CiphertextKV {
  get(key: string): Promise<string | null>;
  put?(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete?(key: string): Promise<void>;
}

interface Env {
  CIPHERTEXT_KV?: CiphertextKV;
}

interface PagesContext {
  request: Request;
  env: Env;
  params: { id?: string | string[] };
}

interface StoredData {
  text: string;
  type: string;
  timestamp: number;
  expirationTime: number;
  revokeHash?: string;
  requestHash?: string;
}

function json(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function parseStoredData(stored: string): StoredData {
  const data: unknown = JSON.parse(stored);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
  const record = data as Record<string, unknown>;
  const hasRevokeHash = Object.prototype.hasOwnProperty.call(record, 'revokeHash');
  const hasRequestHash = Object.prototype.hasOwnProperty.call(record, 'requestHash');
  if (Object.keys(record).length !== 4 + Number(hasRevokeHash) + Number(hasRequestHash) ||
      Object.keys(record).some((key) => !['text', 'type', 'timestamp', 'expirationTime', 'revokeHash', 'requestHash'].includes(key)) ||
      (hasRequestHash && !hasRevokeHash) ||
      typeof record.text !== 'string' || !record.text ||
      typeof record.type !== 'string' || !ALLOWED_TYPES.includes(record.type) ||
      typeof record.timestamp !== 'number' || !Number.isFinite(record.timestamp) ||
      typeof record.expirationTime !== 'number' || !ALLOWED_EXPIRATION_TIMES.includes(record.expirationTime) ||
      (hasRevokeHash && (typeof record.revokeHash !== 'string' || !REVOKE_HASH.test(record.revokeHash))) ||
      (hasRequestHash && (typeof record.requestHash !== 'string' || !REVOKE_HASH.test(record.requestHash)))) {
    throw new Error();
  }
  return record as unknown as StoredData;
}

function isExpired(data: StoredData): boolean {
  return data.expirationTime !== -1 && Date.now() >= data.timestamp + data.expirationTime;
}

export async function onRequestGet({ request, env, params }: PagesContext): Promise<Response> {
  const origin = request.headers.get('Origin');
  if ((origin && origin !== new URL(request.url).origin) ||
      request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Forbidden' }, 403);
  }
  const id = params?.id;
  if (typeof id !== 'string' || !UUID.test(id)) return json({ error: 'Invalid content ID' }, 400);
  if (!env?.CIPHERTEXT_KV || typeof env.CIPHERTEXT_KV.get !== 'function') {
    return json({ error: 'Content storage unavailable' }, 503);
  }

  let stored: string | null;
  try {
    if (await env.CIPHERTEXT_KV.get(`revoked:${id}`)) return json({ error: 'Content not found' }, 404);
    stored = await env.CIPHERTEXT_KV.get(id);
  } catch {
    return json({ error: 'Unable to retrieve content' }, 500);
  }
  if (stored === null) return json({ error: 'Content not found' }, 404);

  try {
    const data = parseStoredData(stored);
    if (isExpired(data)) return json({ error: 'Content expired' }, 404);
    return json({ text: data.text, type: data.type, timestamp: data.timestamp, expirationTime: data.expirationTime });
  } catch {
    return json({ error: 'Unable to retrieve content' }, 500);
  }
}

export async function onRequestDelete({ request, env, params }: PagesContext): Promise<Response> {
  const origin = request.headers.get('Origin');
  if (origin !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Forbidden' }, 403);
  }
  const id = params?.id;
  if (typeof id !== 'string' || !UUID.test(id)) return json({ error: 'Invalid content ID' }, 400);
  const token = request.headers.get('X-Revoke-Token');
  if (!token || !REVOKE_TOKEN.test(token)) return json({ error: 'Forbidden' }, 403);
  if (!env?.CIPHERTEXT_KV || typeof env.CIPHERTEXT_KV.get !== 'function' ||
      typeof env.CIPHERTEXT_KV.put !== 'function' || typeof env.CIPHERTEXT_KV.delete !== 'function') {
    return json({ error: 'Content storage unavailable' }, 503);
  }

  let stored: string | null;
  try {
    stored = await env.CIPHERTEXT_KV.get(id);
  } catch {
    return json({ error: 'Unable to retrieve content' }, 500);
  }
  if (stored === null) return json({ error: 'Content not found' }, 404);

  let data: StoredData;
  try {
    data = parseStoredData(stored);
  } catch {
    return json({ error: 'Unable to retrieve content' }, 500);
  }
  if (isExpired(data) || !data.revokeHash) return json({ error: 'Content not found' }, 404);

  const hash = Array.from(new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
  ), (byte) => byte.toString(16).padStart(2, '0')).join('');
  let difference = 0;
  for (let i = 0; i < hash.length; i++) {
    difference |= hash.charCodeAt(i) ^ data.revokeHash.charCodeAt(i);
  }
  if (difference !== 0) return json({ error: 'Forbidden' }, 403);

  try {
    // The marker must outlive the content, otherwise a late retry could recreate it.
    await env.CIPHERTEXT_KV.put(`revoked:${id}`, '1', data.expirationTime === -1 ? undefined : {
      expirationTtl: Math.max(60, Math.ceil((data.timestamp + data.expirationTime - Date.now()) / 1000)),
    });
    await env.CIPHERTEXT_KV.delete(id);
  } catch {
    return json({ error: 'Unable to delete content' }, 500);
  }
  return json({ success: true });
}
