import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, message, Space, Divider, Result } from 'antd';
import { UnlockOutlined, KeyOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { decrypt, parseFullKey, EncryptionType } from '../utils/cryptoUtils';
import { getEncryptedContent } from '../services/apiService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const Decrypt: React.FC = () => {
  const [encryptedId, setEncryptedId] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [encryptedText, setEncryptedText] = useState<string>('');
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [encryptionType, setEncryptionType] = useState<EncryptionType>(EncryptionType.AES);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [expirationTime, setExpirationTime] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  
  const location = useLocation();
  
  // 从URL参数中获取加密内容ID
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    
    if (id) {
      setEncryptedId(id);
      fetchEncryptedContent(id);
    }
  }, [location]);
  
  // 获取加密内容
  const fetchEncryptedContent = async (id: string) => {
    setLoading(true);
    setError('');
    
    try {
      const data = await getEncryptedContent(id);
      setEncryptedText(data.text);
      setEncryptionType(data.type);
      
      // 检查过期时间
      if (data.expirationTime !== -1) {
        const expireDate = new Date(data.timestamp + data.expirationTime);
        setExpirationTime(expireDate.getTime());
        
        // 检查是否已过期
        if (Date.now() > expireDate.getTime()) {
          setIsExpired(true);
          setError('此加密内容已过期');
        }
      } else {
        // 永不过期
        setExpirationTime(-1);
      }
    } catch (error) {
      setError((error as Error).message);
      setIsExpired(true);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理解密操作
  const handleDecrypt = () => {
    if (!encryptedText) {
      message.error('没有可解密的内容');
      return;
    }
    
    if (!secretKey) {
      message.error('请输入解密密钥');
      return;
    }
    
    try {
      // 解析完整密钥（包含加密类型和密钥）
      let type = encryptionType;
      let key = secretKey;
      
      // 检查是否是完整密钥格式（如 AES:xxxx）
      if (secretKey.includes(':')) {
        const parsedKey = parseFullKey(secretKey);
        type = parsedKey.type;
        key = parsedKey.key;
      }
      
      // 解密文本
      const decrypted = decrypt(encryptedText, type, key);
      setDecryptedText(decrypted);
      setIsDecrypted(true);
      message.success('解密成功！');
    } catch (error) {
      message.error('解密失败: ' + (error as Error).message);
    }
  };
  
  // 复制解密后的文本
  const copyDecryptedText = () => {
    if (!decryptedText) {
      message.warning('没有可复制的解密内容');
      return;
    }
    
    navigator.clipboard.writeText(decryptedText)
      .then(() => message.success('解密内容已复制到剪贴板'));
  };
  
  // 检查解密后的文本是否是URL
  const isURL = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  // 打开解密后的URL
  const openDecryptedURL = () => {
    if (!decryptedText || !isURL(decryptedText)) {
      message.warning('解密内容不是有效的URL');
      return;
    }
    
    window.open(decryptedText, '_blank');
  };
  
  return (
    <Card className="decrypt-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Title level={3}><UnlockOutlined /> 解密内容</Title>
      
      {error && isExpired ? (
        <Result
          status="warning"
          title="无法获取加密内容"
          subTitle={error}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {!encryptedId && (
            <Paragraph>
              <Text type="secondary">请使用完整的解密链接访问此页面，或者联系分享者获取正确的链接。</Text>
            </Paragraph>
          )}
          
          {encryptedText && (
            <>
              <Paragraph>
                <Text strong>密钥：</Text>
                <Input
                  prefix={<KeyOutlined />}
                  placeholder="请输入解密密钥"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
              </Paragraph>
              
              {expirationTime && expirationTime !== -1 && (
                <Paragraph>
                  <Text type="secondary">
                    此加密内容将在 {new Date(expirationTime).toLocaleString()} 过期
                  </Text>
                </Paragraph>
              )}
              
              {expirationTime === -1 && (
                <Paragraph>
                  <Text type="secondary">此加密内容永久有效</Text>
                </Paragraph>
              )}
              
              <Button 
                type="primary" 
                onClick={handleDecrypt} 
                loading={loading}
                style={{ marginTop: '16px' }}
                block
              >
                解密
              </Button>
              
              {isDecrypted && decryptedText && (
                <>
                  <Divider />
                  <Paragraph>
                    <Text strong>解密结果：</Text>
                    <TextArea 
                      rows={4} 
                      value={decryptedText} 
                      readOnly 
                      style={{ marginTop: '8px' }}
                    />
                    <Space style={{ marginTop: '16px' }}>
                      <Button 
                        icon={<CopyOutlined />} 
                        onClick={copyDecryptedText}
                        type="primary"
                        ghost
                      >
                        复制内容
                      </Button>
                      
                      {isURL(decryptedText) && (
                        <Button 
                          icon={<LinkOutlined />} 
                          onClick={openDecryptedURL}
                          type="primary"
                          style={{ background: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}
                        >
                          打开链接
                        </Button>
                      )}
                    </Space>
                  </Paragraph>
                </>
              )}
            </>
          )}
        </Space>
      )}
    </Card>
  );
};

export default Decrypt;