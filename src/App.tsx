import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import './App.css';
import Home from './components/Home';
import Encrypt from './components/Encrypt';
import Decrypt from './components/Decrypt';

const { Content } = Layout;

function App() {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/encrypt" element={<Encrypt />} />
            <Route path="/decrypt" element={<Decrypt />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;
