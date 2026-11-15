import React from 'react';
import { Card, Typography, Button, Space, Row, Col } from 'antd';
import { LockOutlined, UnlockOutlined, SafetyOutlined, HistoryOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Card>
        <Title level={2}>青云盾加密宝</Title>
        <Paragraph>
          青云盾加密宝使用 QYS1 AES-GCM 加密文本和链接。默认仅保存在当前浏览器；如需跨设备分享，请明确选择云端存储，并单独传递密钥。
        </Paragraph>
        
        <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
          <Col xs={24} sm={12}>
            <Card className="feature-card">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <LockOutlined style={{ fontSize: '48px', color: 'var(--primary-color)' }} />
                <Title level={4}>加密内容</Title>
                <Paragraph>
                  加密文本或链接。本地保存时可手动分享密文；选择云端时可生成不含密钥的链接。
                </Paragraph>
                <Link to="/encrypt">
                  <Button type="primary" size="large">
                    开始加密
                  </Button>
                </Link>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} sm={12}>
            <Card className="feature-card">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <UnlockOutlined style={{ fontSize: '48px', color: 'var(--accent-color)' }} />
                <Title level={4}>解密内容</Title>
                <Paragraph>
                  使用提供的密钥解密加密内容，只有拥有正确密钥的人才能查看原始信息。
                </Paragraph>
                <Link to="/decrypt">
                  <Button type="primary" size="large" style={{ background: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}>
                    开始解密
                  </Button>
                </Link>
              </Space>
            </Card>
          </Col>
        </Row>
        
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/history"><Button icon={<HistoryOutlined />}>查看本地历史记录</Button></Link>
        </div>

        <div style={{ marginTop: '32px' }}>
          <Title level={4}><SafetyOutlined /> 安全特性</Title>
          <Row gutter={[16, 16]} style={{ textAlign: 'left' }}>
            <Col xs={24} md={12}>
              <ul className="security-features-text">
                <li>默认使用 QYS1 AES-GCM；旧版算法仅供兼容，安全性不足</li>
                <li>密钥不包含在解密链接或二维码中</li>
                <li>历史记录只展示元数据，不展示明文或密钥</li>
              </ul>
            </Col>
            <Col xs={24} md={12}>
              <ul className="security-features-text">
                <li>客户端加密；选择云端时只上传密文</li>
                <li>默认本地保存，云端模式可跨设备获取密文</li>
                <li>管理员密码可设置永久有效期</li>
              </ul>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default Home;