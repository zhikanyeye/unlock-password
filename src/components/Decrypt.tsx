import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, message, Space, Alert } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { decrypt, parseFullKey } from '../utils/cryptoUtils';
import { useSearchParams } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const Decrypt: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      setEncryptedText(decodeURIComponent(data));
    }
  }, [searchParams]);
  
  // 处理解密操作
  const handleDecrypt = () => {
    setErrorMessage('');
    setDecryptedText('');
    
    if (!encryptedText) {
      message.error('请输入需要解密的内容');
      return;
    }
    
    if (!secretKey) {
      message.error('请输入解密密钥');
      return;
    }
    
    try {
      // 从完整密钥中解析出加密类型和实际密钥
      const { type, key } = parseFullKey(secretKey);
      
      // 解密文本
      const decrypted = decrypt(encryptedText, type, key);
      setDecryptedText(decrypted);
      
      message.success('解密成功！');
    } catch (error) {
      const errorMsg = (error as Error).message;
      setErrorMessage(errorMsg);
      message.error('解密失败，请检查密钥格式和内容是否正确');
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
  
  return (
    <Card className="decrypt-card" style={{ maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <Title level={3}><LockOutlined /> 解密内容</Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        {errorMessage && (
          <Alert
            message="解密失败"
            description={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage('')}
          />
        )}
        
        <Paragraph>
          <Text strong>加密内容：</Text>
          <TextArea 
            rows={4} 
            value={encryptedText}
            onChange={(e) => setEncryptedText(e.target.value)}
            placeholder="请输入需要解密的内容"
            style={{ marginTop: '8px' }}
          />
        </Paragraph>
        
        <Paragraph>
          <Text strong>解密密钥：</Text>
          <Input 
            prefix={<KeyOutlined />}
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="请输入解密密钥"
            style={{ width: '100%', marginTop: '8px' }}
          />
        </Paragraph>
        
        <Button type="primary" onClick={handleDecrypt} size="large" block>
          解密
        </Button>
        
        {decryptedText && (
          <Paragraph style={{ marginTop: '16px' }}>
            <Text strong>解密结果：</Text>
            <TextArea 
              rows={4} 
              value={decryptedText} 
              readOnly 
              style={{ marginTop: '8px' }}
            />
            <Button 
              onClick={copyDecryptedText}
              style={{ marginTop: '8px' }}
              type="primary"
              ghost
              block
            >
              复制解密内容
            </Button>
          </Paragraph>
        )}
      </Space>
    </Card>
  );
};

export default Decrypt;