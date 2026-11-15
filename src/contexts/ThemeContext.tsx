import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

type ThemeType = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('dark');

  useEffect(() => {
    // 从本地存储中获取主题设置，如果没有则默认为暗色主题
    const savedTheme = localStorage.getItem('theme') as ThemeType;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    // 应用主题到根元素
    document.documentElement.setAttribute('data-theme', savedTheme || 'dark');
  }, []);

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义钩子，用于在组件中访问主题上下文
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};