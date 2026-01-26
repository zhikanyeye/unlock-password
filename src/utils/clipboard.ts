import { message } from 'antd';

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @param successMessage 复制成功时显示的消息
 * @param errorMessage 复制失败时显示的消息
 */
export const copyToClipboard = async (
  text: string,
  successMessage: string = '已复制到剪贴板',
  errorMessage: string = '复制失败，请手动复制'
): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    message.success(successMessage);
    return true;
  } catch (err) {
    console.error('复制到剪贴板失败:', err);
    // 备用方法：创建临时文本区域
    return fallbackCopyToClipboard(text, successMessage, errorMessage);
  }
};

/**
 * 备用复制方法，使用execCommand
 */
const fallbackCopyToClipboard = (
  text: string,
  successMessage: string,
  errorMessage: string
): boolean => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      message.success(successMessage);
      return true;
    } else {
      message.error(errorMessage);
      return false;
    }
  } catch (err) {
    console.error('execCommand复制失败:', err);
    document.body.removeChild(textArea);
    message.error(errorMessage);
    return false;
  }
};
