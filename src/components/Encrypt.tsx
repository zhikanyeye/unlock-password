import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Divider, Input, message, Popconfirm, Radio, Row, Select, Space, Tooltip, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined, FileImageOutlined, HomeOutlined, KeyOutlined, LinkOutlined, LockOutlined, QrcodeOutlined } from '@ant-design/icons';
import { encrypt, encryptContent, EncryptionType, generateFullKey, generateRandomKey } from '../utils/cryptoUtils';
import { CloudUploadUncertainError, EXPIRATION_OPTIONS, storeEncryptedContent } from '../services/apiService';
import { copyToClipboard } from '../utils/clipboard';
import { QRCodeSVG } from 'qrcode.react';

const { Title, Text } = Typography;
const { TextArea } = Input;
type StorageMode = 'local' | 'cloud';
const DEFAULT_EXPIRATION = 7 * 24 * 60 * 60 * 1000;
type EncryptionResult = { text: string; fullKey: string; url: string; mode: StorageMode; expiration: string; cached: boolean; canRevoke: boolean; revokeToken?: string };
type EncryptedAttempt = { text: string; fullKey: string; type: EncryptionType; mode: StorageMode; expirationTime: number };
type PendingAttempt = EncryptedAttempt & { retry: { revokeToken: string; createdAt: number }; id: string; notice: string }; 

const Encrypt: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [contentMode, setContentMode] = useState<'text' | 'image'>('text');
  const [imageName, setImageName] = useState('');
  const [encryptionType, setEncryptionType] = useState<EncryptionType>(EncryptionType.QYS1);
  const [keyLength, setKeyLength] = useState(16);
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [adminPassword, setAdminPassword] = useState('');
  const [requestedExpirationTime, setRequestedExpirationTime] = useState(DEFAULT_EXPIRATION);
  const [result, setResult] = useState<EncryptionResult | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<PendingAttempt | null>(null);
  const [storageError, setStorageError] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const showSavedResult = (attempt: EncryptedAttempt, saved: Awaited<ReturnType<typeof storeEncryptedContent>>) => {
    const { id, expirationTime, timestamp, cached, canRevoke, revokeToken } = saved;
    const expiration = expirationTime === -1
      ? '永久不过期'
      : `将在 ${new Date(timestamp + expirationTime).toLocaleString()} 过期`;
    setResult({
      text: attempt.text,
      fullKey: attempt.fullKey,
      url: attempt.mode === 'cloud' ? `${window.location.origin}/decrypt?id=${encodeURIComponent(id)}` : '',
      mode: attempt.mode,
      expiration,
      cached,
      canRevoke,
      revokeToken,
    });
    setPendingAttempt(null);
    setInputText('');
    setImageName('');
    setAdminPassword('');
    message.success('加密并保存成功');
    if (!cached) message.warning('云端已保存，但本地缓存失败；请另行保存密文和密钥');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        message.error('图片读取失败');
        return;
      }
      setInputText(reader.result);
      setImageName(file.name);
      setStorageError('');
    };
    reader.onerror = () => message.error('图片读取失败');
    reader.readAsDataURL(file);
  };

  const isHttpUrl = (value: string): boolean => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };

  const handleEncrypt = async () => {
    if (loading || pendingAttempt) return;
    if (!inputText) {
      message.error(contentMode === 'image' ? '请先选择图片' : '请输入需要加密的内容');
      return;
    }

    if (requestedExpirationTime === -1 && (storageMode !== 'cloud' || !adminPassword.trim())) {
      message.error('永久有效需要云端 ADMIN_TOKEN');
      return;
    }

    setLoading(true);
    setStorageError('');
    setResult(null);
    setShowQrCode(false);
    let attempt: EncryptedAttempt | null = null;
    try {
      // QYS1 generates its own cryptographically secure key; key length applies only to legacy formats.
      let text: string;
      let key: string;
      if (encryptionType === EncryptionType.QYS1) {
        ({ text, key } = await encryptContent(inputText, encryptionType));
      } else {
        key = generateRandomKey(keyLength);
        text = encrypt(inputText, encryptionType, key);
      }
      attempt = {
        text,
        fullKey: generateFullKey(encryptionType, key),
        type: encryptionType,
        mode: storageMode,
        expirationTime: requestedExpirationTime,
      };
      const saved = await storeEncryptedContent(
        attempt.text, attempt.type, attempt.mode === 'cloud' ? adminPassword.trim() || undefined : undefined,
        attempt.mode, attempt.expirationTime,
      );
      showSavedResult(attempt, saved);
    } catch (error) {
      if (error instanceof CloudUploadUncertainError && attempt?.mode === 'cloud') {
        setPendingAttempt({ ...attempt, retry: error.retry, id: error.id, notice: error.message });
      } else {
        const detail = error instanceof Error ? error.message : '未知错误';
        setStorageError(`加密或存储失败：${detail}`);
        message.error(`加密或存储失败：${detail}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!pendingAttempt || loading) return;
    if (pendingAttempt.expirationTime === -1 && !adminPassword.trim()) {
      message.error('永久有效需要云端 ADMIN_TOKEN');
      return;
    }
    setLoading(true);
    setStorageError('');
    try {
      const saved = await storeEncryptedContent(
        pendingAttempt.text, pendingAttempt.type,
        pendingAttempt.expirationTime === -1 ? adminPassword.trim() || undefined : undefined,
        'cloud', pendingAttempt.expirationTime, pendingAttempt.retry,
      );
      showSavedResult(pendingAttempt, saved);
    } catch (error) {
      if (error instanceof CloudUploadUncertainError) {
        setPendingAttempt(previous => previous ? { ...previous, notice: error.message } : previous);
      } else {
        const detail = error instanceof Error ? error.message : '未知错误';
        setStorageError(`重试未成功：${detail}；仍需保留下面的信息以确认或撤销可能已创建的分享`);
        message.error(`重试未成功：${detail}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const svg = qrCodeRef.current?.querySelector('svg');
    if (!svg || !result?.url) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = 'white';
      context.fillRect(0, 0, 300, 300);
      context.drawImage(image, 0, 0, 300, 300);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = '青云盾加密宝-解密二维码.png';
      link.click();
    };
    image.onerror = () => message.error('二维码生成失败');
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  };

  return (
    <Card className="encrypt-card" style={{ maxWidth: '95%', margin: '0 auto', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3}><LockOutlined /> 加密内容</Title>
        <Link to="/"><Button type="primary" icon={<HomeOutlined />}>返回首页</Button></Link>
      </div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Radio.Group value={contentMode} onChange={(e) => {
          setContentMode(e.target.value);
          setInputText('');
          setImageName('');
          setResult(null);
        }}>
          <Radio.Button value="text">文本 / 链接</Radio.Button>
          <Radio.Button value="image"><FileImageOutlined /> 图片</Radio.Button>
        </Radio.Group>
        {contentMode === 'text' ? (
          <>
            <TextArea rows={5} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="请输入文本，或直接粘贴 http(s) 链接，系统会自动识别" />
            {inputText.trim() && <Text type="secondary">{isHttpUrl(inputText.trim()) ? '已识别为 HTTP(S) 链接' : '已识别为普通文本'}</Text>}
          </>
        ) : (
          <>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {imageName && <Text type="secondary">已选择：{imageName}</Text>}
            {inputText.startsWith('data:image/') && <img className="image-preview" src={inputText} alt="待加密图片预览" />}
          </>
        )}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={8}>
            <Select aria-label="加密算法" value={encryptionType} style={{ width: '100%' }} onChange={setEncryptionType}
              options={[
                { value: EncryptionType.QYS1, label: 'QYS1 · AES-GCM（推荐）' },
                { value: EncryptionType.AES, label: 'AES（旧版）' },
                { value: EncryptionType.DES, label: 'DES（旧版）' },
                { value: EncryptionType.TripleDES, label: '3DES（旧版）' },
                { value: EncryptionType.Rabbit, label: 'Rabbit（旧版）' },
                { value: EncryptionType.RC4, label: 'RC4（旧版）' },
              ]} />
          </Col>
          <Col xs={24} sm={8}>
            {encryptionType !== EncryptionType.QYS1 && (
              <Select aria-label="旧版密钥长度" value={keyLength} style={{ width: '100%' }} onChange={setKeyLength}
                options={[8, 16, 24, 32].map(value => ({ value, label: `${value}位密钥` }))} />
            )}
          </Col>

        </Row>
        {encryptionType !== EncryptionType.QYS1 && <Alert type="warning" showIcon message="旧版算法不安全，仅用于兼容旧内容；请优先使用 QYS1。" />}
        <div>
          <Text strong>存储方式：</Text>
          <Radio.Group value={storageMode} onChange={(e) => {
            setStorageMode(e.target.value);
            if (!pendingAttempt) setAdminPassword('');
            if (requestedExpirationTime === -1) setRequestedExpirationTime(DEFAULT_EXPIRATION);
          }}>
            <Radio value="local">本地（默认，仅此浏览器）</Radio>
            <Radio value="cloud">云端（跨设备分享）</Radio>
          </Radio.Group>
        </div>
        <Text type="secondary">{storageMode === 'local' ? '本地历史记录可在此浏览器解密；跨设备请分别保存密文和密钥。' : '云端保存密文并在本地缓存；链接和密钥必须分开传递。'}</Text>
        <div>
          <Text strong>有效期：</Text>
          <Select aria-label="有效期" value={requestedExpirationTime} style={{ width: 200 }} onChange={setRequestedExpirationTime}
            options={EXPIRATION_OPTIONS.filter((option: { label: string; value: number }) => option.value !== -1 || (storageMode === 'cloud' && Boolean(adminPassword.trim())))} />
        </div>
        {(storageMode === 'cloud' || pendingAttempt?.expirationTime === -1) && (
          <div>
            <Text strong>服务端 ADMIN_TOKEN 密钥（仅云端，永久有效时必填）：</Text>
            <Input.Password prefix={<KeyOutlined />} placeholder="输入服务端 ADMIN_TOKEN" aria-label="服务端 ADMIN_TOKEN" value={adminPassword} onChange={(e) => {
              setAdminPassword(e.target.value);
              if (!e.target.value.trim() && requestedExpirationTime === -1) setRequestedExpirationTime(DEFAULT_EXPIRATION);
            }} style={{ maxWidth: 400, display: 'block', marginTop: 8 }} />
          </div>
        )}
        <Tooltip title={storageMode === 'cloud' ? '仅选择永久有效时需要服务端验证 ADMIN_TOKEN' : '本地模式无需管理员令牌'}>
          <Button type="primary" onClick={handleEncrypt} loading={loading && !pendingAttempt} disabled={Boolean(pendingAttempt)} block>加密</Button>
        </Tooltip>
        {storageError && <Alert type="error" showIcon message="加密或保存失败" description={storageError} />}
        {pendingAttempt && (
          <>
            <Divider />
            <Alert type="warning" showIcon message="状态未确认，可能已入云端，勿刷新页面或重新加密" description={`${pendingAttempt.notice}。请备份下列信息，并在 5 分钟内重试同一次请求；之后可凭 ID 与撤销凭据手动撤销。`} />
            <Text strong>待确认的分享 ID（未确认前不要发送链接）：</Text>
            <Input value={pendingAttempt.id} readOnly aria-label="待确认的分享 ID" />
            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(pendingAttempt.id, '分享 ID 已复制')}>备份分享 ID</Button>
            <Text strong>待确认的密文：</Text>
            <TextArea rows={3} value={pendingAttempt.text} readOnly />
            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(pendingAttempt.text, '密文已复制')}>复制密文</Button>
            <Text strong>解密密钥（请单独保存和发送，不要放进链接）：</Text>
            <Input.Password value={pendingAttempt.fullKey} readOnly aria-label="待确认的解密密钥" />
            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(pendingAttempt.fullKey, '密钥已复制')}>复制密钥</Button>
            <Text strong>撤销凭据（只用于删除云端副本，不可解密；不要分享给接收者）：</Text>
            <Input.Password value={pendingAttempt.retry.revokeToken} readOnly aria-label="待确认的撤销凭据" />
            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(pendingAttempt.retry.revokeToken, '撤销凭据已复制')}>备份撤销凭据</Button>
            <Button type="primary" onClick={handleRetry} loading={loading} block>重试同一次云端保存（不重新加密）</Button>
            <Popconfirm title="放弃待确认的请求？" description="先备份 ID、撤销凭据、密文与密钥；放弃不会删除可能已经保存的云端内容。" onConfirm={() => { setPendingAttempt(null); setAdminPassword(''); }} okText="已备份，放弃" cancelText="继续保留">
              <Button danger>放弃待确认请求</Button>
            </Popconfirm>
          </>
        )}
        {result && (
          <>
            <Divider />
            <Alert type="success" showIcon message="加密并保存成功" description={result.expiration} />
            {!result.cached && <Alert type="warning" showIcon message="云端已保存，但本地缓存失败" description="请立即分别保存密文和密钥；此浏览器中可能无法撤销云端分享。" />}
            <Text strong>加密结果：</Text>
            <TextArea rows={3} value={result.text} readOnly />
            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(result.text, '密文已复制')} >复制密文</Button>
            <Text strong>解密密钥（请单独保存和发送，不要放进链接）：</Text>
            <Input.Password value={result.fullKey} readOnly aria-label="解密密钥" />
            <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(result.fullKey, '密钥已复制')}>复制密钥</Button>
            {result.mode === 'cloud' && result.url ? (
              <>
                <Text type="secondary">云端解密链接和二维码仅包含内容 ID，不包含密钥。请单独传递密钥。{result.canRevoke ? '可在本浏览器的历史记录中撤销云端分享。' : '本机未保存撤销凭据，请复制下方凭据备份。'}</Text>
                {result.revokeToken && <>
                  <Text strong>撤销凭据（只用于删除云端副本，不可解密；不要分享给接收者）：</Text>
                  <Input.Password value={result.revokeToken} readOnly aria-label="撤销凭据" />
                  <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(result.revokeToken!, '撤销凭据已复制')}>备份撤销凭据</Button>
                </>}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}><Button type="primary" icon={<LinkOutlined />} block onClick={() => copyToClipboard(result.url, '解密链接已复制')}>复制解密链接</Button></Col>
                  <Col xs={24} sm={12}><Button type="primary" icon={<QrcodeOutlined />} block onClick={() => setShowQrCode(true)}>生成二维码</Button></Col>
                </Row>
                {showQrCode && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Text strong>解密链接二维码（不含密钥）</Text>
                    <div ref={qrCodeRef} style={{ margin: '16px auto' }}><QRCodeSVG value={result.url} size={200} level="H" includeMargin /></div>
                    <Button icon={<DownloadOutlined />} onClick={downloadQRCode}>下载二维码</Button>
                  </div>
                )}
              </>
            ) : <Alert type="info" showIcon message="仅本地保存：此浏览器可在历史记录中查看元数据；跨设备请手动传递密文与密钥。" />}
          </>
        )}
      </Space>
    </Card>
  );
};

export default Encrypt;
