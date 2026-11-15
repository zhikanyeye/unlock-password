import React, { useState } from 'react';
import { Button, Card, Empty, Input, List, message, Popconfirm, Space, Tag, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, FileTextOutlined, HistoryOutlined, HomeOutlined, StopOutlined, UnlockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { deleteLocalContent, getLocalCiphertext, listLocalContent, revokeCloudContent } from '../services/apiService';
import { copyToClipboard } from '../utils/clipboard';

const { Title, Text } = Typography;
type LocalEntry = ReturnType<typeof listLocalContent>[number];

const History: React.FC = () => {
  const [manualId, setManualId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [entries, setEntries] = useState<LocalEntry[]>(() => {
    try {
      return listLocalContent().sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  });

  const copyCiphertext = async (id: string) => {
    try {
      await copyToClipboard(getLocalCiphertext(id), '密文已复制（请单独保存密钥）');
    } catch (error) {
      message.error('无法读取密文: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const revoke = async (id: string) => {
    try {
      await revokeCloudContent(id);
      setEntries(previous => previous.map(entry => entry.id === id ? { ...entry, revoked: true, canRevoke: false } : entry));
      message.success('云端撤销请求已完成；本地密文仍可复制并手动解密');
    } catch (error) {
      message.error('撤销云端分享失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const revokeManually = async () => {
    setRevoking(true);
    try {
      const supplied = manualId.trim();
      const id = supplied.includes('?') ? new URL(supplied, window.location.origin).searchParams.get('id') || supplied : supplied;
      await revokeCloudContent(id, manualToken.trim());
      setEntries(previous => previous.map(entry => entry.id === id ? { ...entry, revoked: true, canRevoke: false } : entry));
      setManualId('');
      setManualToken('');
      message.success('云端撤销请求已完成；已保存的密文副本无法撤回');
    } catch (error) {
      message.error('撤销失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setRevoking(false);
    }
  };

  const remove = (entry: LocalEntry) => {
    try {
      deleteLocalContent(entry.id);
      setEntries(previous => previous.filter(item => item.id !== entry.id));
      message.success(entry.cloud ? '本地副本已删除；云端分享不受影响' : '本地记录已删除');
    } catch (error) {
      message.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <Card style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3}><HistoryOutlined /> 本地历史记录</Title>
        <Link to="/"><Button type="primary" icon={<HomeOutlined />}>返回首页</Button></Link>
      </div>
      <Text type="secondary">仅显示此浏览器保存的密文元数据；不显示明文或密钥。删除本地副本不会撤销云端分享，且可能失去撤销能力。KV 撤销跨区域生效可能延迟；接收者已保存的副本无法撤回。</Text>
      <Card size="small" title="凭撤销凭据管理云端分享" style={{ marginTop: 16 }}>
        <Space wrap>
          <Input aria-label="待撤销的分享 ID" placeholder="分享 ID 或完整解密链接" value={manualId} onChange={e => setManualId(e.target.value)} style={{ width: 330, maxWidth: '100%' }} />
          <Input.Password aria-label="撤销凭据" placeholder="创建时保存的撤销凭据" value={manualToken} onChange={e => setManualToken(e.target.value)} style={{ width: 330, maxWidth: '100%' }} />
          <Popconfirm title="撤销该云端分享？" description="无法撤回他人已保存的密文；本机密文不受影响。" onConfirm={revokeManually} okText="确认撤销" cancelText="取消">
            <Button danger icon={<StopOutlined />} loading={revoking} disabled={!manualId.trim() || !manualToken.trim()}>撤销</Button>
          </Popconfirm>
        </Space>
      </Card>
      <List style={{ marginTop: 16 }} locale={{ emptyText: <Empty description="暂无本地记录" /> }} dataSource={entries} rowKey="id"
        renderItem={entry => {
          const expired = entry.expirationTime !== -1 && Date.now() > entry.timestamp + entry.expirationTime;
          const unavailable = expired || entry.revoked;
          return (
            <List.Item actions={[
              unavailable ? (
                <Link key="decrypt" to="/decrypt?tab=manual">
                  <Button icon={<FileTextOutlined />}>手动解密</Button>
                </Link>
              ) : (
                <Link key="decrypt" to={`/decrypt?id=${encodeURIComponent(entry.id)}`}>
                  <Button icon={<UnlockOutlined />}>解密</Button>
                </Link>
              ),
              <Button key="copy" icon={<CopyOutlined />} onClick={() => copyCiphertext(entry.id)}>复制密文</Button>,
              ...(entry.cloud && entry.canRevoke && !entry.revoked ? [
                <Popconfirm key="revoke" title="撤销云端分享？" description="新的云端访问最终会失效；已下载副本无法撤回，本地密文仍可手动解密。" onConfirm={() => revoke(entry.id)} okText="撤销云端分享" cancelText="取消">
                  <Button danger icon={<StopOutlined />}>撤销云端分享</Button>
                </Popconfirm>,
              ] : []),
              <Popconfirm key="delete" title="删除此浏览器中的副本？" description={entry.cloud ? '这不会撤销云端分享，且可能失去撤销能力。' : '删除后此浏览器将无法再读取该密文。'} onConfirm={() => remove(entry)} okText="删除本地副本" cancelText="取消">
                <Button danger icon={<DeleteOutlined />}>删除本地副本</Button>
              </Popconfirm>,
            ]}>
              <List.Item.Meta
                title={<Space wrap><Text code>{entry.id}</Text><Tag>{entry.type}</Tag><Tag>{entry.cloud ? '云端分享' : '仅本地'}</Tag>{entry.revoked && <Tag color="error">已撤销</Tag>}{expired && <Tag color="warning">已过期</Tag>}</Space>}
                description={<>创建：{new Date(entry.timestamp).toLocaleString()}<br />有效期：{entry.expirationTime === -1 ? '永久' : new Date(entry.timestamp + entry.expirationTime).toLocaleString()}{unavailable && <><br />链接不可用；请先复制本地密文，再使用密钥手动解密。</>}</>}
              />
            </List.Item>
          );
        }} />
    </Card>
  );
};

export default History;
