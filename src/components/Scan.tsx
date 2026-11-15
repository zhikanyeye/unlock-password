import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Space, Typography } from 'antd';
import { CameraOutlined, HomeOutlined, LinkOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { Link, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
    } finally {
      scanner.clear();
      scannerRef.current = null;
      setScanning(false);
    }
  }, []);

  useEffect(() => () => { void stopScanner(); }, [stopScanner]);

  const openResult = (value: string) => {
    try {
      const url = new URL(value.trim(), window.location.origin);
      if (url.pathname !== '/decrypt' || !url.searchParams.get('id')) throw new Error();
      void stopScanner();
      navigate(`${url.pathname}?${url.searchParams.toString()}`);
    } catch {
      setError('二维码不是有效的青云盾解密链接');
    }
  };

  const startScanner = async () => {
    setError('');
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        decodedText => openResult(decodedText),
        () => undefined,
      );
    } catch (scanError) {
      setScanning(false);
      scannerRef.current = null;
      setError(scanError instanceof Error ? `无法启动摄像头：${scanError.message}` : '无法启动摄像头');
    }
  };

  return (
    <Card className="decrypt-card">
      <div className="page-heading">
        <Title level={3}><CameraOutlined /> 扫描解密二维码</Title>
        <Link to="/"><Button type="primary" icon={<HomeOutlined />}>返回首页</Button></Link>
      </div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Text type="secondary">允许浏览器访问摄像头后，将二维码对准取景框。扫描成功后仍需输入单独保存的解密密钥。</Text>
        <div id="qr-reader" className="qr-reader" />
        {!scanning && <Button type="primary" icon={<CameraOutlined />} onClick={() => void startScanner()}>启动摄像头扫码</Button>}
        {scanning && <Button danger onClick={() => void stopScanner()}>停止扫码</Button>}
        <Input placeholder="也可以粘贴解密链接" prefix={<LinkOutlined />} value={manualValue} onChange={e => setManualValue(e.target.value)} onPressEnter={() => openResult(manualValue)} />
        <Button onClick={() => openResult(manualValue)} disabled={!manualValue.trim()}>打开解密链接</Button>
        {error && <Alert type="error" showIcon message={error} />}
      </Space>
    </Card>
  );
};

export default Scan;
