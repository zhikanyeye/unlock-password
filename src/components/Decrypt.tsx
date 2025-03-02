import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, message, Space } from 'antd';
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
  
  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      setEncryptedText(decodeURIComponent(data));
    }
  }, [searchParams]);
  
  // 处理解密操作
  const handleDecrypt = () => {
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
  
  return (
    <Card className="decrypt-card">
      <Title level={3}><LockOutlined /> 解密内容</Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph>
          <Text strong>加密内容：</Text>
          <TextArea 
            rows={4} 
            value={encryptedText}
            onChange={(e) => setEncryptedText(e.target.value)}
            placeholder="请输入需要解密的内容"
          />
        </Paragraph>
        
        <Paragraph>
          <Text strong>解密密钥：</Text>
          <Input 
            prefix={<KeyOutlined />}
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="请输入解密密钥"
            style={{ width: '100%' }}
          />
        </Paragraph>
        
        <Button type="primary" onClick={handleDecrypt}>解密</Button>
        
        {decryptedText && (
          <Paragraph>
            <Text strong>解密结果：</Text>
            <TextArea 
              rows={4} 
              value={decryptedText} 
              readOnly 
            />
            <Button 
              onClick={copyDecryptedText}
              style={{ marginTop: '8px' }}
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