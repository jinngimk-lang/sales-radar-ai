# Sales Radar AI · 销售机会发现平台

Sales Radar AI 从公开市场信号、公司资料和可追溯证据中发现销售机会，并协助用户完成研究、联系人确认和外联准备。

> 核心边界：AI 辅助研究，但不创造客户事实。只有有来源支持的信息才能进入事实层；真实发送动作必须由用户确认，并依赖已连接的发送渠道。

## 当前能力

- 市场联网研究：OpenAI Responses、Qwen 或 Exa 降级链路
- 销售机会发现：从公开来源识别人、公司、供应商与中间商
- 证据与可信度：保留来源 URL、摘录、观察时间和验证状态
- 公司研究：公司身份、业务理解、匹配度、风险与下一步建议
- 公开联系人发现：官网邮箱、电话、社交主页及字段级证据
- GPT 销售执行器：搜索、研究、联系人补充和多渠道外联草稿
- 运行能力页面：显示服务端实际启用的 Provider、模型和缺失配置

真实邮件、LinkedIn 或 WhatsApp 发送不会被伪造。未连接发送账号时，系统只生成可编辑草稿并打开用户选择的渠道。

## 技术栈

### 前端

- React 18
- TypeScript 5
- Vite 5
- React Router
- Tailwind CSS
- Recharts

### 后端

- Node.js 20
- TypeScript
- Express
- Prisma
- PostgreSQL
- Railway Docker 部署

## 本地启动

### 1. 前端

```bash
cp .env.example .env
npm ci
npm run dev
```

默认前端地址由 Vite 输出，开发 API 代理目标默认为 `http://localhost:8787`。

### 2. 后端

```bash
cd backend
cp .env.example .env
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

后端至少需要：

- `DATABASE_URL`
- `JWT_SECRET`

联网 AI 和搜索能力按需配置：

- `OPENAI_API_KEY`：GPT 销售执行器及 OpenAI 市场研究
- `AI_API_KEY` / `AI_BASE_URL`：Qwen 或兼容 Provider
- `EXA_API_KEY`：Exa / Agent Reach 搜索

所有密钥只能配置在服务端环境，不得使用 `VITE_*` 暴露给浏览器。

## 验证命令

### 前端

```bash
npm run typecheck
npm test
npm run build
```

### 后端

```bash
cd backend
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

仓库的 GitHub Actions 会在 Pull Request 和 `main` 更新时自动执行前后端核心检查。

## 部署

### 前端

生产环境设置：

```text
VITE_API_BASE_URL=/api
```

若前后端使用不同域名，将其改为后端公开 API 地址。

### Railway 后端

Railway 使用 `backend/Dockerfile` 构建，并在部署前执行：

```text
prisma migrate deploy
```

必须配置：

- `DATABASE_URL`
- `JWT_SECRET`

建议配置：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `EXA_API_KEY`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_API_KEY`
- `AI_BASE_URL`

部署后检查：

- `/api/health` 返回 `status: ok`
- `/api/health/capabilities` 如实显示各能力是否启用
- Account 页面显示与服务端一致的运行状态

## 主要页面

| 路由 | 功能 |
|---|---|
| `/app/dashboard` | 市场机会中心与联网研究 |
| `/app/discover` | 销售机会、证据筛选与客户确认 |
| `/app/customer/:id` | 公司研究、联系人、渠道与销售建议 |
| `/app/assistant` | GPT 销售执行器与外联准备 |
| `/app/account` | 工作区和运行能力状态 |

## 数据真实性原则

```text
Source
  ↓
Evidence
  ↓
Fact
  ↓
Assessment
  ↓
Recommendation
```

- 不根据姓名或域名猜测邮箱和电话
- 不把身份线索误标为“可直接联系”
- 不把 Opportunity 自动当作已确认 Lead
- 不把草稿或打开外部渠道描述为“已发送”
- 不在仓库、日志或前端保存密钥和敏感用户数据
