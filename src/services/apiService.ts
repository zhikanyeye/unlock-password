import { EncryptionType } from '../utils/cryptoUtils';

interface StoredData {
  text: string;
  type: EncryptionType;
  timestamp: number;
}

/**
 * 将内容加密并存储到本地存储
 * @param text 要加密的文本
 * @param type 加密类型
 * @returns 返回内容ID
 */
export const storeEncryptedContent = async (text: string, type: EncryptionType): Promise<string> => {
  try {
    const id = crypto.randomUUID();
    const data: StoredData = {
      text,
      type,
      timestamp: Date.now()
    };
    
    // 使用localStorage存储加密内容
    localStorage.setItem(`jiapass_${id}`, JSON.stringify(data));
    return id;
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

    return JSON.parse(data) as StoredData;
  } catch (error) {
    console.error('获取加密内容失败:', error);
    throw new Error('无法获取加密内容');
  }
};