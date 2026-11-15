import CryptoJS from 'crypto-js';
import { decryptSegmented, encryptSegmented, SEGMENTED_TYPE } from './segmentedCrypto';

// 支持的加密算法类型
export enum EncryptionType {
  QYS1 = 'QYS1-AES-GCM',
  AES = 'AES',
  DES = 'DES',
  TripleDES = 'TripleDES',
  Rabbit = 'Rabbit',
  RC4 = 'RC4',
}

// 生成随机密钥
export const generateRandomKey = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'
  let result = '';
  const charsLength = chars.length;
  const max = Math.floor(256 / charsLength) * charsLength;
  while (result.length < length) {
    const random = crypto.getRandomValues(new Uint8Array(Math.max(16, length - result.length)));
    for (const value of random) {
      if (value < max) result += chars[value % charsLength];
      if (result.length === length) break;
    }
  }
  
  return result;
};

// 旧版密文封装；仅供与已生成的密文保持兼容，不提供额外安全性
const addNoise = (data: string, key: string): string => {
  // 添加特定的头部和尾部标记，包含密钥的部分信息作为干扰
  const prefix = `QingYunShield:${key.substring(0, 3)}:`;
  const suffix = `:${key.substring(key.length - 3)}:End`;
  return prefix + data + suffix;
};

// 移除干扰因子
const removeNoise = (data: string): string => {
  // 移除特定的头部和尾部标记
  const prefixRegex = /^QingYunShield:[^:]*:/;
  const suffixRegex = /:[^:]*:End$/;
  
  return data.replace(prefixRegex, '').replace(suffixRegex, '');
};

// 新版采用分段认证加密；旧版算法保留用于兼容现有内容。
export async function encryptContent(text: string, type: EncryptionType, key?: string): Promise<{ text: string; key: string }> {
  if (type === EncryptionType.QYS1) {
    const encrypted = await encryptSegmented(text);
    return { text: encrypted.ciphertext, key: encrypted.key };
  }
  const legacyKey = key ?? generateRandomKey();
  return { text: encrypt(text, type, legacyKey), key: legacyKey };
}

export async function decryptContent(text: string, type: EncryptionType, key: string): Promise<string> {
  if (type === EncryptionType.QYS1) return decryptSegmented(text, key);
  return decrypt(text, type, key);
}

// 加密函数
export const encrypt = (text: string, type: EncryptionType, key: string): string => {
  let encrypted: CryptoJS.lib.CipherParams;
  
  switch (type) {
    case EncryptionType.AES:
      encrypted = CryptoJS.AES.encrypt(text, key);
      break;
    case EncryptionType.DES:
      encrypted = CryptoJS.DES.encrypt(text, key);
      break;
    case EncryptionType.TripleDES:
      encrypted = CryptoJS.TripleDES.encrypt(text, key);
      break;
    case EncryptionType.Rabbit:
      encrypted = CryptoJS.Rabbit.encrypt(text, key);
      break;
    case EncryptionType.RC4:
      encrypted = CryptoJS.RC4.encrypt(text, key);
      break;
    default:
      throw new Error('不支持的加密类型');
  }
  
  // 添加干扰因子
  return addNoise(encrypted.toString(), key);
};

// 解密函数
export const decrypt = (encryptedText: string, type: EncryptionType, key: string): string => {
  try {
    // 移除干扰因子
    const cleanText = removeNoise(encryptedText);
    let decrypted: CryptoJS.lib.WordArray;
    
    switch (type) {
      case EncryptionType.AES:
        decrypted = CryptoJS.AES.decrypt(cleanText, key);
        break;
      case EncryptionType.DES:
        decrypted = CryptoJS.DES.decrypt(cleanText, key);
        break;
      case EncryptionType.TripleDES:
        decrypted = CryptoJS.TripleDES.decrypt(cleanText, key);
        break;
      case EncryptionType.Rabbit:
        decrypted = CryptoJS.Rabbit.decrypt(cleanText, key);
        break;
      case EncryptionType.RC4:
        decrypted = CryptoJS.RC4.decrypt(cleanText, key);
        break;
      default:
        throw new Error('不支持的加密类型');
    }
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败，请检查密钥和加密类型是否正确');
  }
};

// 生成包含加密类型和密钥的完整密钥
export const generateFullKey = (type: EncryptionType, key: string): string => {
  return `${type}:${key}`;
};

// 从完整密钥中解析出加密类型和密钥
export const parseFullKey = (fullKey: string): { type: EncryptionType; key: string } => {
  const separator = fullKey.indexOf(':');
  if (separator < 0) throw new Error('无效的密钥格式');
  const typeStr = fullKey.slice(0, separator);
  const key = fullKey.slice(separator + 1);
  const type = typeStr as EncryptionType;
  
  if (!key || !Object.values(EncryptionType).includes(type) || (type === EncryptionType.QYS1 && typeStr !== SEGMENTED_TYPE)) {
    throw new Error('无效的加密类型');
  }
  
  return { type, key };
};