# 青云盾加密宝 | QingYun Shield Encryption Tool

[English](#english) | [中文](#chinese)

<h2 id="english">English</h2>

## Overview
QingYun Shield is a secure text and URL encryption tool that allows users to encrypt sensitive information and share it safely with others. It supports multiple encryption algorithms and features a unique interference mechanism to prevent common decryption tools from breaking the encrypted content.

## Key Features
- Multiple encryption algorithms support (AES, DES, TripleDES, Rabbit, RC4)
- Random key generation with customizable length
- Client-side encryption for maximum security
- Interference mechanism to enhance encryption strength
- Easy-to-use interface for both encryption and decryption
- Support for both text and URL encryption
- One-click copying of encrypted content, key, and decryption link
- All encrypted content is stored only in the local browser, ensuring data privacy and security
- Dark/Light theme switching for better user experience
- Data compression for handling large text content
- QR code generation for easy sharing of decryption links

## Installation

For detailed deployment instructions, please refer to the [DEPLOYMENT.md](DEPLOYMENT.md) file.

### 基本安装步骤
```bash
# Clone repository
git clone https://github.com/your-username/unlock-password-real.git

# Enter project directory
cd unlock-password-real

# Install dependencies
npm install
# or use pnpm
pnpm install

# Configure environment variables
# Create .env file and add the following content:
# VITE_APP_TITLE=QingYun Shield
# VITE_APP_DESCRIPTION="Secure text encryption sharing tool"
# VITE_ADMIN_PASSWORD=your-admin-password


# Start development server
npm run dev
# or use pnpm
pnpm dev
```

Note: All client-accessible environment variables must use the VITE_ prefix.

## Usage Guide
1. Enter the text or URL you want to encrypt
2. Select an encryption algorithm
3. Set the key length (optional)
4. The encrypted content will be automatically saved in your local browser
5. Click "Encrypt"
6. Share the encrypted content and key with the recipient
7. Recipients can use the decryption link and key to access the content

## Storage Method
All encrypted content is stored only in your browser's local storage and will not be uploaded to any server

## Deployment

For detailed deployment instructions, please refer to the [DEPLOYMENT.md](DEPLOYMENT.md) file.

### Quick Start with Cloudflare Pages
1. Set up environment variables with VITE_ prefix
2. Deploy to Cloudflare Pages

### Git Deployment Guide

#### Prerequisites
1. Install [Git](https://git-scm.com/downloads)
2. Have a [GitHub](https://github.com) account
3. Have a [Cloudflare](https://dash.cloudflare.com) account

#### Deployment Steps
1. Create a new repository on GitHub
2. Initialize Git repository locally and push to GitHub
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/unlock-password-real.git
   git branch -M main
   git push -u origin main
   ```
3. Create a new project in Cloudflare Pages and connect to your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variables:
     - NODE_VERSION: 18
     - VITE_APP_TITLE: QingYun Shield
     - VITE_APP_DESCRIPTION: Secure text encryption sharing tool
     - VITE_ADMIN_PASSWORD: your-admin-password

All client-accessible environment variables must use the VITE_ prefix.

## Contributing
We welcome contributions from the community! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and follow our code of conduct.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<h2 id="chinese">中文</h2>

## 概述
青云盾加密宝是一款安全的文本和URL加密工具，允许用户加密敏感信息并安全地与他人分享。它支持多种加密算法，并具有独特的干扰机制，防止常见解密工具破解加密内容。

## 主要特点
- 支持多种加密算法（AES、DES、TripleDES、Rabbit、RC4）
- 可自定义长度的随机密钥生成
- 客户端加密以确保最大安全性
- 增强加密强度的干扰机制
- 简单易用的加密和解密界面
- 支持文本和URL加密
- 一键复制加密内容、密钥和解密链接

- 日/夜间主题切换，提供更好的用户体验
- 数据压缩功能，可处理大型文本内容
- 解密链接二维码生成，方便分享

## 安装

详细部署指南请参考 [DEPLOYMENT.md](DEPLOYMENT.md) 文件。

### 基本安装步骤
```bash
# Clone repository
git clone https://github.com/your-username/unlock-password-real.git

# Enter project directory
cd unlock-password-real

# Install dependencies
npm install
# or use pnpm
pnpm install

# Configure environment variables
# Create .env file and add the following content:
# VITE_APP_TITLE=QingYun Shield
# VITE_APP_DESCRIPTION="Secure text encryption sharing tool"
# VITE_ADMIN_PASSWORD=your-admin-password


# Start development server
npm run dev
# or use pnpm
pnpm dev
```

Note: All client-accessible environment variables must use the VITE_ prefix.

## 使用指南
1. 输入您想要加密的文本或URL
2. 选择加密算法
3. 设置密钥长度（可选）
4. 点击"加密"
5. 与接收者分享加密内容和密钥
6. 接收者可以使用解密链接和密钥访问内容

## 存储方式
所有加密内容仅存储在浏览器的本地存储中，确保数据隐私和安全

## 部署

详细的部署说明请参考 [DEPLOYMENT.md](DEPLOYMENT.md) 文件。

### 使用Cloudflare Pages快速开始
1. 设置带有VITE_前缀的环境变量
2. 部署到Cloudflare Pages

### Git部署指南

#### 前置要求
1. 安装 [Git](https://git-scm.com/downloads)
2. 拥有 [GitHub](https://github.com) 账号
3. 拥有 [Cloudflare](https://dash.cloudflare.com) 账号

#### 部署步骤
1. 在GitHub上创建新的仓库
2. 在本地初始化Git仓库并推送到GitHub
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/unlock-password-real.git
   git branch -M main
   git push -u origin main
   ```
3. 在Cloudflare Pages中创建新项目并连接到你的GitHub仓库
4. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 环境变量：
     - NODE_VERSION: 18
     - VITE_APP_TITLE: 青云盾加密宝
     - VITE_APP_DESCRIPTION: 安全的文本加密分享工具
     - VITE_ADMIN_PASSWORD: 你的管理员密码

所有客户端可访问的环境变量必须使用VITE_前缀。

## 参与贡献
我们欢迎社区成员参与贡献！以下是参与方式：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m '添加某个特性'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 发起 Pull Request

请确保适当更新测试，并遵循我们的行为准则。

## 开源许可
本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。