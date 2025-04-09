import { EncryptionType } from '../utils/cryptoUtils';
import pako from 'pako';
import { storeToKV, getFromKV, deleteFromKV } from './cloudflareKVService';

// API基础URL配置 - 自动使用当前域名
export const API_BASE_URL = import.meta.env.MODE === 'production'
  ? window.location.origin
  : 'http://localhost:8787';

interface StoredData {
  text: string;
  type: EncryptionType;
  timestamp: number;
  compressed?: boolean;
  expirationTime: number;
  isRemoteStored: boolean;
}

// 默认过期时间：180天（以毫秒为单位）
const DEFAULT_EXPIRATION_TIME = 180 * 24 * 60 * 60 * 1000;

// 永久不过期标记
const NEVER_EXPIRE = -1;

// 从环境变量获取管理员密码
const VITE_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

// 是否使用远程存储
// 默认值从环境变量获取，但可以通过用户设置进行覆盖
let useRemoteStorage = import.meta.env.VITE_USE_REMOTE_STORAGE === 'true';

/**
 * 获取当前存储模式
 * @returns 是否使用远程存储
 */
export const getStorageMode = (): boolean => {
  // 优先从localStorage中获取用户设置的存储模式
  const storedMode = localStorage.getItem('qingyun_storage_mode');
  if (storedMode !== null) {
    return storedMode === 'true';
  }
  // 如果没有用户设置，则使用环境变量的默认值
  // 统一使用VITE_前缀的环境变量
  return import.meta.env.VITE_USE_REMOTE_STORAGE === 'true';
};

/**
 * 设置存储模式
 * @param useRemote 是否使用远程存储
 */
export const setStorageMode = (useRemote: boolean): void => {
  // 更新当前运行时的存储模式
  useRemoteStorage = useRemote;
  // 将用户设置保存到localStorage
  localStorage.setItem('qingyun_storage_mode', String(useRemote));
};

/**
 * 压缩文本数据
 * @param text 要压缩的文本
 * @returns 压缩后的Base64字符串
 */
const compressData = (text: string): string => {
  try {
    const compressed = pako.deflate(new TextEncoder().encode(text));
    return btoa(String.fromCharCode.apply(null, Array.from(compressed)));
  } catch (error) {
    console.error('压缩数据失败:', error);
    return text; // 如果压缩失败，返回原始文本
  }
};

/**
 * 解压缩文本数据
 * @param compressedText 压缩后的Base64字符串
 * @returns 解压缩后的原始文本
 */
const decompressData = (compressedText: string): string => {
  try {
    const binaryString = atob(compressedText);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    const decompressed = pako.inflate(uint8Array);
    return new TextDecoder().decode(decompressed);
  } catch (error) {
    console.error('解压缩数据失败:', error);
    return compressedText; // 如果解压缩失败，返回原始文本
  }
};

/**
 * 清理过期的加密内容
 */
export const cleanupExpiredContent = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // 遍历localStorage中的所有项
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith('qingyun_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}') as StoredData;
          
          // 检查是否过期
          if (data.timestamp && (now - data.timestamp > DEFAULT_EXPIRATION_TIME)) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // 如果解析失败，也将其视为需要清理的项
          keysToRemove.push(key);
        }
      }
    }
    
    // 删除过期项
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`已清理 ${keysToRemove.length} 个过期加密内容`);
  } catch (error) {
    console.error('清理过期内容失败:', error);
  }
};

/**
 * 将内容加密并存储到本地存储或远程KV存储
 * @param text 要加密的文本
 * @param type 加密类型
 * @param adminPassword 管理员密码（可选）
 * @returns 返回内容ID和过期时间
 */
export const storeEncryptedContent = async (
  text: string, 
  type: EncryptionType,
  adminPassword?: string
): Promise<{ id: string; expirationTime: number; isRemoteStored: boolean }> => {
  try {
    const id = crypto.randomUUID();
    
    // 对长文本进行压缩
    const shouldCompress = text.length > 1000;
    const processedText = shouldCompress ? compressData(text) : text;
    
    // 检查管理员密码是否有效（确保VITE_ADMIN_PASSWORD不是默认值且不为空）
const isValidAdminPassword = VITE_ADMIN_PASSWORD && 
    VITE_ADMIN_PASSWORD !== 'your-admin-password' && 
    adminPassword === VITE_ADMIN_PASSWORD;
const expirationTime = isValidAdminPassword ? NEVER_EXPIRE : DEFAULT_EXPIRATION_TIME;
    const data: StoredData = {
      text: processedText,
      type,
      timestamp: Date.now(),
      compressed: shouldCompress,
      expirationTime,
      isRemoteStored: useRemoteStorage
    };
    
    // 存储加密内容
    if (useRemoteStorage) {
      // 计算过期时间（秒）
      const expirationTtl = expirationTime === NEVER_EXPIRE ? undefined : Math.floor(expirationTime / 1000);
      
      console.log(`尝试存储加密内容到KV，ID: ${id}，过期时间: ${expirationTtl ? expirationTtl + '秒' : '永不过期'}`);
      // 检查KV绑定是否存在
      const kvBindingExists = typeof (globalThis as any).PASSWORD_STORE !== 'undefined';
      if (!kvBindingExists) {
        console.warn('KV绑定不存在，将使用本地存储作为备份');
      }
      
      // 存储到Cloudflare KV
      const result = await storeToKV(`qingyun_${id}`, JSON.stringify(data), expirationTtl);
      
      if (!result?.success) {
        console.warn('远程存储失败，回退到本地存储:', result?.error);
        // 如果远程存储失败，回退到本地存储
        localStorage.setItem(`qingyun_${id}`, JSON.stringify(data));
        data.isRemoteStored = false;
      } else {
        console.log(`成功存储加密内容到KV，ID: ${id}`);
      }
    } else {
      // 使用localStorage存储加密内容
      console.log(`使用本地存储模式，ID: ${id}`);
      // 确保data.isRemoteStored为false
      data.isRemoteStored = false;
      localStorage.setItem(`qingyun_${id}`, JSON.stringify(data));
    }
    
    // 清理过期内容
    cleanupExpiredContent();
    
    // 确保返回的isRemoteStored始终为boolean类型
    return { id, expirationTime, isRemoteStored: Boolean(data.isRemoteStored) };
  } catch (error) {
    console.error('存储加密内容失败:', error);
    throw new Error('无法存储加密内容');
  }
};

/**
 * 从本地存储或远程KV存储获取加密内容
 * @param id 内容ID
 * @returns 返回存储的数据
 */
export const getEncryptedContent = async (id: string): Promise<StoredData> => {
  try {
    let data: string | null = null;
    let parsedData: StoredData;
    const key = `qingyun_${id}`;
    
    // 首先尝试从本地存储获取
    data = localStorage.getItem(key);
    
    if (data) {
      parsedData = JSON.parse(data) as StoredData;
      
      // 如果数据标记为远程存储，但在本地找到了，说明可能是之前存储的
      // 尝试从远程获取最新版本
      if (parsedData.isRemoteStored && useRemoteStorage) {
        try {
          const remoteResult = await getFromKV(key);
          if (remoteResult?.success && remoteResult?.data) {
            parsedData = JSON.parse(remoteResult.data) as StoredData;
          }
        } catch (e) {
          console.warn('从远程获取失败，使用本地数据:', e);
          // 继续使用本地数据
        }
      }
    } else if (useRemoteStorage) {
      // 如果本地没有，尝试从远程获取
      const remoteResult = await getFromKV(key);
      
      if (!remoteResult?.success || !remoteResult?.data) {
        throw new Error(remoteResult?.error || '内容不存在或已过期');
      }
      
      parsedData = JSON.parse(remoteResult.data) as StoredData;
    } else {
      throw new Error('内容不存在或已过期');
    }
    
    // 检查是否过期
    const now = Date.now();
    if (parsedData.expirationTime !== NEVER_EXPIRE && parsedData.timestamp && (now - parsedData.timestamp > (parsedData.expirationTime || DEFAULT_EXPIRATION_TIME))) {
      // 如果过期，从存储中删除
      if (parsedData.isRemoteStored && useRemoteStorage) {
        await deleteFromKV(key);
      }
      localStorage.removeItem(key);
      throw new Error('内容已过期');
    }
    
    // 如果数据被压缩，则解压缩
    if (parsedData.compressed && parsedData.text) {
      parsedData.text = decompressData(parsedData.text);
      parsedData.compressed = false;
    }

    return parsedData;
  } catch (error) {
    console.error('获取加密内容失败:', error);
    throw new Error('无法获取加密内容');
  }
};

/**
 * 获取加密内容的过期时间
 * @param id 内容ID
 * @returns 返回过期时间（毫秒时间戳）
 */
export const getExpirationTime = async (id: string): Promise<number> => {
  try {
    const data = localStorage.getItem(`qingyun_${id}`);
    
    if (!data) {
      throw new Error('内容不存在或已过期');
    }

    const parsedData = JSON.parse(data) as StoredData;
    return parsedData.timestamp + DEFAULT_EXPIRATION_TIME;
  } catch (error) {
    console.error('获取过期时间失败:', error);
    throw new Error('无法获取过期时间');
  }
};