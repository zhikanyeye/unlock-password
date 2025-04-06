# 青云盾加密宝 部署指南

本文档提供两种部署方式：1) 通过命令行部署本地下载的代码仓库；2) 通过Fork项目使用用户界面部署。本项目使用Cloudflare Pages进行部署，不需要使用Cloudflare Workers。

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
# 应用配置
VITE_APP_TITLE=青云盾加密宝
VITE_APP_DESCRIPTION="安全的文本加密分享工具"

# 存储配置
VITE_USE_REMOTE_STORAGE=true

# 管理员配置
VITE_ADMIN_PASSWORD=你的管理员密码

# Cloudflare配置（用于wrangler部署）

```

注意：所有客户端可访问的环境变量都必须使用VITE_前缀。

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
- `VITE_APP_TITLE`: 青云盾加密宝（应用标题）
- `VITE_APP_DESCRIPTION`: 安全的文本加密分享工具（应用描述）
- `VITE_USE_REMOTE_STORAGE`: true（启用远程存储）
- `VITE_ADMIN_PASSWORD`: 你的管理员密码（用于创建永久不过期的加密内容）


注意：所有客户端可访问的环境变量都必须使用VITE_前缀。

### 4. 访问部署
部署完成后，访问Cloudflare Pages提供的URL即可使用。

## 前置要求

1. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
2. 安装 Node.js (推荐 v18 或更高版本)
3. 安装 pnpm (推荐) 或 npm

## 部署步骤

### 1. 创建 KV 命名空间

1. 在 Cloudflare Dashboard 中创建一个新的 KV 命名空间
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 点击「Workers & Pages」
   - 在左侧菜单选择「KV」
   - 点击「Create namespace」
   - 输入命名空间名称（如：qingyun-shield-kv）
   - 创建后，复制显示的ID
2. 记录下命名空间的 ID，后续配置环境变量时需要使用

### 2. 配置环境变量

1. 在 Cloudflare Dashboard 中设置环境变量：
   - 在Pages项目中，点击「Settings」>「Environment variables」
   - 添加以下环境变量：
     - `VITE_APP_TITLE`: 青云盾加密宝
     - `VITE_APP_DESCRIPTION`: 安全的文本加密分享工具
     - `VITE_USE_REMOTE_STORAGE`: true
     - `VITE_ADMIN_PASSWORD`: 你的管理员密码（用于管理永久不过期的加密内容）
     

2. 配置KV绑定：
   - 在Pages项目中，点击「Settings」>「Functions」
   - 找到「KV namespace bindings」部分
   - 点击「Add binding」
   - Variable name设置为`PASSWORD_STORE`（必须与代码中一致）
   - 选择你之前创建的KV命名空间

注意：加密密钥是在每次加密时随机生成的，不需要在此配置。所有客户端可访问的环境变量都必须使用VITE_前缀。

### 3. 部署应用

应用已配置为自动使用当前域名作为API基础URL，无需手动修改配置文件。

### 4. 部署前端应用

#### 方式一：使用 Cloudflare Pages（推荐）

1. 在 Cloudflare Dashboard 中创建新的 Pages 项目
2. 连接你的 Git 仓库
3. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - Node.js 版本：18 (或更高)
4. 确保已配置好环境变量和KV绑定（参见步骤2）

#### 方式二：使用其他静态托管服务

1. 构建前端应用：
```bash
pnpm build
# 或使用 npm
npm run build
```

2. 将 `dist` 目录部署到你选择的静态托管服务
3. 注意：如果使用其他托管服务，需要确保KV存储配置正确，否则加密内容可能无法被他人访问

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

1. 如果部署失败，检查：
   - 构建命令和输出目录是否正确配置
   - Node.js版本是否兼容（推荐18+）
   - 环境变量是否正确设置

2. 如果前端应用无法正常工作，检查：
   - CORS 设置是否正确
   - KV绑定是否正确配置（变量名必须为PASSWORD_STORE）
   - 页面控制台是否有错误信息

3. 如果加密内容无法被他人访问，检查：
   - 是否正确配置了KV命名空间
   - KV绑定是否正确设置
   - 是否启用了远程存储（VITE_USE_REMOTE_STORAGE=true）

## 安全建议

1. 加密密钥是在每次加密时随机生成的，不需要配置固定的ENCRYPTION_KEY
2. 定期更新依赖包
3. 启用 Cloudflare 的安全功能
4. 考虑添加访问限制和速率限制
5. 保护 Cloudflare 账户ID和KV命名空间ID，不要泄露
6. 使用环境变量而非硬编码存储敏感信息

## 维护建议

1. 定期备份 KV 存储中的数据
2. 监控 Worker 的使用情况
3. 设置适当的数据过期策略
4. 保持代码库的更新