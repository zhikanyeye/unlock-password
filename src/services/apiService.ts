import { EncryptionType } from '../utils/cryptoUtils';
import pako from 'pako';

interface StoredData {
  text: string;
  type: EncryptionType;
  timestamp: number;
  compressed?: boolean;
  expirationTime: number;
}

// 默认过期时间：180天（以毫秒为单位）
const DEFAULT_EXPIRATION_TIME = 180 * 24 * 60 * 60 * 1000;

// 永久不过期标记
const NEVER_EXPIRE = -1;

// 从环境变量获取管理员密码
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

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
      
      if (key && key.startsWith('jiapass_')) {
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
 * 将内容加密并存储到本地存储
 * @param text 要加密的文本
 * @param type 加密类型
 * @param expirationTime 过期时间（毫秒），默认为7天
 * @returns 返回内容ID
 */
export const storeEncryptedContent = async (
  text: string, 
  type: EncryptionType,
  adminPassword?: string
): Promise<{ id: string; expirationTime: number }> => {
  try {
    const id = crypto.randomUUID();
    
    // 对长文本进行压缩
    const shouldCompress = text.length > 1000;
    const processedText = shouldCompress ? compressData(text) : text;
    
    const expirationTime = adminPassword === ADMIN_PASSWORD ? NEVER_EXPIRE : DEFAULT_EXPIRATION_TIME;
    const data: StoredData = {
      text: processedText,
      type,
      timestamp: Date.now(),
      compressed: shouldCompress,
      expirationTime
    };
    
    // 使用localStorage存储加密内容
    localStorage.setItem(`jiapass_${id}`, JSON.stringify(data));
    
    // 清理过期内容
    cleanupExpiredContent();
    
    return { id, expirationTime };
  } catch (error) {
    console.error('存储加密内容失败:', error);
    throw new Error('无法存储加密内容');
  }
};

/**
 * 从本地存储获取加密内容
 * @param id 内容ID
 * @returns 返回存储的数据
 */
export const getEncryptedContent = async (id: string): Promise<StoredData> => {
  try {
    const data = localStorage.getItem(`jiapass_${id}`);
    
    if (!data) {
      throw new Error('内容不存在或已过期');
    }

    const parsedData = JSON.parse(data) as StoredData;
    
    // 检查是否过期
    const now = Date.now();
    if (parsedData.expirationTime !== NEVER_EXPIRE && parsedData.timestamp && (now - parsedData.timestamp > (parsedData.expirationTime || DEFAULT_EXPIRATION_TIME))) {
      localStorage.removeItem(`jiapass_${id}`);
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
    const data = localStorage.getItem(`jiapass_${id}`);
    
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