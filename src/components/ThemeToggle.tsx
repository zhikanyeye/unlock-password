import React, { useEffect, useState } from 'react';
import { Switch, Typography, Space, Tooltip } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ThemeToggleProps {
  onChange?: (isDarkMode: boolean) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ onChange }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // 组件加载时获取当前主题模式
  useEffect(() => {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    setIsDarkMode(currentTheme === 'dark');
  }, []);

  // 处理切换主题模式
  const handleToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    localStorage.setItem('theme', checked ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', checked ? 'dark' : 'light');
    if (onChange) {
      onChange(checked);
    }
  };

  return (
    <Space align="center">
      <Text type="secondary">主题模式:</Text>
      <Tooltip title={isDarkMode ? "夜间模式" : "日间模式"}>
        <Switch
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          checked={isDarkMode}
          onChange={handleToggle}
        />
      </Tooltip>
      <Text type="secondary">
        {isDarkMode ? "夜间" : "日间"}
      </Text>
    </Space>
  );
};

export default ThemeToggle;