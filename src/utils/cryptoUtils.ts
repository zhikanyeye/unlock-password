import CryptoJS from 'crypto-js';

// 支持的加密算法类型
export enum EncryptionType {
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
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLength));
  }
  
  return result;
};

// 添加干扰因子，使通用解密工具难以解密
const addNoise = (data: string, key: string): string => {
  // 添加特定的头部和尾部标记，包含密钥的部分信息作为干扰
  const prefix = `JiaPass:${key.substring(0, 3)}:`;
  const suffix = `:${key.substring(key.length - 3)}:End`;
  return prefix + data + suffix;
};

// 移除干扰因子
const removeNoise = (data: string): string => {
  // 移除特定的头部和尾部标记
  const prefixRegex = /^JiaPass:[^:]*:/;
  const suffixRegex = /:[^:]*:End$/;
  
  return data.replace(prefixRegex, '').replace(suffixRegex, '');
};

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
  const [typeStr, key] = fullKey.split(':');
  const type = typeStr as EncryptionType;
  
  if (!Object.values(EncryptionType).includes(type)) {
    throw new Error('无效的加密类型');
  }
  
  return { type, key };
};