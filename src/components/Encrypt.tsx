import React, { useState, useRef } from 'react';
import { Card, Input, Button, Select, Typography, message, Space, Radio, Tooltip, Divider } from 'antd';
import { CopyOutlined, LockOutlined, LinkOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import { encrypt, generateRandomKey, generateFullKey, EncryptionType } from '../utils/cryptoUtils';
import { storeEncryptedContent } from '../services/apiService';
import { QRCodeSVG } from 'qrcode.react';

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
  const [decryptUrl, setDecryptUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  // 处理加密操作
  const handleEncrypt = async () => {
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
      
      // 存储加密内容
      const { id, expirationTime } = await storeEncryptedContent(encrypted, encryptionType, adminPassword);
      
      // 生成完整密钥（包含加密类型）
      const fullKey = generateFullKey(encryptionType, key);
      
      // 显示过期时间信息
      const expirationMessage = expirationTime === -1 
        ? '永久不过期' 
        : `将在 ${new Date(Date.now() + expirationTime).toLocaleString()} 过期`;
      
      // 构建解密链接
      const currentUrl = window.location.origin;
      const newDecryptUrl = `${currentUrl}/decrypt?id=${id}`;
      setDecryptUrl(newDecryptUrl);
      
      message.success(`加密成功！${expirationMessage}`);
      
      // 将解密链接和密钥复制到剪贴板
      navigator.clipboard.writeText(`解密链接: ${newDecryptUrl}\n解密密钥: ${fullKey}`)
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
    if (!decryptUrl) {
      message.warning('请先加密内容');
      return;
    }
    
    navigator.clipboard.writeText(decryptUrl)
      .then(() => message.success('解密链接已复制到剪贴板'));
  };
  
  // 生成并显示二维码
  const generateQRCode = () => {
    if (!decryptUrl) {
      message.warning('请先加密内容');
      return;
    }
    
    setShowQrCode(true);
  };
  // 下载二维码图片
  const downloadQRCode = async () => {
    if (!qrCodeRef.current || !decryptUrl) {
      message.warning('二维码不可用');
      return;
    }
    
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) {
      message.error('无法获取二维码图像');
      return;
    }
    
    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    // 设置Canvas大小
    canvas.width = 300;
    canvas.height = 300;
    
    // 将SVG转换为图像并绘制到Canvas
    return new Promise<void>((resolve) => {
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 创建下载链接
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = '青云盾加密宝-解密二维码.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          message.success('二维码已下载');
          resolve();
        }
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  };
  
  return (
    <Card className="encrypt-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
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
        
        <Space style={{ marginTop: '16px', flexWrap: 'wrap' }}>
          <Select 
            defaultValue={EncryptionType.AES} 
            style={{ width: 120, marginBottom: '8px' }}
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
            style={{ width: 150, marginBottom: '8px' }}
            onChange={(value) => setKeyLength(value)}
          >
            <Option value={8}>8位密钥</Option>
            <Option value={16}>16位密钥</Option>
            <Option value={24}>24位密钥</Option>
            <Option value={32}>32位密钥</Option>
          </Select>
          
          <Input.Password
            placeholder="管理员密码（可选）"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }}
          />
          
          <Button type="primary" onClick={handleEncrypt}>加密</Button>
        </Space>
        
        {encryptedText && (
          <>
            <Divider />
            <Paragraph>
              <Text strong>加密结果：</Text>
              <TextArea 
                rows={3} 
                value={encryptedText} 
                readOnly 
                style={{ marginTop: '8px' }}
              />
              <Button 
                icon={<CopyOutlined />} 
                onClick={copyEncryptedText}
                style={{ marginTop: '8px' }}
                type="primary"
                ghost
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
                  style={{ width: '80%', marginTop: '8px' }}
                />
              </Tooltip>
              <Button 
                icon={<CopyOutlined />} 
                onClick={copySecretKey}
                style={{ marginLeft: '8px' }}
                type="primary"
                ghost
              >
                复制密钥
              </Button>
            </Paragraph>
            
            <Paragraph>
              <Space>
                <Button 
                  type="primary" 
                  icon={<LinkOutlined />} 
                  onClick={copyDecryptLink}
                >
                  复制解密链接
                </Button>
                <Button 
                  type="primary" 
                  icon={<QrcodeOutlined />} 
                  onClick={generateQRCode}
                >
                  生成二维码
                </Button>
              </Space>
              <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                将链接和密钥分享给需要查看内容的人
              </Text>
            </Paragraph>
            
            {showQrCode && (
              <div style={{ textAlign: 'center', marginTop: '16px', padding: '16px', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                <Text strong>解密链接二维码：</Text>
                <div ref={qrCodeRef} style={{ margin: '16px auto' }}>
                  <QRCodeSVG 
                    value={decryptUrl} 
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: '/vite.svg',
                      excavate: true,
                      width: 40,
                      height: 40,
                    }}
                  />
                </div>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  onClick={downloadQRCode}
                >
                  下载二维码
                </Button>
              </div>
            )}
          </>
        )}
      </Space>
    </Card>
  );
};

export default Encrypt;