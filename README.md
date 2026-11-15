# 青云盾加密宝

青云盾加密宝是一个运行在浏览器中的文本与链接加密分享工具。明文和解密密钥默认只在浏览器内存中处理；需要跨设备分享时，可以选择将密文保存到 Cloudflare KV。

## 主要功能

- **QYS1 分段加密**：基于 Web Crypto API 的 AES-256-GCM、HKDF-SHA-256 和随机密钥。
- **本地模式**：密文保存在当前浏览器，不上传服务器。
- **云端模式**：只上传密文、算法和有效期，不上传明文或解密密钥。
- **安全分享**：生成解密链接和二维码，解密密钥需要通过其他渠道单独发送。
- **分享管理**：支持有效期、历史记录和使用独立撤销凭据撤销云端分享。
- **旧格式兼容**：保留 AES、DES、3DES、Rabbit 和 RC4 的历史密文解密能力。旧算法安全性较低，不建议用于新内容。

## 快速开始

需要 Node.js 20.9 或更高版本，推荐 Node.js 22。

```bash
npm ci
npm run dev
```

开发服务器默认只提供前端页面。打开页面后可以直接使用本地加密、解密和历史记录功能。

## 构建与检查

```bash
npm run build
npm run lint
npm run preview
```

## 云端部署

云端分享需要 Cloudflare Pages、Pages Functions 和 Workers KV。完整的创建、绑定、限流和验证步骤请参阅 [部署指南](DEPLOYMENT.md)。

部署时需要：

1. 使用 `npm run build` 构建，输出目录为 `dist`。
2. 在 Cloudflare Pages 绑定名为 `CIPHERTEXT_KV` 的 KV 命名空间。
3. 如需创建永久内容，在 Pages 服务端配置 `ADMIN_TOKEN`。
4. 为公开 API 配置 WAF 或 Rate Limiting。

`ADMIN_TOKEN` 只能配置在服务端，禁止放入 `VITE_` 环境变量或提交到仓库。

## 安全说明

- 应用不会把明文或解密密钥写入 localStorage、KV 或 API 请求。
- 解密密钥不包含在分享链接或二维码中，必须单独传递。
- QYS1 单条明文限制为 200 KiB。
- 过期和撤销只能阻止后续从 KV 获取密文，无法收回已经下载或保存的内容。
- 浏览器扩展、恶意脚本和剪贴板仍可能造成信息泄露，请在可信环境中使用。

## 项目结构

```text
src/                 前端应用、页面组件和加密逻辑
functions/            Cloudflare Pages Functions API
public/                静态资源和单页路由配置
DEPLOYMENT.md         Cloudflare Pages 部署说明
```

## 许可证

详见 [LICENSE](LICENSE)。
