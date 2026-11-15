const MAX_BODY_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXPIRATION_TIMES: readonly number[] = [
  3600000, 86400000, 604800000, 2592000000, 15552000000, -1,
];
const ALLOWED_TYPES: readonly string[] = [
  'AES', 'DES', 'TripleDES', 'Rabbit', 'RC4', 'QYS1-AES-GCM',
];
const FIELDS = ['text', 'type', 'expirationTime', 'revokeToken', 'createdAt'];
const REVOKE_TOKEN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

interface CiphertextKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expiration?: number }): Promise<void>;
}

interface Env {
  CIPHERTEXT_KV?: CiphertextKV;
  ADMIN_TOKEN?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface StoredData {
  text: string;
  type: string;
  timestamp: number;
  expirationTime: number;
  revokeHash: string;
  requestHash: string;
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

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return (!origin || origin === new URL(request.url).origin) &&
    request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: 'Forbidden' }, 403);
  if (!env?.CIPHERTEXT_KV || typeof env.CIPHERTEXT_KV.get !== 'function' ||
      typeof env.CIPHERTEXT_KV.put !== 'function') {
    return json({ error: 'Content storage unavailable' }, 503);
  }
  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Expected JSON' }, 415);
  }
  const contentLength = Number(request.headers.get('Content-Length'));
  if (contentLength > MAX_BODY_BYTES) return json({ error: 'Request body too large' }, 413);
  if (!request.body) return json({ error: 'Invalid JSON body' }, 400);

  let raw = '';
  let size = 0;
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return json({ error: 'Request body too large' }, 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return json({ error: 'Invalid content' }, 400);
  }
  const body = parsed as Record<string, unknown>;
  if (Object.keys(body).length !== FIELDS.length || Object.keys(body).some((field) => !FIELDS.includes(field))) {
    return json({ error: 'Invalid content fields' }, 400);
  }
  if (typeof body.text !== 'string' || body.text.length === 0 ||
      typeof body.type !== 'string' || !ALLOWED_TYPES.includes(body.type) ||
      typeof body.expirationTime !== 'number' ||
      !ALLOWED_EXPIRATION_TIMES.includes(body.expirationTime) ||
      typeof body.revokeToken !== 'string' || !REVOKE_TOKEN.test(body.revokeToken) ||
      typeof body.createdAt !== 'number' || !Number.isInteger(body.createdAt)) {
    return json({ error: 'Invalid content' }, 400);
  }
  const now = Date.now();
  if (Math.abs(body.createdAt - now) > MAX_CLOCK_SKEW_MS ||
      (body.expirationTime !== -1 && body.createdAt + body.expirationTime <= now)) {
    return json({ error: 'Invalid content' }, 400);
  }
  if (body.expirationTime === -1 &&
      (!env.ADMIN_TOKEN || request.headers.get('X-Admin-Token') !== env.ADMIN_TOKEN)) {
    return json({ error: 'Forbidden' }, 403);
  }

  const encoder = new TextEncoder();
  const tokenHash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body.revokeToken)));
  const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const revokeHash = toHex(tokenHash);
  const idBytes = tokenHash.slice(0, 16);
  idBytes[6] = (idBytes[6] & 0x0f) | 0x40;
  idBytes[8] = (idBytes[8] & 0x3f) | 0x80;
  const hex = toHex(idBytes);
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const requestHash = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify({
    text: body.text,
    type: body.type,
    expirationTime: body.expirationTime,
    createdAt: body.createdAt,
    revokeHash,
  })))));
  const result = { id, expirationTime: body.expirationTime, revokeToken: body.revokeToken };

  let stored: string | null;
  try {
    // A tombstone blocks sequential replay once visible in this KV location.
    if (await env.CIPHERTEXT_KV.get(`revoked:${id}`)) return json({ error: 'Content revoked' }, 409);
    stored = await env.CIPHERTEXT_KV.get(id);
  } catch {
    return json({ error: 'Unable to retrieve content' }, 500);
  }
  if (stored !== null) {
    let existing: unknown;
    try {
      existing = JSON.parse(stored);
    } catch {
      return json({ error: 'Unable to retrieve content' }, 500);
    }
    if (existing && typeof existing === 'object' && !Array.isArray(existing) &&
        (existing as Record<string, unknown>).requestHash === requestHash) {
      return json(result, 200);
    }
    return json({ error: 'Content ID conflict' }, 409);
  }

  const data: StoredData = {
    text: body.text,
    type: body.type,
    timestamp: body.createdAt,
    expirationTime: body.expirationTime,
    revokeHash,
    requestHash,
  };
  try {
    await env.CIPHERTEXT_KV.put(id, JSON.stringify(data), body.expirationTime === -1
      ? undefined : { expiration: Math.ceil((body.createdAt + body.expirationTime) / 1000) });
  } catch {
    return json({ error: 'Unable to store content' }, 500);
  }
  return json(result, 201);
}
