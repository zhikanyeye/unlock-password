import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Divider, Input, message, Select, Space, Tabs, Typography } from 'antd';
import { CameraOutlined, CopyOutlined, DownloadOutlined, FileTextOutlined, HomeOutlined, KeyOutlined, LinkOutlined, ReloadOutlined, UnlockOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { decrypt, decryptContent, EncryptionType, parseFullKey } from '../utils/cryptoUtils';
import { getEncryptedContent } from '../services/apiService';
import { copyToClipboard } from '../utils/clipboard';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Decrypt: React.FC = () => {
  const location = useLocation();
  const [encryptedId, setEncryptedId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [manualEncryptedText, setManualEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [encryptionType, setEncryptionType] = useState<EncryptionType>(EncryptionType.QYS1);
  const [manualType, setManualType] = useState<EncryptionType>(EncryptionType.QYS1);
  const [fetching, setFetching] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [expirationTime, setExpirationTime] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get('tab') === 'manual' ? 'manual' : 'link');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setActiveTab(searchParams.get('tab') === 'manual' ? 'manual' : 'link');
    setSecretKey('');
    setManualEncryptedText('');
  }, [location.search]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id') || '';
    let cancelled = false;
    setEncryptedId(id);
    setEncryptedText('');
    setDecryptedText(null);
    setFetchError('');
    setExpirationTime(null);
    setIsExpired(false);
    if (!id) {
      setFetching(false);
      return;
    }
    setFetching(true);
    getEncryptedContent(id).then(data => {
      if (cancelled) return;
      setEncryptedText(data.text);
      setEncryptionType(data.type);
      if (data.expirationTime === -1) {
        setExpirationTime(-1);
      } else {
        const expiry = data.timestamp + data.expirationTime;
        setExpirationTime(expiry);
        setIsExpired(Boolean(data.isExpired) || Date.now() > expiry);
      }
    }).catch(error => {
      if (!cancelled) setFetchError(error instanceof Error ? error.message : '无法获取加密内容');
    }).finally(() => {
      if (!cancelled) setFetching(false);
    });
    return () => { cancelled = true; };
  }, [location.search, retryCount]);

  const notFound = /\b404\b|密文不存在/.test(fetchError);

  const handleDecrypt = async () => {
    const linkTab = activeTab === 'link';
    if (linkTab && (isExpired || (expirationTime !== null && expirationTime !== -1 && Date.now() >= expirationTime))) {
      setIsExpired(true);
      message.warning('链接中的内容已过期，请使用已保存的密文手动解密');
      return;
    }
    const text = linkTab ? encryptedText : manualEncryptedText;
    if (!text.trim()) {
      message.error('没有可解密的密文，请输入密文或检查链接');
      return;
    }
    const fullKey = secretKey.trim();
    if (!fullKey) {
      message.error('请输入解密密钥');
      return;
    }
    setDecryptedText(null);
    setDecrypting(true);
    try {
      let type = linkTab ? encryptionType : manualType;
      let key = fullKey;
      if (fullKey.includes(':')) {
        const parsed = parseFullKey(fullKey);
        if (linkTab && parsed.type !== encryptionType) throw new Error('密钥算法与链接中的密文不匹配');
        type = parsed.type;
        key = parsed.key;
      }
      if (!key.trim()) throw new Error('密钥不能为空');
      const decrypted = type === EncryptionType.QYS1
        ? await decryptContent(text, type, key)
        : decrypt(text, type, key);
      // Legacy ciphers may return an empty string rather than throw for an incorrect key.
      if (!decrypted) throw new Error('解密结果为空，请检查密钥和加密类型');
      setDecryptedText(decrypted);
      message.success('解密成功！');
    } catch (error) {
      message.error('解密失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setDecrypting(false);
    }
  };

  const isHttpUrl = (text: string): boolean => {
    try {
      return ['http:', 'https:'].includes(new URL(text).protocol);
    } catch {
      return false;
    }
  };

  const isImageDataUrl = (text: string): boolean => /^data:image\/[a-z0-9.+-]+;base64,/i.test(text);

  const downloadImage = () => {
    if (!decryptedText || !isImageDataUrl(decryptedText)) return;
    const link = document.createElement('a');
    link.href = decryptedText;
    link.download = '青云盾解密图片';
    link.click();
  };

  return (
    <Card className="decrypt-card" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3}><UnlockOutlined /> 解密内容</Title>
        <Space>
          <Link to="/scan"><Button icon={<CameraOutlined />}>扫码</Button></Link>
          <Link to="/"><Button type="primary" icon={<HomeOutlined />}>返回首页</Button></Link>
        </Space>
      </div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Tabs activeKey={activeTab} onChange={key => { setActiveTab(key); setDecryptedText(null); }} items={[
          {
            key: 'link', label: <span><LinkOutlined /> 通过链接解密</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {!encryptedId && <Text type="secondary">请使用包含内容 ID 的解密链接访问此页面；密钥需另外提供。</Text>}
                {fetching && <Text type="secondary">正在获取密文…</Text>}
                {fetchError && (
                  <Alert type="warning" showIcon message="无法获取链接中的密文"
                    description={notFound
                      ? `${fetchError}。云端密文可能尚未同步到当前地区，也可能已失效或撤销；可稍后手动重试。如已保存密文，请切换到手动输入解密。`
                      : `${fetchError}。如已保存密文，请切换到手动输入解密。`} />
                )}
                {encryptedId && notFound && !fetching && (
                  <Button icon={<ReloadOutlined />} onClick={() => setRetryCount(count => count + 1)}>重试获取密文</Button>
                )}
                {isExpired && <Alert type="warning" showIcon message="链接中的内容已过期；如已保存密文，可切换到手动输入解密。" />}
                {encryptedText && (
                  <>
                    <Alert
                      type="success"
                      showIcon
                      message="加密密文已自动加载"
                      description="无需再次粘贴密文，只需输入单独保存的解密密钥即可解锁。"
                    />
                    <Alert type="warning" showIcon message="解密密钥不会被保存" description="密钥是唯一的解密方式，请从创建者处单独获取并妥善保存；历史记录只能找回密文。" />
                    <Text strong>密钥（不在链接中）：</Text>
                    <Input.Password prefix={<KeyOutlined />} placeholder="请输入单独收到的解密密钥" value={secretKey} onChange={e => { setSecretKey(e.target.value); setDecryptedText(null); }} />
                  </>
                )}
                {expirationTime === -1 && <Text type="secondary">此加密内容永久有效</Text>}
                {expirationTime !== null && expirationTime !== -1 && <Text type="secondary">此内容{isExpired ? '已于' : '将于'} {new Date(expirationTime).toLocaleString()} 过期</Text>}
              </Space>
            ),
          },
          {
            key: 'manual', label: <span><FileTextOutlined /> 手动输入解密</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>加密内容：</Text>
                <TextArea rows={4} value={manualEncryptedText} onChange={e => { setManualEncryptedText(e.target.value); setDecryptedText(null); }} placeholder="请输入需要解密的密文" />
                <Text strong>加密算法（输入完整密钥时自动识别）：</Text>
                <Select value={manualType} onChange={value => { setManualType(value); setDecryptedText(null); }} options={[
                  { value: EncryptionType.QYS1, label: 'QYS1 · AES-GCM' },
                  { value: EncryptionType.AES, label: 'AES（旧版）' },
                  { value: EncryptionType.DES, label: 'DES（旧版）' },
                  { value: EncryptionType.TripleDES, label: '3DES（旧版）' },
                  { value: EncryptionType.Rabbit, label: 'Rabbit（旧版）' },
                  { value: EncryptionType.RC4, label: 'RC4（旧版）' },
                ]} />
                {manualType !== EncryptionType.QYS1 && <Alert type="warning" showIcon message="旧版算法不安全，仅供兼容旧密文。" />}
                <Text strong>密钥：</Text>
                <Alert type="warning" showIcon message="请妥善保存解密密钥" description="密钥是唯一的解密方式，系统不会保存或恢复；丢失密钥将无法解密。" />
                <Input.Password prefix={<KeyOutlined />} placeholder="请输入解密密钥（如 QYS1-AES-GCM:…）" value={secretKey} onChange={e => { setSecretKey(e.target.value); setDecryptedText(null); }} />
              </Space>
            ),
          },
        ]} />
        <Button type="primary" onClick={handleDecrypt} loading={decrypting} disabled={activeTab === 'link' && (fetching || isExpired)} block>解密</Button>
        {decryptedText !== null && (
          <>
            <Divider />
            <Text strong>解密结果：</Text>
            <TextArea rows={4} value={decryptedText} readOnly />
            <Space wrap>
              <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(decryptedText, '解密内容已复制')}>复制内容</Button>
              {isHttpUrl(decryptedText) && (
                <Button icon={<LinkOutlined />} onClick={() => window.open(decryptedText, '_blank', 'noopener,noreferrer')}>打开链接</Button>
              )}
              {isImageDataUrl(decryptedText) && (
                <Button icon={<DownloadOutlined />} onClick={downloadImage}>下载图片</Button>
              )}
            </Space>
            {isImageDataUrl(decryptedText) && <img className="decrypted-image" src={decryptedText} alt="解密后的图片" />}
          </>
        )}
      </Space>
    </Card>
  );
};

export default Decrypt;
