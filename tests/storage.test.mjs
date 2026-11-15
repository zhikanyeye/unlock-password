import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { onRequestPost } from '../functions/api/content.ts';
import { onRequestGet, onRequestDelete } from '../functions/api/content/[id].ts';
import { encryptSegmented } from '../src/utils/segmentedCrypto.ts';

// Bundle in memory: Node's type stripping cannot load the imported TS enum.
const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../src/services/apiService.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const {
  CloudUploadUncertainError,
  storeEncryptedContent,
  getEncryptedContent,
  revokeCloudContent,
} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

const origin = 'https://example.pages.dev';
const duration = 60 * 60 * 1000;
const type = 'QYS1-AES-GCM';
const plaintext = 'Private message only decryptable with an independent key 🔐';

async function encryptedMessage() {
  const { ciphertext, key } = await encryptSegmented(plaintext);
  assert.ok(!ciphertext.includes(plaintext));
  assert.ok(!ciphertext.includes(key));
  return { ciphertext, key };
}

function assertNoSecrets(value, key) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  assert.ok(!serialized.includes(plaintext), 'plaintext must not leave the client');
  assert.ok(!serialized.includes(key), 'decryption key must not leave the client');
}

function installStorageFlow(t) {
  const previousStorage = globalThis.localStorage;
  const previousFetch = globalThis.fetch;
  const local = new Map();
  const values = new Map();
  const puts = [];
  const deletes = [];
  const requests = [];
  let loseNextPostResponse = false;

  globalThis.localStorage = {
    get length() { return local.size; },
    key: index => [...local.keys()][index] ?? null,
    getItem: key => local.get(key) ?? null,
    setItem: (key, value) => { local.set(key, String(value)); },
    removeItem: key => { local.delete(key); },
  };
  const env = {
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
  };
  globalThis.fetch = async (input, init = {}) => {
    const headers = new Headers(init.headers);
    if (init.method === 'POST' || init.method === 'DELETE') headers.set('Origin', origin);
    const request = new Request(new URL(input, origin), { ...init, headers });
    const body = await request.clone().text();
    const path = new URL(request.url).pathname;
    const match = /^\/api\/content\/([^/]+)$/.exec(path);
    let response;
    if (path === '/api/content' && request.method === 'POST') {
      response = await onRequestPost({ request, env });
    } else if (match && request.method === 'GET') {
      response = await onRequestGet({ request, env, params: { id: decodeURIComponent(match[1]) } });
    } else if (match && request.method === 'DELETE') {
      response = await onRequestDelete({ request, env, params: { id: decodeURIComponent(match[1]) } });
    } else {
      throw new Error(`Unexpected fetch: ${request.method} ${request.url}`);
    }
    requests.push({ method: request.method, url: request.url, headers: [...request.headers],
      body, status: response.status });
    if (request.method === 'POST' && loseNextPostResponse) {
      loseNextPostResponse = false;
      throw new Error('Connection lost after server commit');
    }
    return response;
  };
  t.after(() => {
    globalThis.localStorage = previousStorage;
    globalThis.fetch = previousFetch;
  });
  return { local, values, puts, deletes, requests,
    loseNextPostResponse: () => { loseNextPostResponse = true; } };
}

test('local mode persists only ciphertext and never calls the cloud', async t => {
  const { local, values, requests } = installStorageFlow(t);
  const { ciphertext, key } = await encryptedMessage();
  const saved = await storeEncryptedContent(ciphertext, type, undefined, 'local', duration);

  assert.equal(saved.cached, true);
  assert.equal(saved.canRevoke, false);
  assert.equal(saved.revokeToken, undefined);
  assert.equal(local.size, 1);
  const raw = local.get(`qingyun_${saved.id}`);
  assertNoSecrets(raw, key);
  assert.deepEqual(JSON.parse(raw), {
    text: ciphertext, type, timestamp: saved.timestamp, expirationTime: duration,
  });
  assert.equal((await getEncryptedContent(saved.id)).text, ciphertext);
  assert.deepEqual(requests, []);
  assert.equal(values.size, 0);
});

test('cloud upload retains the creator revoke token across GET and revokes', async t => {
  const { local, values, puts, deletes, requests } = installStorageFlow(t);
  const { ciphertext, key } = await encryptedMessage();
  const saved = await storeEncryptedContent(ciphertext, type, undefined, 'cloud', duration);

  assert.equal(saved.cached, true);
  assert.equal(saved.canRevoke, true);
  assert.match(saved.revokeToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].id, saved.id);
  assert.equal(puts[0].options.expiration, Math.ceil((saved.timestamp + duration) / 1000));
  assertNoSecrets(values.get(saved.id), key);
  assert.ok(!values.get(saved.id).includes(saved.revokeToken));
  const cached = JSON.parse(local.get(`qingyun_${saved.id}`));
  assert.equal(cached.revokeToken, saved.revokeToken);
  assert.equal(cached.text, ciphertext);
  assertNoSecrets(cached, key);

  const fetched = await getEncryptedContent(saved.id);
  assert.equal(fetched.text, ciphertext);
  assert.equal(fetched.timestamp, saved.timestamp);
  assert.equal(JSON.parse(local.get(`qingyun_${saved.id}`)).revokeToken, saved.revokeToken);
  await revokeCloudContent(saved.id);
  assert.deepEqual(deletes, [saved.id]);
  assert.equal(values.has(saved.id), false);
  assert.equal(values.get(`revoked:${saved.id}`), '1');
  assert.deepEqual({
    revokeToken: JSON.parse(local.get(`qingyun_${saved.id}`)).revokeToken,
    revoked: JSON.parse(local.get(`qingyun_${saved.id}`)).revoked,
  }, { revokeToken: undefined, revoked: true });
  assert.deepEqual(requests.map(request => [request.method, request.status]),
    [['POST', 201], ['GET', 200], ['DELETE', 200]]);
  for (const request of requests) assertNoSecrets(request, key);
  await assert.rejects(getEncryptedContent(saved.id), /已撤销/);
});

test('a committed POST with a lost response retries the same upload without another KV write', async t => {
  const { local, values, puts, requests, loseNextPostResponse } = installStorageFlow(t);
  const { ciphertext, key } = await encryptedMessage();
  loseNextPostResponse();
  let uncertain;
  try {
    await storeEncryptedContent(ciphertext, type, undefined, 'cloud', duration);
    assert.fail('the lost response should leave the upload uncertain');
  } catch (error) {
    assert.ok(error instanceof CloudUploadUncertainError);
    uncertain = error;
  }
  assert.equal(requests[0].status, 201);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].id, uncertain.id);
  assert.equal(local.size, 0);
  assert.match(uncertain.retry.revokeToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(typeof uncertain.retry.createdAt, 'number');

  const saved = await storeEncryptedContent(ciphertext, type, undefined, 'cloud', duration, uncertain.retry);
  assert.equal(saved.id, uncertain.id);
  assert.equal(saved.revokeToken, uncertain.retry.revokeToken);
  assert.equal(saved.timestamp, uncertain.retry.createdAt);
  assert.equal(saved.cached, true);
  assert.equal(puts.length, 1);
  assert.deepEqual(requests.map(request => request.status), [201, 200]);
  assert.equal(requests[0].body, requests[1].body);
  assert.deepEqual(Object.keys(JSON.parse(requests[0].body)).sort(),
    ['createdAt', 'expirationTime', 'revokeToken', 'text', 'type']);
  assert.equal(JSON.parse(requests[0].body).text, ciphertext);
  for (const request of requests) assertNoSecrets(request, key);
  assertNoSecrets(values.get(saved.id), key);
  assertNoSecrets(local.get(`qingyun_${saved.id}`), key);
});

test('disabled local storage does not block cloud GET or manual revoke', async t => {
  const { values, deletes, requests } = installStorageFlow(t);
  const { ciphertext, key } = await encryptedMessage();
  const saved = await storeEncryptedContent(ciphertext, type, undefined, 'cloud', duration);
  globalThis.localStorage.getItem = () => { throw new Error('Storage disabled'); };
  globalThis.localStorage.setItem = () => { throw new Error('Storage disabled'); };

  assert.equal((await getEncryptedContent(saved.id)).text, ciphertext);
  await revokeCloudContent(saved.id, saved.revokeToken);
  assert.deepEqual(deletes, [saved.id]);
  assert.equal(values.has(saved.id), false);
  assert.equal(values.get(`revoked:${saved.id}`), '1');
  assert.deepEqual(requests.map(request => [request.method, request.status]),
    [['POST', 201], ['GET', 200], ['DELETE', 200]]);
  for (const request of requests) assertNoSecrets(request, key);
});
