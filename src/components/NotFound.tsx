import React from 'react';
import { Card, Typography, Button, Result } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title } = Typography;

const NotFound: React.FC = () => {
  return (
    <div className="home-container">
      <Card>
        <Result
          status="404"
          title={<Title level={2}>404</Title>}
          subTitle="抱歉，您访问的页面不存在"
          extra={
            <Link to="/">
              <Button type="primary" icon={<HomeOutlined />} size="large">
                返回首页
              </Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
};

export default NotFound;
