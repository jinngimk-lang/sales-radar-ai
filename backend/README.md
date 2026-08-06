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

## 多模型销售 AI

标准产品理解、Lead 研究和外联内容生成支持以下 Provider：

| `AI_PROVIDER` | Key 变量 | 默认模型 | 默认 Base URL |
|---|---|---|---|
| `qwen` | `QWEN_API_KEY` | `qwen3.7-plus` | DashScope OpenAI-compatible API |
| `glm` | `GLM_API_KEY` | `glm-5.2` | Zhipu BigModel OpenAI-compatible API |
| `kimi` | `KIMI_API_KEY` | `kimi-k2.6` | Moonshot OpenAI-compatible API |
| `openai` | `OPENAI_API_KEY` | `gpt-5.6-sol` | OpenAI API |
| `rule-based` | 不需要 | `rules-v1` | 本地规则降级 |

示例：

```text
AI_PROVIDER=glm
GLM_API_KEY=your-own-provider-key
GLM_MODEL=glm-5.2
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

也可以通过 `AI_API_KEY`、`AI_MODEL` 和 `AI_BASE_URL` 覆盖当前 Provider 的专用变量，适合使用自己有权访问的企业网关或中转服务。密钥必须来自 Provider 或你控制的授权账户，不应从公开网页、代码仓库或他人账户收集。

未配置有效 Key 时，相关分析会降级到规则实现，不会伪造远程模型调用。

## GPT 销售执行器 / OpenAI 市场研究

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-5.6-sol
OPENAI_MARKET_MODEL=gpt-5.6
```

未设置 `OPENAI_API_KEY` 时，服务仍可启动，能力接口会返回 `missing_api_key`，前端据此显示未启用状态。

市场联网研究与普通销售 AI 是两个能力边界。把 `AI_PROVIDER` 改成 GLM 或 Kimi，只会切换标准销售分析；联网检索仍使用当前已实现的 OpenAI Responses、Qwen Responses-compatible 路径或 Exa，不会把没有联网能力的模型错误标记为已联网。

## Exa / Agent Reach

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

要启用某个销售模型，在 Railway 后端服务中设置 `AI_PROVIDER` 和对应 Provider 的 Key。要启用完整联网能力，再配置 `OPENAI_API_KEY`、`EXA_API_KEY` 或你控制的兼容网关凭据。
