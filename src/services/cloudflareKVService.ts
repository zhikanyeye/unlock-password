/**
 * Cloudflare KV 服务
 * 提供与Cloudflare KV数据库交互的功能
 * 直接使用Cloudflare Pages的KV绑定功能
 */

const KV_PREFIX = 'qingyun_';

/**
 * 将数据存储到Cloudflare KV
 * @param key 存储的键
 * @param value 存储的值
 * @param expirationTtl 过期时间（秒），可选
 * @returns 存储操作的结果
 */
interface KVOperationResult {
  success: boolean;
  error?: string;
  data?: string;
}

export async function storeToKV(key: string, value: string, expirationTtl?: number): Promise<KVOperationResult> {
  try {
    const options: KVNamespacePutOptions = {};
    if (expirationTtl) {
      options.expirationTtl = expirationTtl;
    }

    // 使用类型断言解决TS7017错误
    // 确保使用正确的KV绑定名称（PASSWORD_STORE）
    await (globalThis as any).PASSWORD_STORE.put(KV_PREFIX + key, value, options);
    // 本地存储备份
    try {
      localStorage.setItem(KV_PREFIX + key, value);
    } catch (e) {
      console.warn('本地存储备份失败:', e);
    }
    return { success: true };
  } catch (error) {
    console.error('KV存储失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '存储失败' };
  }
}

/**
 * 从Cloudflare KV获取数据
 * @param key 要获取的键
 * @returns 操作结果，包含success状态、可能的error信息和data数据
 */
export async function getFromKV(key: string): Promise<KVOperationResult> {
  try {
    // 使用类型断言解决TS7017错误
    // 确保使用正确的KV绑定名称（PASSWORD_STORE）
    const value = await (globalThis as any).PASSWORD_STORE.get(KV_PREFIX + key);
    if (value === null) {
      // KV中不存在，尝试从本地存储获取
      try {
        const localValue = localStorage.getItem(KV_PREFIX + key);
        if (localValue !== null) {
          return { success: true, data: localValue };
        }
        return { success: false, error: '数据不存在' };
      } catch (e) {
        console.warn('本地存储读取失败:', e);
        return { success: false, error: e instanceof Error ? e.message : '本地存储读取失败' };
      }
    }
    return { success: true, data: value };
  } catch (error) {
    console.error('KV读取失败:', error);
    // 发生错误时尝试从本地存储获取
    try {
      const localValue = localStorage.getItem(KV_PREFIX + key);
      if (localValue !== null) {
        return { success: true, data: localValue };
      }
      return { success: false, error: error instanceof Error ? error.message : 'KV读取失败' };
    } catch (e) {
      console.warn('本地存储读取失败:', e);
      return { success: false, error: e instanceof Error ? e.message : '本地存储读取失败' };
    }
  }
}

/**
 * 从Cloudflare KV删除数据
 * @param key 要删除的键
 * @returns 删除操作的结果
 */
export async function deleteFromKV(key: string): Promise<KVOperationResult> {
  try {
    // 使用类型断言解决TS7017错误
    // 确保使用正确的KV绑定名称（PASSWORD_STORE）
    await (globalThis as any).PASSWORD_STORE.delete(KV_PREFIX + key);
    // 同步删除本地存储
    try {
      localStorage.removeItem(KV_PREFIX + key);
    } catch (e) {
      console.warn('本地存储删除失败:', e);
    }
    return { success: true };
  } catch (error) {
    console.error('KV删除失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}