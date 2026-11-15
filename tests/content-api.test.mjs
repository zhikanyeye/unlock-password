import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/content.ts';
import { onRequestGet, onRequestDelete } from '../functions/api/content/[id].ts';
import { encryptSegmented, decryptSegmented } from '../src/utils/segmentedCrypto.ts';

const ttl = 180 * 24 * 60 * 60 * 1000;
const finiteTtls = [3600000, 86400000, 604800000, 2592000000, 15552000000];
const origin = 'https://example.pages.dev';
const ciphertext = 'QingYunShield:abc:encrypted:def:End';
const makePayload = (overrides = {}) => ({
  text: ciphertext,
  type: 'AES',
  expirationTime: ttl,
  revokeToken: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  createdAt: Date.now(),
  ...overrides,
});

const makeEnv = () => {
  const values = new Map();
  const puts = [];
  const deletes = [];
  return {
    ADMIN_TOKEN: 'server-only-secret',
    CIPHERTEXT_KV: {
      get: async id => values.get(id) ?? null,
      put: async (id, value, options) => {
        puts.push({ id, value, options });
        values.set(id, value);
      },
      delete: async id => {
        deletes.push(id);
        values.delete(id);
      },
    },
    values,
    puts,
    deletes,
  };
};
const postRequest = (body, headers = {}) => new Request(`${origin}/api/content`, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});
const post = (env, body, headers = {}) => onRequestPost({ request: postRequest(body, headers), env });
const get = (env, id) => onRequestGet({
  request: new Request(`${origin}/api/content/${id}`), env, params: { id },
});
const remove = (env, id, token, headers = {}) => onRequestDelete({
  request: new Request(`${origin}/api/content/${id}`, {
    method: 'DELETE', headers: { Origin: origin, ...(token === undefined ? {} : { 'X-Revoke-Token': token }), ...headers },
  }),
  env, params: { id },
});
const sha256Hex = async value => Array.from(new Uint8Array(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
), byte => byte.toString(16).padStart(2, '0')).join('');
const uuidFromToken = async token => {
  const hash = await sha256Hex(token);
  const variant = ((parseInt(hash[16], 16) & 3) | 8).toString(16);
  const hex = `${hash.slice(0, 12)}4${hash.slice(13, 16)}${variant}${hash.slice(17, 32)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

test('POST returns the supplied revoke token, stores only its hash, and GET omits hashes', async () => {
  const env = makeEnv();
  const payload = makePayload();
  const response = await post(env, payload);
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.deepEqual(Object.keys(created).sort(), ['expirationTime', 'id', 'revokeToken']);
  assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(created.id));
  assert.equal(created.id, await uuidFromToken(payload.revokeToken));
  assert.equal(created.expirationTime, ttl);
  assert.equal(created.revokeToken, payload.revokeToken);
  assert.equal(created.revokeToken.length, 43);
  assert.ok(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(created.revokeToken));

  const raw = env.values.get(created.id);
  assert.equal(typeof raw, 'string');
  assert.equal(raw.includes(created.revokeToken), false);
  const stored = JSON.parse(raw);
  assert.deepEqual(Object.keys(stored).sort(), ['expirationTime', 'requestHash', 'revokeHash', 'text', 'timestamp', 'type']);
  assert.equal(stored.text, ciphertext);
  assert.equal(stored.type, 'AES');
  assert.equal(stored.timestamp, payload.createdAt);
  assert.equal(stored.revokeHash, await sha256Hex(created.revokeToken));
  assert.ok(/^[0-9a-f]{64}$/.test(stored.revokeHash));
  assert.ok(/^[0-9a-f]{64}$/.test(stored.requestHash));

  const fetched = await get(env, created.id);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.headers.get('Cache-Control'), 'no-store');
  const body = await fetched.json();
  assert.deepEqual(Object.keys(body).sort(), ['expirationTime', 'text', 'timestamp', 'type']);
  assert.equal(body.text, stored.text);
  assert.equal(body.timestamp, stored.timestamp);
  assert.equal(JSON.stringify(body).includes(created.revokeToken), false);
  assert.equal(JSON.stringify(body).includes(stored.revokeHash), false);
  assert.equal(JSON.stringify(body).includes(stored.requestHash), false);
});

test('repeating a visible POST returns the same ID and token without another write', async () => {
  const env = makeEnv();
  const payload = makePayload();
  const firstResponse = await post(env, payload);
  assert.equal(firstResponse.status, 201);
  const first = await firstResponse.json();
  const firstWrite = env.puts[0];

  const retry = await post(env, payload);
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), first);
  assert.equal(first.revokeToken, payload.revokeToken);
  assert.equal(env.puts.length, 1);
  assert.equal(env.puts[0], firstWrite);
});

test('a stale KV read permits retrying the same key, value, and absolute expiry', async () => {
  const env = makeEnv();
  const payload = makePayload();
  const first = await (await post(env, payload)).json();
  const firstWrite = env.puts[0];
  let reads = 0;
  env.CIPHERTEXT_KV.get = async () => {
    reads++;
    return null;
  };

  const retry = await post(env, payload);
  assert.equal(retry.status, 201);
  assert.deepEqual(await retry.json(), first);
  assert.ok(reads > 0);
  assert.equal(env.puts.length, 2);
  assert.deepEqual(env.puts[1], firstWrite);
  assert.deepEqual(firstWrite.options, { expiration: Math.ceil((payload.createdAt + ttl) / 1000) });
});

test('reusing a token for different ciphertext conflicts without overwriting visible content', async () => {
  const env = makeEnv();
  const payload = makePayload();
  const first = await (await post(env, payload)).json();
  const original = env.values.get(first.id);
  const conflict = await post(env, { ...payload, text: `${ciphertext}:different` });
  assert.equal(conflict.status, 409);
  const body = await conflict.text();
  assert.equal(body.includes(payload.revokeToken), false);
  assert.equal(body.includes(JSON.parse(original).revokeHash), false);
  assert.equal(body.includes(JSON.parse(original).requestHash), false);
  assert.equal(env.puts.length, 1);
  assert.equal(env.values.get(first.id), original);
});

for (const duration of finiteTtls) {
  test(`finite expiration ${duration} ms uses absolute KV expiration`, async () => {
    const env = makeEnv();
    const payload = makePayload({ expirationTime: duration });
    const response = await post(env, payload);
    assert.equal(response.status, 201);
    const { id, expirationTime } = await response.json();
    assert.equal(expirationTime, duration);
    assert.equal(env.puts.length, 1);
    assert.equal(env.puts[0].id, id);
    assert.deepEqual(env.puts[0].options, { expiration: Math.ceil((payload.createdAt + duration) / 1000) });
    assert.equal(JSON.parse(env.values.get(id)).expirationTime, duration);
  });
}

test('permanent records require the configured admin secret and have no KV TTL', async () => {
  const env = makeEnv();
  const permanent = makePayload({ expirationTime: -1 });
  assert.equal((await post(env, permanent)).status, 403);
  assert.equal((await post(env, permanent, { 'X-Admin-Token': 'wrong-secret' })).status, 403);
  assert.equal(env.puts.length, 0);

  const noSecretEnv = makeEnv();
  delete noSecretEnv.ADMIN_TOKEN;
  assert.equal((await post(noSecretEnv, permanent, { 'X-Admin-Token': 'server-only-secret' })).status, 403);
  assert.equal(noSecretEnv.puts.length, 0);

  const response = await post(env, permanent, { 'X-Admin-Token': env.ADMIN_TOKEN });
  assert.equal(response.status, 201);
  const { id, expirationTime } = await response.json();
  assert.equal(expirationTime, -1);
  assert.equal(env.puts.length, 1);
  assert.equal(env.puts[0].id, id);
  assert.equal(env.puts[0].options, undefined);
  const fetched = await get(env, id);
  assert.equal(fetched.status, 200);
  assert.deepEqual(Object.keys(await fetched.json()).sort(), ['expirationTime', 'text', 'timestamp', 'type']);
});

test('rejects plaintext fields, unsupported expiration times, and cross-origin posts', async () => {
  const env = makeEnv();
  const { revokeToken: _token, ...withoutToken } = makePayload();
  const { createdAt: _createdAt, ...withoutCreatedAt } = makePayload();
  for (const invalid of [
    makePayload({ plaintext: 'secret' }),
    makePayload({ revokeHash: '0'.repeat(64) }),
    makePayload({ expirationTime: 0 }),
    makePayload({ expirationTime: 3600001 }),
    makePayload({ expirationTime: '3600000' }),
    makePayload({ revokeToken: 'invalid' }),
    makePayload({ createdAt: 'now' }),
    withoutToken,
    withoutCreatedAt,
  ]) {
    assert.equal((await post(env, invalid)).status, 400);
  }
  assert.equal((await post(env, makePayload(), { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await post(env, makePayload(), { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal(env.puts.length, 0);
});

test('rejects createdAt outside the five-minute window', async () => {
  const env = makeEnv();
  const now = Date.now();
  for (const createdAt of [now - 5 * 60 * 1000 - 2000, now + 5 * 60 * 1000 + 2000]) {
    assert.equal((await post(env, makePayload({ createdAt }))).status, 400);
  }
  assert.equal(env.puts.length, 0);
});

test('POST enforces the request body size limit without writing to KV', async () => {
  const env = makeEnv();
  assert.equal((await post(env, makePayload({ text: 'x'.repeat(300 * 1024) }))).status, 413);
  assert.equal((await post(env, makePayload(), { 'Content-Length': String(300 * 1024 + 1) })).status, 413);
  assert.equal(env.puts.length, 0);
});

test('DELETE forbids missing, wrong, and cross-origin tokens; valid token removes the record', async () => {
  const env = makeEnv();
  const { id, revokeToken } = await (await post(env, makePayload())).json();
  const other = await (await post(env, makePayload())).json();

  assert.equal((await remove(env, id)).status, 403);
  assert.equal((await remove(env, id, 'invalid')).status, 403);
  const wrongToken = await remove(env, id, other.revokeToken);
  assert.equal(wrongToken.status, 403);
  const forbiddenBody = await wrongToken.text();
  const stored = JSON.parse(env.values.get(id));
  for (const secret of [revokeToken, other.revokeToken, stored.revokeHash, stored.requestHash]) {
    assert.equal(forbiddenBody.includes(secret), false);
  }
  assert.equal((await remove(env, id, revokeToken, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await onRequestDelete({
    request: new Request(`${origin}/api/content/${id}`, {
      method: 'DELETE', headers: { 'X-Revoke-Token': revokeToken },
    }),
    env, params: { id },
  })).status, 403);
  assert.equal((await remove(env, id, revokeToken, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal(env.deletes.length, 0);
  assert.equal(env.values.has(id), true);

  const removed = await remove(env, id, revokeToken);
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { success: true });
  assert.deepEqual(env.deletes, [id]);
  assert.equal(env.values.has(id), false);
  assert.equal(env.values.has(other.id), true);
  assert.equal((await get(env, id)).status, 404);
});

test('visible revocation marker prevents sequential replay of the same upload', async () => {
  const env = makeEnv();
  const request = makePayload();
  const { id, revokeToken } = await (await post(env, request)).json();
  assert.equal((await remove(env, id, revokeToken)).status, 200);
  assert.equal(env.values.get(`revoked:${id}`), '1');
  assert.equal((await get(env, id)).status, 404);
  const replay = await post(env, request);
  assert.equal(replay.status, 409);
  assert.equal(env.values.has(id), false);
});

test('legacy KV records without revokeHash remain readable but cannot be revoked', async () => {
  const env = makeEnv();
  const id = crypto.randomUUID();
  env.values.set(id, JSON.stringify({ text: ciphertext, type: 'AES', timestamp: Date.now(), expirationTime: ttl }));
  const { revokeToken } = await (await post(env, makePayload())).json();

  const fetched = await get(env, id);
  assert.equal(fetched.status, 200);
  const body = await fetched.json();
  assert.equal(body.text, ciphertext);
  assert.deepEqual(Object.keys(body).sort(), ['expirationTime', 'text', 'timestamp', 'type']);
  assert.equal((await remove(env, id, revokeToken)).status, 404);
  assert.equal(env.deletes.length, 0);
  assert.equal(env.values.has(id), true);
});

test('expired records cannot be fetched even if KV has not yet removed them', async () => {
  const env = makeEnv();
  const id = crypto.randomUUID();
  env.values.set(id, JSON.stringify({ text: ciphertext, type: 'AES', timestamp: Date.now() - ttl - 1, expirationTime: ttl }));
  assert.equal((await get(env, id)).status, 404);
  assert.equal(env.values.has(id), true);
});

test('missing KV capabilities fail closed without deleting stored content', async () => {
  const env = makeEnv();
  const { id, revokeToken } = await (await post(env, makePayload())).json();
  assert.equal((await post({}, makePayload())).status, 503);
  assert.equal((await get({}, id)).status, 503);
  assert.equal((await remove({}, id, revokeToken)).status, 503);
  delete env.CIPHERTEXT_KV.delete;
  assert.equal((await remove(env, id, revokeToken)).status, 503);
  assert.equal(env.deletes.length, 0);
  assert.equal(env.values.has(id), true);
});

test('client A posts QYS1 ciphertext; client B fetches and decrypts with a separately shared key', async () => {
  const env = makeEnv();
  const plaintext = 'Private cross-device message 🔐';
  const { ciphertext: encrypted, key: separatelySharedKey } = await encryptSegmented(plaintext);
  const request = postRequest(makePayload({ text: encrypted, type: 'QYS1-AES-GCM' }));
  const requestData = `${request.url}\n${JSON.stringify([...request.headers])}\n${await request.clone().text()}`;
  assert.equal(requestData.includes(plaintext), false);
  assert.equal(requestData.includes(separatelySharedKey), false);

  const createdResponse = await onRequestPost({ request, env });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  const stored = env.values.get(created.id);
  assert.equal(typeof stored, 'string');
  assert.equal(stored.includes(plaintext), false);
  assert.equal(stored.includes(separatelySharedKey), false);
  assert.equal(JSON.stringify(created).includes(plaintext), false);
  assert.equal(JSON.stringify(created).includes(separatelySharedKey), false);

  const clientBRequest = new Request(`${origin}/api/content/${created.id}`);
  const clientBRequestData = `${clientBRequest.url}\n${JSON.stringify([...clientBRequest.headers])}`;
  assert.equal(clientBRequestData.includes(plaintext), false);
  assert.equal(clientBRequestData.includes(separatelySharedKey), false);
  const fetchedResponse = await onRequestGet({ request: clientBRequest, env, params: { id: created.id } });
  assert.equal(fetchedResponse.status, 200);
  const fetched = await fetchedResponse.json();
  assert.equal(fetched.type, 'QYS1-AES-GCM');
  assert.equal(fetched.text, encrypted);
  assert.equal(JSON.stringify(fetched).includes(plaintext), false);
  assert.equal(JSON.stringify(fetched).includes(separatelySharedKey), false);
  assert.equal(await decryptSegmented(fetched.text, separatelySharedKey), plaintext);
});
