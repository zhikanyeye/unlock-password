# Cloudflare Pages 部署指南

> 返回项目主页：[README.md](README.md)

本指南用于将青云盾加密宝部署为 **Cloudflare Pages 静态站点 + Pages Functions + Workers KV**。如果只需要本地模式，可以跳过本指南；`npm run dev` 不会启动云端 API。

本项目使用 **Cloudflare Pages 静态站点 + Pages Functions（运行于 Cloudflare Workers）+ Workers KV**。纯静态托管或 `npm run dev` 仅能使用本地模式，无法生成跨设备分享链接。

## 1. 创建 Pages 项目

在 Cloudflare 控制台选择 **Workers & Pages → Create application → Pages → Connect to Git → GitHub**，授权并选择完整仓库（须包含仓库根目录的 `functions/`，不能只上传 `dist/`），设置：

- Node.js：22（最低 20.9），构建命令：`npm run build`，输出目录：`dist`。
- 单页路由使用 `public/_redirects`。API 路由分别在 `functions/api/content.ts` 和 `functions/api/content/[id].ts`。
- 原仓库的旧 `wrangler.toml` 属于过时静态配置，已移除；以下绑定统一由 Pages 控制台管理。如果自行引入 Wrangler 配置，务必完整同步 KV 绑定和其他 Dashboard 配置。

## 2. 配置 KV

先在 Cloudflare 创建 Workers KV 命名空间。在 Pages 项目的 **Settings → Bindings → Add → KV namespace** 中，将变量名准确设为 `CIPHERTEXT_KV` 并选择该命名空间；生产和预览环境分别配置，随后**重新部署**。

应用会在客户端先加密，`POST /api/content` 仅接收密文、算法、有效期、创建时间和随机撤销凭据（不含明文或解密密钥）。服务端用撤销凭据的哈希派生稳定的分享 ID，并且只保存其哈希；同一次请求丢失响应后可在 5 分钟内复用原密文和凭据重试。文本、链接和图片都以客户端生成的密文保存；二维码只包含云端解密链接，不包含解密密钥。有限期记录使用 KV TTL（1 小时、1 天、7 天、30 天或 180 天，默认 7 天）；`GET /api/content/:id` 在其他设备获取密文。创建请求返回随机撤销凭据，KV 只保存其 SHA-256 哈希，`DELETE /api/content/:id` 需要对应凭据才能撤销云端副本（创建者也可从历史页操作）。旧版已存记录没有撤销凭据，仍可读但不能凭此接口撤销。

## 3. 可选：永久内容

在 Pages 设置中添加**服务端 Secret** `ADMIN_TOKEN`（不是 `VITE_ADMIN_PASSWORD`，更不能写进前端 `.env` 或提交到仓库）。创建永久云端内容时，用户在加密页面临时输入该令牌，浏览器仅在上传请求的 `X-Admin-Token` 头中发送，页面不会持久保存它。必须通过 HTTPS 访问部署站点。请限制能获得令牌的人数；普通内容不需要令牌。本地模式可选有限期，不做伪管理员认证。

## 4. 部署前设置防滥用规则

Pages Functions 的同源检查**不是限流**，匿名访问者仍可直接调用公开 API。请在 Cloudflare WAF/Rate limiting 控制台为 `POST /api/content` 设置按来源 IP 计数的频率限制（例如 10 次/分钟），为 `DELETE /api/content/*` 与 `GET /api/content/*` 设置适当限额（例如分别 10、120 次/分钟），并按流量调整。建议监控 KV 写入/读取用量及费用，配置配额告警；不要用 KV 计数器假装原子限流。某些 Cloudflare 套餐的规则能力不同，若无法设置有效限流，不宜向公众开放云端上传。

## 5. 验证

1. 在 Pages 域名选择本地模式加密，确认 `/history` 只列出密文元数据；输入明文和解密密钥不出现在浏览器持久存储。
2. 云端模式各选择短期和长期有效期，确认只在上传成功后出现链接、二维码及撤销凭据。用**另一台设备或全新浏览器配置**打开，单独输入密钥，验证解密。
3. 用错误密钥和篡改密文测试失败；未绑定 KV 时云端加密必须明确失败。检查上传请求的 `text` 仅为密文，API 响应 `Cache-Control: no-store`，Service Worker 不缓存 `/api/`。
4. 在历史页撤销云端分享，稍后用**未打开过该链接的设备**验证不可再获取密文；已访问设备可能保有缓存，无法撤回。本机仍可复制密文手动解密。测试备份 ID + 撤销凭据的手动撤销。
5. 模拟上传后响应中断：页面应标为“状态未确认”，展示原密文、解密密钥、分享 ID 和撤销凭据；在 5 分钟内重试**同一次请求**应取得同一 ID。超过窗口不能声称未保存；可用备份的 ID/撤销凭据手动撤销。刷新页面会丢失内存中的解密密钥，务必先备份。
6. 验证 WAF 对过量请求生效、Cloudflare KV 用量告警有效，并在手机浏览器实际扫码。

## 本地调试 Pages Functions

`npm run build` 后可用 `npx wrangler pages dev dist --kv=CIPHERTEXT_KV` 模拟 KV 和 Functions（首次运行可能安装 Wrangler；也可自行固定版本）。启动的 Wrangler 地址支持云端模式；只运行 Vite 的 3000 端口不提供 API。`ADMIN_TOKEN` 等服务端秘密仅应在安全的 Pages 环境变量或本地忽略版本控制的 `.dev.vars` 中配置。

> Cloudflare KV 为最终一致性存储，刚上传后立即跨区域读取可能短暂不可见；云端删除跨区域生效也可能有延迟。使用相同 ID/内容重试能恢复丢失的成功响应，但 KV 的“先读再写”**不是原子事务**：并发重试与撤销仍可能竞态。若业务要求严格的单次创建和绝不复活的撤销，请迁移到 D1 事务或 Durable Objects。过期/撤销**无法**收回接收者已保存的密文，已缓存本地记录的浏览器仍可手动解密。
