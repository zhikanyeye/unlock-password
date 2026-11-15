import { EncryptionType } from '../utils/cryptoUtils';
import pako from 'pako';

export const EXPIRATION_OPTIONS = [
  { label: '1 小时', value: 60 * 60 * 1000 },
  { label: '1 天', value: 24 * 60 * 60 * 1000 },
  { label: '7 天', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 天', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '180 天', value: 180 * 24 * 60 * 60 * 1000 },
  { label: '永久（仅云端管理员）', value: -1 },
] as const;

export interface StoredData {
  text: string;
  type: EncryptionType;
  timestamp: number;
  expirationTime: number;
  compressed?: boolean; // Existing local records may use this format.
  cloud?: boolean;
  revoked?: boolean;
  revokeToken?: string; // Deletion capability, never the decryption key.
  isExpired?: boolean;
}

export interface LocalRecord {
  id: string;
  type: EncryptionType;
  timestamp: number;
  expirationTime: number;
  cloud: boolean;
  revoked: boolean;
  canRevoke: boolean;
}

const DEFAULT_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;
const NEVER_EXPIRE = -1;
const PREFIX = 'qingyun_';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REVOKE_TOKEN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
export type CloudRetry = { revokeToken: string; createdAt: number };

export class CloudUploadUncertainError extends Error {
  constructor(message: string, readonly retry: CloudRetry, readonly id: string) {
    super(message);
    this.name = 'CloudUploadUncertainError';
  }
}

async function shareIdFromToken(token: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateRevokeToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function checkId(id: string): void {
  if (!UUID.test(id)) throw new Error('无效的内容 ID');
}

function validRecord(value: unknown): value is StoredData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Partial<StoredData>;
  return typeof data.text === 'string' && data.text.length > 0 &&
    Object.values(EncryptionType).includes(data.type as EncryptionType) &&
    typeof data.timestamp === 'number' && Number.isFinite(data.timestamp) &&
    typeof data.expirationTime === 'number' &&
    (data.expirationTime === NEVER_EXPIRE || EXPIRATION_OPTIONS.some(option => option.value === data.expirationTime)) &&
    (data.revokeToken === undefined || (typeof data.revokeToken === 'string' && REVOKE_TOKEN.test(data.revokeToken)));
}

function unpack(data: StoredData): StoredData {
  let text = data.text;
  if (data.compressed) {
    const binary = atob(text);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    text = new TextDecoder().decode(pako.inflate(bytes));
  }
  return {
    text,
    type: data.type,
    timestamp: data.timestamp,
    expirationTime: data.expirationTime,
    isExpired: data.expirationTime !== NEVER_EXPIRE && Date.now() >= data.timestamp + data.expirationTime,
  };
}

/** Optional explicit cleanup: do not run this during saves, as expired local ciphertext is still useful for manual decryption. */
export function cleanupExpiredContent(): void {
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      const data: unknown = JSON.parse(localStorage.getItem(key) || 'null');
      if (!validRecord(data) || (data.expirationTime !== NEVER_EXPIRE && Date.now() >= data.timestamp + data.expirationTime)) {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
}

/** Persist ciphertext and metadata only. A revocation capability cannot decrypt the content. */
export async function storeEncryptedContent(
  text: string,
  type: EncryptionType,
  adminPassword?: string,
  mode: 'local' | 'cloud' = 'local',
  requestedExpirationTime: number = DEFAULT_EXPIRATION_TIME,
  retry?: CloudRetry,
): Promise<{ id: string; expirationTime: number; timestamp: number; cached: boolean; canRevoke: boolean; revokeToken?: string }> {
  if (!text || !Object.values(EncryptionType).includes(type)) throw new Error('无效的密文或算法');
  if (!EXPIRATION_OPTIONS.some(option => option.value === requestedExpirationTime)) throw new Error('无效的有效期');
  if (mode !== 'local' && mode !== 'cloud') throw new Error('无效的存储模式');
  if (requestedExpirationTime === NEVER_EXPIRE && (mode !== 'cloud' || !adminPassword)) {
    throw new Error('永久有效需要云端 ADMIN_TOKEN');
  }
  const expirationTime = requestedExpirationTime;
  const createdAt = mode === 'cloud' ? (retry?.createdAt ?? Date.now()) : Date.now();
  const record: StoredData = { text, type, timestamp: createdAt, expirationTime };

  if (mode === 'local') {
    const id = crypto.randomUUID();
    try {
      localStorage.setItem(PREFIX + id, JSON.stringify(record));
    } catch {
      throw new Error('本地浏览器无法保存密文，请检查存储空间或隐私设置');
    }
    return { id, expirationTime, timestamp: createdAt, cached: true, canRevoke: false };
  }

  const retryInfo: CloudRetry = retry ?? { revokeToken: generateRevokeToken(), createdAt };
  if (!REVOKE_TOKEN.test(retryInfo.revokeToken) || !Number.isSafeInteger(retryInfo.createdAt)) {
    throw new Error('无效的云端重试凭据');
  }
  const id = await shareIdFromToken(retryInfo.revokeToken);
  if (Math.abs(Date.now() - retryInfo.createdAt) > 5 * 60 * 1000) {
    throw new CloudUploadUncertainError('重试窗口已过；请备份分享 ID、撤销凭据及密文，不要误认为云端未保存', retryInfo, id);
  }
  let response: Response;
  try {
    response = await fetch('/api/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(expirationTime === NEVER_EXPIRE && adminPassword ? { 'X-Admin-Token': adminPassword } : {}),
      },
      cache: 'no-store',
      body: JSON.stringify({ text, type, expirationTime, revokeToken: retryInfo.revokeToken, createdAt: retryInfo.createdAt }),
    });
  } catch {
    throw new CloudUploadUncertainError('网络中断，云端可能已经保存；请重试同一请求', retryInfo, id);
  }
  if (!response.ok) {
    if (response.status >= 500 || response.status === 409 || response.status === 429) {
      throw new CloudUploadUncertainError(`云端状态未确认（HTTP ${response.status}）；请稍后重试同一请求`, retryInfo, id);
    }
    throw new Error(`云端拒绝保存（HTTP ${response.status}）；请检查 KV 绑定、有效期或管理员凭据`);
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new CloudUploadUncertainError('云端响应无效，无法确认是否已保存', retryInfo, id);
  }
  if (!result || typeof result !== 'object' || !('id' in result) || result.id !== id ||
      !('revokeToken' in result) || result.revokeToken !== retryInfo.revokeToken ||
      !('expirationTime' in result) || result.expirationTime !== expirationTime) {
    throw new CloudUploadUncertainError('云端返回的分享信息不一致，状态未确认', retryInfo, id);
  }
  record.cloud = true;
  record.revokeToken = retryInfo.revokeToken;
  let cached = true;
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(record));
  } catch {
    cached = false; // Remote save succeeded; the link is still usable, but revocation capability was not persisted.
  }
  return { id, expirationTime, timestamp: retryInfo.createdAt, cached, canRevoke: cached, revokeToken: retryInfo.revokeToken };
}

/** Cloud links are checked against the Worker every visit; local-only records never leave the browser. */
export async function getEncryptedContent(id: string): Promise<StoredData> {
  checkId(id);
  let local: string | null = null;
  let localRecord: StoredData | null = null;
  try {
    local = localStorage.getItem(PREFIX + id);
  } catch {
    // Disabled local storage must not prevent a cross-device cloud read.
  }
  if (local) {
    try {
      const data: unknown = JSON.parse(local);
      if (validRecord(data)) {
        if (data.revoked) throw new Error('此浏览器已撤销该分享；可复制本地密文手动解密');
        if (!data.cloud) return unpack(data);
        localRecord = data;
        // Never treat a cached cloud ciphertext as evidence the cloud share is still live.
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('已撤销')) throw error;
      // Corrupt local ciphertext must not prevent a valid remote fetch.
    }
  }
  let response: Response;
  try {
    response = await fetch(`/api/content/${encodeURIComponent(id)}`, { cache: 'no-store' });
  } catch {
    throw new Error('无法连接云端；如本机已缓存密文，可在历史记录中复制并手动解密');
  }
  if (response.status === 404) throw new Error('密文不存在、已过期、已撤销或尚未同步；可稍后重试');
  if (!response.ok) throw new Error(`获取云端密文失败（HTTP ${response.status}）`);
  const data: unknown = await response.json();
  if (!validRecord(data)) throw new Error('云端密文格式无效');
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify({ ...data, cloud: true,
      ...(localRecord?.revokeToken ? { revokeToken: localRecord.revokeToken } : {}),
    }));
  } catch {
    // A private browser can still decrypt without a local history entry.
  }
  return unpack(data);
}

export function getLocalCiphertext(id: string): string {
  checkId(id);
  const raw = localStorage.getItem(PREFIX + id);
  if (!raw) throw new Error('本机没有这条密文');
  const data: unknown = JSON.parse(raw);
  if (!validRecord(data)) throw new Error('本地密文格式无效');
  return unpack(data).text;
}

export async function revokeCloudContent(id: string, suppliedToken?: string): Promise<void> {
  checkId(id);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFIX + id);
  } catch {
    // Explicitly supplied credentials can still revoke when storage is disabled.
  }
  let data: StoredData | null = null;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (validRecord(parsed)) data = parsed;
    } catch {
      // Manually supplied credentials may still revoke a share without a local cache.
    }
  }
  const token = suppliedToken ?? data?.revokeToken;
  if (!token || !REVOKE_TOKEN.test(token)) throw new Error('请提供有效的撤销凭据');
  let response: Response;
  try {
    response = await fetch(`/api/content/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Revoke-Token': token },
      cache: 'no-store',
    });
  } catch {
    throw new Error('无法连接云端，尚未确认撤销');
  }
  if (!response.ok) throw new Error(`云端撤销失败（HTTP ${response.status}）；请稍后重试`);
  if (data?.cloud) {
    delete data.revokeToken;
    data.revoked = true;
    try {
      localStorage.setItem(PREFIX + id, JSON.stringify(data));
    } catch {
      // The remote removal succeeded, even if the local history is read-only.
    }
  }
}

export function listLocalContent(): LocalRecord[] {
  const records: LocalRecord[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const storageKey = localStorage.key(index);
    if (!storageKey?.startsWith(PREFIX)) continue;
    const id = storageKey.slice(PREFIX.length);
    if (!UUID.test(id)) continue;
    try {
      const data: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (validRecord(data)) records.push({
        id, type: data.type, timestamp: data.timestamp, expirationTime: data.expirationTime,
        cloud: Boolean(data.cloud), revoked: Boolean(data.revoked), canRevoke: Boolean(data.cloud && data.revokeToken && !data.revoked),
      });
    } catch {
      // Ignore corrupt entries in the history view.
    }
  }
  return records;
}

export function deleteLocalContent(id: string): void {
  checkId(id);
  localStorage.removeItem(PREFIX + id);
}

export async function getExpirationTime(id: string): Promise<number> {
  const data = await getEncryptedContent(id);
  return data.expirationTime === NEVER_EXPIRE ? NEVER_EXPIRE : data.timestamp + data.expirationTime;
}
