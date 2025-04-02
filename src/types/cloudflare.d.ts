/**
 * Cloudflare KV 类型声明
 * 这些类型声明用于在TypeScript中使用Cloudflare Pages的KV绑定
 */

interface KVNamespacePutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

interface KVNamespaceGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

interface KVNamespaceListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

interface KVNamespaceListKey {
  name: string;
  expiration?: number;
  metadata?: Record<string, unknown>;
}

interface KVNamespaceListResult {
  keys: KVNamespaceListKey[];
  list_complete: boolean;
  cursor?: string;
}

interface KVNamespace {
  get(key: string, options?: KVNamespaceGetOptions): Promise<string | null>;
  get(key: string, type: 'text'): Promise<string | null>;
  get<T>(key: string, type: 'json'): Promise<T | null>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  put(key: string, value: string | ReadableStream | ArrayBuffer | FormData, options?: KVNamespacePutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;
}

// 声明全局变量，这些变量会在Cloudflare Pages环境中自动绑定
declare global {
  const PASSWORD_STORE: KVNamespace;
  
  // 扩展GlobalThis接口
  interface GlobalThis {
    PASSWORD_STORE: KVNamespace;
    [key: string]: any; // 添加索引签名以解决TS7017错误
  }
}

declare module '@cloudflare/workers-types' {
  interface Env {
    PASSWORD_STORE: KVNamespace;
  }
}