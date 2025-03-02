import React, { useState } from 'react';
import { Card, Input, Button, Select, Typography, message, Space, Radio, Tooltip } from 'antd';
import { CopyOutlined, LockOutlined, LinkOutlined } from '@ant-design/icons';
import { encrypt, generateRandomKey, generateFullKey, EncryptionType } from '../utils/cryptoUtils';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Encrypt: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [encryptionType, setEncryptionType] = useState<EncryptionType>(EncryptionType.AES);
  const [secretKey, setSecretKey] = useState('');
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [keyLength, setKeyLength] = useState<number>(16);
  
  // 处理加密操作
  const handleEncrypt = () => {
    if (!inputText) {
      message.error('请输入需要加密的内容');
      return;
    }
    
    try {
      // 生成随机密钥
      const key = generateRandomKey(keyLength);
      setSecretKey(key);
      
      // 加密文本
      const encrypted = encrypt(inputText, encryptionType, key);
      setEncryptedText(encrypted);
      
      // 生成完整密钥（包含加密类型）
      const fullKey = generateFullKey(encryptionType, key);
      
      // 构建解密链接
      const currentUrl = window.location.origin;
      const decryptUrl = `${currentUrl}/decrypt?data=${encodeURIComponent(encrypted)}`;
      
      message.success('加密成功！');
      
      // 将解密链接和密钥复制到剪贴板
      navigator.clipboard.writeText(`解密链接: ${decryptUrl}\n解密密钥: ${fullKey}`)
        .then(() => message.info('解密链接和密钥已复制到剪贴板'));
        
    } catch (error) {
      message.error('加密失败: ' + (error as Error).message);
    }
  };
  
  // 复制加密后的文本
  const copyEncryptedText = () => {
    if (!encryptedText) {
      message.warning('没有可复制的加密内容');
      return;
    }
    
    navigator.clipboard.writeText(encryptedText)
      .then(() => message.success('加密内容已复制到剪贴板'));
  };
  
  // 复制密钥
  const copySecretKey = () => {
    if (!secretKey) {
      message.warning('没有可复制的密钥');
      return;
    }
    
    const fullKey = generateFullKey(encryptionType, secretKey);
    navigator.clipboard.writeText(fullKey)
      .then(() => message.success('密钥已复制到剪贴板'));
  };
  
  // 复制解密链接
  const copyDecryptLink = () => {
    if (!encryptedText) {
      message.warning('请先加密内容');
      return;
    }
    
    const currentUrl = window.location.origin;
    const decryptUrl = `${currentUrl}/decrypt?data=${encodeURIComponent(encryptedText)}`;
    
    navigator.clipboard.writeText(decryptUrl)
      .then(() => message.success('解密链接已复制到剪贴板'));
  };
  
  return (
    <Card className="encrypt-card">
      <Title level={3}><LockOutlined /> 加密内容</Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Radio.Group 
            value={inputType} 
            onChange={(e) => setInputType(e.target.value)}
            style={{ marginBottom: '16px' }}
          >
            <Radio.Button value="text">文本</Radio.Button>
            <Radio.Button value="url">链接</Radio.Button>
          </Radio.Group>
        </div>
        
        {inputType === 'text' ? (
          <TextArea 
            rows={4} 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入需要加密的文本内容"
          />
        ) : (
          <Input 
            prefix={<LinkOutlined />}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入需要加密的链接"
          />
        )}
        
        <Space>
          <Select 
            defaultValue={EncryptionType.AES} 
            style={{ width: 120 }}
            onChange={(value) => setEncryptionType(value)}
          >
            <Option value={EncryptionType.AES}>AES</Option>
            <Option value={EncryptionType.DES}>DES</Option>
            <Option value={EncryptionType.TripleDES}>3DES</Option>
            <Option value={EncryptionType.Rabbit}>Rabbit</Option>
            <Option value={EncryptionType.RC4}>RC4</Option>
          </Select>
          
          <Select
            defaultValue={16}
            style={{ width: 150 }}
            onChange={(value) => setKeyLength(value)}
          >
            <Option value={8}>8位密钥</Option>
            <Option value={16}>16位密钥</Option>
            <Option value={24}>24位密钥</Option>
            <Option value={32}>32位密钥</Option>
          </Select>
          
          <Button type="primary" onClick={handleEncrypt}>加密</Button>
        </Space>
        
        {encryptedText && (
          <>
            <Paragraph>
              <Text strong>加密结果：</Text>
              <TextArea 
                rows={3} 
                value={encryptedText} 
                readOnly 
              />
              <Button 
                icon={<CopyOutlined />} 
                onClick={copyEncryptedText}
                style={{ marginTop: '8px' }}
              >
                复制加密内容
              </Button>
            </Paragraph>
            
            <Paragraph>
              <Text strong>密钥：</Text>
              <Tooltip title={secretKey}>
                <Input 
                  value={secretKey} 
                  readOnly 
                  style={{ width: '80%' }}
                />
              </Tooltip>
              <Button 
                icon={<CopyOutlined />} 
                onClick={copySecretKey}
                style={{ marginLeft: '8px' }}
              >
                复制密钥
              </Button>
            </Paragraph>
            
            <Paragraph>
              <Button 
                type="dashed" 
                icon={<LinkOutlined />} 
                onClick={copyDecryptLink}
              >
                复制解密链接
              </Button>
              <Text type="secondary" style={{ marginLeft: '8px' }}>
                将链接和密钥分享给需要查看内容的人
              </Text>
            </Paragraph>
          </>
        )}
      </Space>
    </Card>
  );
};

export default Encrypt;