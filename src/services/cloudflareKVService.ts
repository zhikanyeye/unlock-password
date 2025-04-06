/**
 * Cloudflare KV 服务
 * 提供与Cloudflare KV数据库交互的功能
 * 直接使用Cloudflare Pages的KV绑定功能
 */

// 导入API基础URL配置
import { API_BASE_URL } from './apiService';

// KV前缀已在调用时添加，这里不需要重复定义
const KV_PREFIX = '';

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

/**
 * 检查KV绑定是否存在
 * @returns 是否存在KV绑定
 */
const checkKVBinding = (): boolean => {
  return typeof (globalThis as any).PASSWORD_STORE !== 'undefined';
};

export async function storeToKV(key: string, value: string, expirationTtl?: number): Promise<KVOperationResult> {
  try {
    const options: KVNamespacePutOptions = {};
    if (expirationTtl) {
      options.expirationTtl = expirationTtl;
    }

    // 检查KV绑定是否存在
    if (!checkKVBinding()) {
      console.error('KV绑定不存在: PASSWORD_STORE未定义');
      
      // 使用API_BASE_URL构建完整的API请求URL
      const apiUrl = `${API_BASE_URL}/api/kv/store`;
      console.log(`尝试通过API存储数据: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            key,
            value,
            expirationTtl
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '远程API存储失败');
        }
        
        await response.json(); // 确认响应可以被解析为JSON
        console.log(`API存储成功: ${key}`);
        return { success: true };
      } catch (apiError) {
        console.error('API存储失败:', apiError);
        return { success: false, error: apiError instanceof Error ? apiError.message : '远程API存储失败' };
      }
    }

    console.log(`正在存储数据到KV: ${key}`);
    // 使用类型断言解决TS7017错误
    // 确保使用正确的KV绑定名称（PASSWORD_STORE）
    await (globalThis as any).PASSWORD_STORE.put(key, value, options);
    console.log(`KV存储成功: ${key}`);
    
    // 本地存储备份
    try {
      localStorage.setItem(key, value);
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
    // 检查KV绑定是否存在
    if (!(globalThis as any).PASSWORD_STORE) {
      console.error('KV绑定不存在: PASSWORD_STORE未定义');
      
      // 使用API_BASE_URL构建完整的API请求URL
      const apiUrl = `${API_BASE_URL}/api/kv/get`;
      console.log(`尝试通过API获取数据: ${apiUrl}`);
      
      try {
        const response = await fetch(`${apiUrl}?key=${encodeURIComponent(key)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '远程API获取失败');
        }
        
        const result = await response.json();
        if (result.data) {
          console.log(`API获取数据成功: ${key}`);
          return { success: true, data: result.data };
        }
        return { success: false, error: '数据不存在' };
      } catch (apiError) {
        console.error('API获取失败:', apiError);
        // API获取失败时尝试从本地存储获取
        try {
          const localValue = localStorage.getItem(key);
          if (localValue !== null) {
            console.log(`从本地存储获取数据成功: ${key}`);
            return { success: true, data: localValue };
          }
        } catch (e) {
          console.warn('本地存储读取失败:', e);
        }
        return { success: false, error: apiError instanceof Error ? apiError.message : '远程API获取失败' };
      }
    }

    console.log(`正在从KV获取数据: ${key}`);
    // 使用类型断言解决TS7017错误
    // 确保使用正确的KV绑定名称（PASSWORD_STORE）
    const value = await (globalThis as any).PASSWORD_STORE.get(key);
    if (value === null) {
      console.warn(`KV中不存在数据: ${key}`);
      // KV中不存在，尝试从本地存储获取
      try {
        const localValue = localStorage.getItem(key);
        if (localValue !== null) {
          console.log(`从本地存储获取数据成功: ${key}`);
          return { success: true, data: localValue };
        }
        return { success: false, error: '数据不存在' };
      } catch (e) {
        console.warn('本地存储读取失败:', e);
        return { success: false, error: e instanceof Error ? e.message : '本地存储读取失败' };
      }
    }
    console.log(`KV获取数据成功: ${key}`);
    return { success: true, data: value };
  } catch (error) {
    console.error('KV读取失败:', error);
    // 发生错误时尝试从本地存储获取
    try {
      const localValue = localStorage.getItem(KV_PREFIX + key);
      if (localValue !== null) {
        console.log(`KV读取失败，从本地存储获取数据成功: ${KV_PREFIX + key}`);
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
    // 检查KV绑定是否存在
    if (!(globalThis as any).PASSWORD_STORE) {
      console.error('KV绑定不存在: PASSWORD_STORE未定义');
      
      // 使用API_BASE_URL构建完整的API请求URL
      const apiUrl = `${API_BASE_URL}/api/kv/delete`;
      console.log(`尝试通过API删除数据: ${apiUrl}`);
      
      try {
        const response = await fetch(`${apiUrl}?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '远程API删除失败');
        }
        
        console.log(`API删除数据成功: ${key}`);
        // 同步删除本地存储
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('本地存储删除失败:', e);
        }
        return { success: true };
      } catch (apiError) {
        console.error('API删除失败:', apiError);
        return { success: false, error: apiError instanceof Error ? apiError.message : '远程API删除失败' };
      }
    }

    console.log(`正在从KV删除数据: ${key}`);
    // 使用类型断言解决TS7017错误
    // 确保使用正确的KV绑定名称（PASSWORD_STORE）
    await (globalThis as any).PASSWORD_STORE.delete(key);
    console.log(`KV删除数据成功: ${key}`);
    
    // 同步删除本地存储
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('本地存储删除失败:', e);
    }
    return { success: true };
  } catch (error) {
    console.error('KV删除失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}