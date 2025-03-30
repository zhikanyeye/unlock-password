import React, { useEffect, useState } from 'react';
import { Switch, Typography, Space, Tooltip, message } from 'antd';
import { CloudOutlined, DatabaseOutlined } from '@ant-design/icons';
import { getStorageMode, setStorageMode } from '../services/apiService';

const { Text } = Typography;

interface StorageToggleProps {
  onChange?: (useRemoteStorage: boolean) => void;
}

const StorageToggle: React.FC<StorageToggleProps> = ({ onChange }) => {
  const [useRemoteStorage, setUseRemoteStorage] = useState<boolean>(false);

  // 组件加载时获取当前存储模式
  useEffect(() => {
    const currentMode = getStorageMode();
    setUseRemoteStorage(currentMode);
  }, []);

  // 处理切换存储模式
  const handleToggle = (checked: boolean) => {
    setUseRemoteStorage(checked);
    setStorageMode(checked);
    
    // 显示提示信息
    if (checked) {
      message.success('已将密文链接保存在KV数据库，可分享给他人链接和秘钥解码');
    } else {
      message.success('已将密文链接保存在本地浏览器，请勿随意清理浏览器');
    }
    
    if (onChange) {
      onChange(checked);
    }
  };

  return (
    <Space align="center">
      <Text type="secondary">存储模式:</Text>
      <Tooltip title={useRemoteStorage ? "使用远程数据库存储" : "使用本地存储"}>
        <Switch
          checkedChildren={<DatabaseOutlined />}
          unCheckedChildren={<CloudOutlined />}
          checked={useRemoteStorage}
          onChange={handleToggle}
        />
      </Tooltip>
      <Text type="secondary">
        {useRemoteStorage ? "数据库存储" : "本地存储"}
      </Text>
    </Space>
  );
};

export default StorageToggle;