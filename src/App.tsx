import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Layout, Row, Col, Space } from 'antd';
import './App.css';
import './theme.css';
import Home from './components/Home';
import Encrypt from './components/Encrypt';
import Decrypt from './components/Decrypt';
import StorageToggle from './components/StorageToggle';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';

const { Content } = Layout;

// 创建一个包含条件渲染逻辑的组件
const AppContent = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // 只在主页显示主题切换按钮
  const showThemeToggle = currentPath === '/';
  
  // 只在加密页面显示存储模式切换按钮
  const showStorageToggle = currentPath === '/encrypt';
  
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {(showThemeToggle || showStorageToggle) && (
        <Row justify="end" style={{ padding: '12px 24px' }}>
          <Col>
            <Space size="large">
              {showThemeToggle && <ThemeToggle />}
              {showStorageToggle && <StorageToggle />}
            </Space>
          </Col>
        </Row>
      )}
      <Content>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/encrypt" element={<Encrypt />} />
          <Route path="/decrypt" element={<Decrypt />} />
        </Routes>
      </Content>
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
