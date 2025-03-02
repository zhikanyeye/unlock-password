# JiaPass | 加密分享工具

[English](#english) | [中文](#chinese)

<h2 id="english">English</h2>

## Overview
JiaPass is a secure text and URL encryption tool that allows users to encrypt sensitive information and share it safely with others. It supports multiple encryption algorithms and features a unique interference mechanism to prevent common decryption tools from breaking the encryption.

## Key Features
- Multiple encryption algorithms support (AES, DES, TripleDES, Rabbit, RC4)
- Random key generation with customizable length
- Client-side encryption for maximum security
- Interference mechanism to enhance encryption strength
- Easy-to-use interface for both encryption and decryption
- Support for both text and URL encryption
- One-click copying of encrypted content, key, and decryption link

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/jiapass.git

# Navigate to the project directory
cd jiapass

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage
1. Enter the text or URL you want to encrypt
2. Select the encryption algorithm
3. Set the key length (optional)
4. Click "Encrypt"
5. Share the encrypted content and key with the recipient

<h2 id="chinese">中文</h2>

## 概述
JiaPass是一款安全的文本和URL加密工具，允许用户加密敏感信息并安全地与他人分享。它支持多种加密算法，并具有独特的干扰机制，防止常见解密工具破解加密内容。

## 主要特点
- 支持多种加密算法（AES、DES、TripleDES、Rabbit、RC4）
- 可自定义长度的随机密钥生成
- 客户端加密以确保最大安全性
- 增强加密强度的干扰机制
- 简单易用的加密和解密界面
- 支持文本和URL加密
- 一键复制加密内容、密钥和解密链接

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/jiapass.git

# 进入项目目录
cd jiapass

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 使用方法
1. 输入您想要加密的文本或URL
2. 选择加密算法
3. 设置密钥长度（可选）
4. 点击"加密"
5. 与接收者分享加密内容和密钥

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
