import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptSegmented, decryptSegmented } from '../src/utils/segmentedCrypto.ts';

for (const text of ['', '中文🔐\nHTTPS://example.com', 'x'.repeat(40_000)]) {
  test(`QYS1 round-trip (${text.length} chars)`, async () => {
    const { ciphertext, key } = await encryptSegmented(text);
    assert.equal(await decryptSegmented(ciphertext, key), text);
    assert.equal(JSON.parse(ciphertext).algorithm, 'QYS1-AES-GCM');
  });
}

test('QYS1 rejects wrong keys, modified chunks and truncated envelopes', async () => {
  const { ciphertext, key } = await encryptSegmented('secret'.repeat(8_000));
  const another = await encryptSegmented('another');
  await assert.rejects(decryptSegmented(ciphertext, another.key));
  const tampered = JSON.parse(ciphertext);
  tampered.chunks[0] = (tampered.chunks[0][0] === 'A' ? 'B' : 'A') + tampered.chunks[0].slice(1);
  await assert.rejects(decryptSegmented(JSON.stringify(tampered), key));
  tampered.chunks.pop();
  await assert.rejects(decryptSegmented(JSON.stringify(tampered), key));
});

test('QYS1 enforces its plaintext limit', async () => {
  await assert.rejects(encryptSegmented('x'.repeat(200 * 1024 + 1)));
});
