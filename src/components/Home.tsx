import React from 'react';
import { Card, Typography, Button, Space, Row, Col } from 'antd';
import { LockOutlined, UnlockOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Card>
        <Title level={2}>青云盾加密宝</Title>
        <Paragraph>
          青云盾加密宝是一个安全的文本和链接加密工具，使用多种加密算法保护您的敏感信息。
          生成的密钥具有干扰因子，使通用解密工具难以破解您的加密内容。
        </Paragraph>
        
        <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
          <Col xs={24} sm={12}>
            <Card className="feature-card">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <LockOutlined style={{ fontSize: '48px', color: 'var(--primary-color)' }} />
                <Title level={4}>加密内容</Title>
                <Paragraph>
                  加密您的文本或链接，生成随机密钥和解密链接，安全地分享给他人。
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
        
        <div style={{ marginTop: '32px' }}>
          <Title level={4}><SafetyOutlined /> 安全特性</Title>
          <Row gutter={[16, 16]} style={{ textAlign: 'left' }}>
            <Col xs={24} md={12}>
              <ul>
                <li>支持多种加密算法：AES、DES、TripleDES、Rabbit、RC4</li>
                <li>随机生成高强度密钥</li>
                <li>添加干扰因子，防止通用解密工具破解</li>
              </ul>
            </Col>
            <Col xs={24} md={12}>
              <ul>
                <li>客户端加密，数据不经过服务器处理</li>
                <li>可自定义密钥长度，提高安全性</li>
                <li>支持管理员密钥设置永久有效期</li>
              </ul>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default Home;