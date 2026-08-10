<div align="center">
  <img src="docs/assets/sales-radar-banner.svg" alt="Sales Radar AI — 证据优先的销售情报平台" width="100%" />

  <p><strong>把公开市场变化转化为有真实依据的销售机会。</strong></p>

  <p>
    <a href="https://sales-radar-ai.vercel.app">在线体验</a> ·
    <a href="README.md">English</a> ·
    <a href="CONTRIBUTING.md">参与开发</a> ·
    <a href="docs/AGENT_INTEGRATION.md">Agent 接入</a>
  </p>
</div>

Sales Radar AI 是一个开源销售情报工作区，用于发现市场变化、保存真实来源、评估商业相关性、研究目标企业，并把经过验证的上下文转化为销售行动建议。

它不是客户数据库，也不会制造采购意向。所有结果都遵循清晰、可追踪的路径：

```text
市场信号发现
  → 抓取 / 搜索
  → 证据排序
  → 机会评估
  → 企业研究
  → Agent 行动
  → 真实执行
  → 收益凭证
```

## 核心特点

- **证据优先**：结果保留真实 URL、来源、采集时间和验证状态。
- **不只展示 Lead**：同时呈现高匹配机会、潜在机会、市场信号和待确认信息。
- **Agent 可用**：编码 Agent 有仓库级规则，运行时 Agent 有机器可读 API 合约。
- **Provider 解耦**：搜索、网页内容获取和 Agent Runtime 采用独立适配器。
- **人工确认销售事实**：Opportunity 不等于 Customer，Evidence 不等于采购确认，外部行动需要用户明确触发。

## 产品工作区

| 工作区 | 作用 |
| --- | --- |
| AI 指挥中心 | 输入销售目标，协调搜索、研究和行动工具。 |
| 市场雷达 | 查看真实来源、市场信号、新鲜度、风险和商业判断。 |
| 企业研究 | 理解企业身份、判断依据以及下一步应验证的问题。 |
| 收益中心 | 按证据和风险排列机会，并由用户主动执行受保护的真实流程。 |

## 数据真实性边界

```text
Source ≠ Evidence ≠ Fact ≠ Assessment ≠ Opportunity ≠ Customer
```

- 不根据姓名或域名猜邮箱、电话和联系人。
- 不把企业新闻直接描述为采购行为。
- 不把 Opportunity 自动升级为 Lead。
- 不把打开外部渠道或生成草稿描述为“已发送”。
- 不把潜在金额描述为确认或到账收益。

## 本地启动

需要 Node.js 20+、PostgreSQL 和 npm。

```bash
# 前端
cp .env.example .env
npm ci
npm run dev

# 后端（新终端）
cd backend
cp .env.example .env
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

后端最低配置：

```dotenv
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
```

真实搜索还需要服务端配置：

```dotenv
AGENT_REACH_MCPORTER_PATH=mcporter
EXA_API_KEY=
```

密钥、运营令牌和浏览器凭据只能保存在服务端环境变量中，不能提交到 Git，也不能通过 `VITE_*` 暴露给浏览器。

## Agent 使用方式

- Codex、GitHub Copilot、Claude Code 等编码 Agent 应先读取 [`AGENTS.md`](AGENTS.md)、[`CONTEXT.md`](CONTEXT.md) 与 [Skill Registry](.agent/SKILL_REGISTRY.md)。
- 运行时 Agent 应使用 [`docs/AGENT_INTEGRATION.md`](docs/AGENT_INTEGRATION.md) 与 [`docs/openapi/agent-api.yaml`](docs/openapi/agent-api.yaml) 中的受控接口。

## 验证

```bash
npm run typecheck
npm test
npm run build

cd backend
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

## 参与开发

欢迎改进证据质量、搜索与 reranking、Provider 适配器、浏览器自动化、Agent 协作、企业研究和安全 CRM 工作流。请先阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 开源协议

本项目采用 [Apache License 2.0](LICENSE)。
