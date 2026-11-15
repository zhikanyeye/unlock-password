<div align="center">

# 青云盾加密宝

**在浏览器中安全加密文本与链接，按需生成跨设备分享。**

明文和解密密钥只在浏览器中处理；云端模式只保存加密后的密文。

<a href="https://dash.cloudflare.com/?to=/:account/pages/new/provider/github">
  <img src="https://img.shields.io/badge/%E9%83%A8%E7%BD%B2%E5%88%B0-Cloudflare%20Pages-f38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="部署到 Cloudflare Pages">
</a>
<a href="DEPLOYMENT.md">
  <img src="https://img.shields.io/badge/%E9%98%85%E8%AF%BB-%E9%83%A8%E7%BD%B2%E6%8C%87%E5%8D%97-2563eb?style=for-the-badge" alt="阅读部署指南">
</a>

<br>

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-f38020?logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-64748b)

</div>

## ✨ 为什么选择青云盾

| 场景 | 处理方式 |
| --- | --- |
| 只在本机使用 | 密文保存在当前浏览器，不上传服务器 |
| 跨设备分享 | 上传密文到 Cloudflare KV，生成链接和二维码 |
| 保护分享内容 | 解密密钥不写入链接，也不会发送到 API |
| 管理已分享内容 | 支持有效期、历史记录和独立撤销凭据 |

## 🔐 核心能力

- **QYS1 分段加密**：基于 Web Crypto API 的 AES-256-GCM、HKDF-SHA-256 和随机密钥。
- **两种工作模式**：本地加密无需后端，云端模式支持跨设备解密。
- **安全分享流程**：链接或二维码只携带分享 ID，解密密钥需要通过其他渠道发送；二维码可下载保存，支持摄像头扫码和上传二维码图片识别。
- **图片加密**：上传图片后自动转换为 Base64 数据进行加密，解密后自动恢复为图片并下载。
- **可靠上传重试**：网络中断导致响应不明确时，可在限定时间内重试同一次上传。
- **历史格式兼容**：支持 AES、DES、3DES、Rabbit 和 RC4 历史密文解密。旧算法安全性较低，不建议用于新内容。

## 🚀 快速开始

需要 Node.js 20.9 或更高版本，推荐 Node.js 22。

```bash
git clone -b real https://github.com/zhikanyeye/unlock-password.git
cd unlock-password
npm ci
npm run dev
```

开发服务器默认只提供前端页面。无需配置后端即可使用本地加密、解密和历史记录功能。

## ☁️ 部署到 Cloudflare Pages

点击上方 **部署到 Cloudflare Pages** 按钮，选择 GitHub 仓库后填写：

| 配置项 | 值 |
| --- | --- |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| Node.js | `22` |

> **注意**：Cloudflare Pages 目前没有将 Pages、Functions 和 KV 完全自动配置好的官方一键按钮。按钮会打开 Pages Git 部署入口；要启用跨设备分享，还需要绑定 `CIPHERTEXT_KV`。请按 [完整部署指南](DEPLOYMENT.md) 完成 KV、`ADMIN_TOKEN`、限流和验证配置。

### 云端部署必需项

1. 在 Pages 项目中绑定名为 `CIPHERTEXT_KV` 的 Workers KV 命名空间。
2. 生产和预览环境分别配置绑定，并重新部署。
3. 为公开 API 配置 Cloudflare WAF 或 Rate Limiting。

### 可选的永久内容

在 Pages 服务端配置 `ADMIN_TOKEN` 后，管理员可以创建不过期内容。它只能作为服务端 Secret 配置，禁止放入 `VITE_` 环境变量或提交到仓库。

## 🧪 本地检查

```bash
npm run build
npm run lint
npm run preview
```

## 🛡️ 安全边界

- 明文和解密密钥不会写入 `localStorage`、KV 或 API 请求。
- 解密密钥不包含在分享链接或二维码中，必须单独传递。
- 图片原文件支持至多 10 MiB；由于 Base64 和加密封装会增加体积，浏览器端密文负载上限为 16 MiB。
- 过期和撤销只能阻止后续从 KV 获取密文，不能收回已下载或保存的内容。
- 浏览器扩展、恶意脚本和剪贴板仍可能造成信息泄露，请在可信环境中使用。

## 📁 项目结构

```text
src/                  前端应用、页面组件和加密逻辑
functions/             Cloudflare Pages Functions API
public/                静态资源和单页路由配置
DEPLOYMENT.md          Cloudflare Pages 完整部署指南
```

## 📄 许可证

详见 [LICENSE](LICENSE)。
