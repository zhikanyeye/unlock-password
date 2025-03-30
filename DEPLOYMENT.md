# 青云盾加密宝 部署指南

本文档提供两种部署方式：1) 通过命令行部署本地下载的代码仓库；2) 通过Fork项目使用用户界面部署。

## 方式一：命令行部署

### 1. 下载代码仓库
```bash
git clone https://github.com/你的用户名/unlock-password-real.git
cd unlock-password-real
```

### 2. 安装依赖
```bash
pnpm install
# 或使用 npm
npm install
```

### 3. 配置环境变量
创建.env文件并配置：
```
USE_REMOTE_STORAGE=true
ADMIN_PASSWORD=你的管理员密码
```

### 4. 启动开发服务器
```bash
pnpm dev
# 或使用 npm
npm run dev
```

### 5. 构建生产版本
```bash
pnpm build
# 或使用 npm
npm run build
```

## 方式二：Fork项目UI部署

### 1. Fork项目
- 访问项目GitHub页面
- 点击右上角"Fork"按钮
- 选择你的账户作为目标

### 2. 部署到Cloudflare Pages
1. 登录Cloudflare Dashboard
2. 选择"Workers & Pages" > "Create application" > "Pages"
3. 连接你的GitHub账户
4. 选择你fork的仓库
5. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - Node.js版本：18+
6. 点击"Save and Deploy"

### 3. 配置环境变量
在Pages设置中添加：
- `VITE_USE_REMOTE_STORAGE`: true
- `VITE_ADMIN_PASSWORD`: 你的管理员密码

### 4. 访问部署
部署完成后，访问Cloudflare Pages提供的URL即可使用。

## 前置要求

1. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
2. 安装 Node.js (推荐 v18 或更高版本)
3. 安装 pnpm (推荐) 或 npm

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
binding = "PASSWORD_STORE"
```

### 4. 配置环境变量

1. 在 Cloudflare Dashboard 中设置 Worker 的环境变量
2. 设置 `ADMIN_PASSWORD` 为你的管理员密码（用于管理永久不过期的加密内容）

注意：加密密钥是在每次加密时随机生成的，不需要在此配置。

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

## 常见问题

### 命令行部署问题
- 确保所有依赖已正确安装
- 检查.env文件配置是否正确
- 确保Worker服务已正常运行

### Fork部署问题
- 检查GitHub仓库权限设置
- 确认Cloudflare Pages构建日志是否有错误
- 验证环境变量是否设置正确

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