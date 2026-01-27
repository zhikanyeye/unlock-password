import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Typography, Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('应用错误:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="home-container">
          <Card>
            <Result
              status="error"
              title="出错了"
              subTitle="应用遇到了一个错误，请尝试刷新页面"
              extra={
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />} 
                  onClick={this.handleReload}
                  size="large"
                >
                  刷新页面
                </Button>
              }
            >
              {this.state.error && (
                <div style={{ marginTop: '16px', textAlign: 'left' }}>
                  <Text type="secondary" code>
                    {this.state.error.message}
                  </Text>
                </div>
              )}
            </Result>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
