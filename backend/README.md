# Sales Radar AI Backend

Node.js、TypeScript、Express、Prisma 和 PostgreSQL 后端，负责销售机会发现、证据管理、公司研究、公开联系人发现、市场联网研究和 GPT 销售执行器。

## 本地开发

```bash
cp .env.example .env
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

基础配置：

```text
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
PORT=8787
```

## Provider 配置

### GPT 销售执行器 / OpenAI 市场研究

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-5.6-sol
OPENAI_MARKET_MODEL=gpt-5.6
```

未设置 `OPENAI_API_KEY` 时，服务仍可启动，能力接口会返回 `missing_api_key`，前端据此显示未启用状态。

### Qwen 或兼容 AI Provider

```text
AI_PROVIDER=qwen
AI_MODEL=qwen-plus
AI_API_KEY=
AI_BASE_URL=
```

未配置时，部分分析会降级到规则实现，不会伪造远程模型调用。

### Exa / Agent Reach

```text
EXA_API_KEY=
AGENT_REACH_MCPORTER_PATH=mcporter
AGENT_REACH_TIMEOUT_MS=15000
```

Railway Docker 镜像已安装固定版本的 `mcporter` 和 `exa-mcp-server`。没有 Exa Key 时，Exa 搜索保持禁用，其他不依赖 Exa 的功能仍可运行。

## 健康检查

```text
GET /api/health
GET /api/health/capabilities
```

`/api/health` 只检查服务进程是否可用，不依赖外部 AI Provider。

`/api/health/capabilities` 返回：

- `marketResearch`
- `salesAI`
- `salesAgent`
- `publicContactDiscovery`
- `salesDiscovery`

该接口只返回启用状态、Provider 和模型，不返回任何密钥。

## 主要工作流

- 搜索任务与销售机会发现
- Search Evidence 与真实性边界
- Opportunity 到 Lead 的人工确认流程
- 公司身份与公司研究
- 联系人和渠道发现
- 市场信号与联网研究
- GPT 工具编排和外联准备
- 研究轨迹、反馈与结果记录

## 外联边界

后端可以生成邮件、LinkedIn、WhatsApp 和电话脚本，但不会在没有已认证发送渠道时声称消息已经发送。真实发送功能需要单独接入发送 Provider，并保存其返回的外部消息 ID。

## 验证

```bash
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

无需数据库连接的核心 Provider、信任边界和 Sales Agent 测试也会在 GitHub Actions 中执行。数据库集成测试应在提供测试 PostgreSQL 的环境中运行。

## Railway 部署

Railway 使用当前目录中的 `Dockerfile` 和 `railway.json`：

1. Docker 构建 TypeScript 服务并生成 Prisma Client
2. 部署前执行 `prisma migrate deploy`
3. 启动 `node dist/server.js`
4. 使用 `/api/health` 作为健康检查

Railway Production 环境至少需要：

- `DATABASE_URL`
- `JWT_SECRET`

要启用完整联网能力，再配置 `OPENAI_API_KEY`、`EXA_API_KEY` 或兼容 AI Provider 的服务端凭据。
