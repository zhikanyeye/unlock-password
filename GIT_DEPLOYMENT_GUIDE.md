# JiaPass Git 部署教程

本教程将指导你如何使用 Git 部署 JiaPass 项目到 Cloudflare Pages。

## 前置要求

1. 安装 [Git](https://git-scm.com/downloads)
2. 拥有 [GitHub](https://github.com) 账号
3. 拥有 [Cloudflare](https://dash.cloudflare.com) 账号

## 部署步骤

### 1. 初始化 Git 仓库并推送到 GitHub

1. 在 GitHub 上创建新的仓库
   - 访问 https://github.com/new
   - 填写仓库名称（例如：jiapass）
   - 选择仓库类型（公开或私有）
   - 点击「Create repository」

2. 在本地项目中初始化 Git 仓库
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. 添加远程仓库并推送代码
   ```bash
   git remote add origin https://github.com/你的用户名/jiapass.git
   git branch -M main
   git push -u origin main
   ```

### 2. 在 Cloudflare Pages 中创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在左侧菜单中选择「Pages」
3. 点击「Create a project」
4. 选择「Connect to Git」

### 3. 连接 GitHub 仓库

1. 点击「Connect GitHub」
2. 授权 Cloudflare 访问你的 GitHub 账号
3. 选择你刚才创建的 jiapass 仓库
4. 点击「Begin setup」

### 4. 配置构建设置

按照 DEPLOYMENT.md 中的配置要求，设置以下参数：

1. Project name: 输入你想要的项目名称
2. Production branch: `main`
3. Build settings:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables:
     - NODE_VERSION: 18

### 5. 部署确认

1. 点击「Save and Deploy」
2. Cloudflare Pages 将自动开始构建和部署你的项目
3. 等待部署完成，你将获得一个 *.pages.dev 域名

## 后续更新

当你需要更新网站时，只需要：

1. 在本地修改代码
2. 提交更改
   ```bash
   git add .
   git commit -m "更新说明"
   git push
   ```
3. Cloudflare Pages 将自动检测到更改并重新部署

## 注意事项

1. 确保 .gitignore 文件正确配置，避免提交不必要的文件
2. 部署前最好在本地运行 `npm run build` 确保构建正常
3. 如果遇到部署问题，可以在 Cloudflare Pages 的部署日志中查看详细信息

## 常见问题解决

1. 如果构建失败，检查：
   - Node.js 版本是否正确
   - 所有依赖是否正确安装
   - 构建命令是否正确

2. 如果部署后网站无法访问，检查：
   - 构建输出目录是否正确设置为 `dist`
   - 是否有必要的环境变量未设置

需要更多帮助，请参考：
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages)
- [GitHub 文档](https://docs.github.com)