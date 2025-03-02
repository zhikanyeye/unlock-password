# JiaPass 部署指南

本文档将指导你如何部署 JiaPass 的前端应用和后端 Cloudflare Workers 服务。

## 前置要求

1. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
2. 安装 Node.js (推荐 v18 或更高版本)
3. 安装 pnpm (推荐) 或 npm

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
pnpm add -g wrangler
# 或使用 npm
npm install -g wrangler
```

### 2. 登录 Cloudflare 账号

```bash
wrangler login
```

### 3. 创建 KV 命名空间

1. 在 Cloudflare Dashboard 中创建一个新的 KV 命名空间
2. 记录下命名空间的 ID
3. 修改 `wrangler.toml` 文件中的配置：

```toml
[[kv_namespaces]]
id = "你的KV命名空间ID"
preview_id = "你的预览命名空间ID"
binding = "JIAPASS_KV"
```

### 4. 配置环境变量

1. 在 Cloudflare Dashboard 中设置 Worker 的环境变量
2. 设置 `ENCRYPTION_KEY` 为你的自定义密钥

### 5. 部署 Worker

```bash
# 发布 Worker
wrangler deploy
```

### 6. 更新 API 配置

修改 `src/services/apiService.ts` 中的 `API_BASE_URL`：

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://你的worker名称.你的子域名.workers.dev'
  : 'http://localhost:8787';
```

### 7. 部署前端应用

#### 方式一：使用 Cloudflare Pages

1. 在 Cloudflare Dashboard 中创建新的 Pages 项目
2. 连接你的 Git 仓库
3. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - Node.js 版本：18 (或更高)

#### 方式二：使用其他静态托管服务

1. 构建前端应用：
```bash
pnpm build
# 或使用 npm
npm run build
```

2. 将 `dist` 目录部署到你选择的静态托管服务

## 验证部署

1. 访问你的前端应用域名
2. 尝试加密一段文本
3. 使用生成的链接和密钥进行解密

## 故障排除

1. 如果 Worker 部署失败，检查：
   - Wrangler 是否正确登录
   - KV 命名空间 ID 是否正确
   - 环境变量是否正确设置

2. 如果前端应用无法连接 Worker，检查：
   - API_BASE_URL 是否正确配置
   - CORS 设置是否正确
   - Worker 是否正常运行

## 安全建议

1. 使用强密码作为 `ENCRYPTION_KEY`
2. 定期更新依赖包
3. 启用 Cloudflare 的安全功能
4. 考虑添加访问限制和速率限制

## 维护建议

1. 定期备份 KV 存储中的数据
2. 监控 Worker 的使用情况
3. 设置适当的数据过期策略
4. 保持代码库的更新