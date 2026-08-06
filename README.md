# Sales Radar AI · 销售机会发现平台

Sales Radar AI 从公开市场信号、公司资料和可追溯证据中发现销售机会，并协助用户完成研究、联系人确认、外联准备和收益机会管理。

> 核心边界：AI 辅助研究，但不创造客户事实。只有有来源支持的信息才能进入事实层；真实发送、KYC、签约、充值、提现和收款账户操作必须由用户本人确认。

## 当前能力

- 市场联网研究：OpenAI Responses、Qwen 或 Exa 降级链路
- 销售机会发现：从公开来源识别人、公司、供应商与中间商
- 证据与可信度：保留来源 URL、摘录、观察时间和验证状态
- 公司研究：公司身份、业务理解、匹配度、风险与下一步建议
- 公开联系人发现：官网邮箱、电话、社交主页及字段级证据
- GPT 销售执行器：搜索、研究、联系人补充和多渠道外联草稿
- 收益控制台：按风险调整后净值排序机会，分离潜在、已确认、待结算和已到账收益
- 云端浏览器实时操作：运营令牌门禁、Browserbase Live View、当前网页、心跳与可审计动作时间线
- 运行能力页面：显示服务端实际启用的 Provider、模型和缺失配置

真实邮件、LinkedIn 或 WhatsApp 发送不会被伪造。未连接发送账号时，系统只生成可编辑草稿并打开用户选择的渠道。云端浏览器未配置时，收益页面只显示“未连接”，不会用日志、占位视频或内部推理冒充实时浏览器画面。

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
- Browserbase Agent REST API（可选）
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

真实云端浏览器按需配置：

- `REVENUE_OPERATOR_TOKEN`：保护直播地址、页面信息和启动/停止控制
- `BROWSERBASE_API_KEY`：由后端调用 Browserbase Agent 与 Live View
- `REVENUE_LIVE_LOOP_ENABLED`：默认 `false`，显式设为 `true` 才持续运行
- `REVENUE_LIVE_LOOP_INTERVAL_MINUTES`：默认 30，最小 5 分钟

所有密钥只能配置在服务端环境，不得使用 `VITE_*` 暴露给浏览器。运营令牌只由页面保存在当前标签页的 `sessionStorage`，不会进入仓库或长期本地存储。

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

若前后端使用不同域名，将其改为后端公开 API 地址。前端不需要 Browserbase 密钥或运营令牌。

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

启用真实云端浏览器还需配置：

```text
REVENUE_OPERATOR_TOKEN=<长随机值>
BROWSERBASE_API_KEY=<Browserbase 服务端密钥>
BROWSERBASE_BASE_URL=https://api.browserbase.com
REVENUE_LIVE_LOOP_ENABLED=false
REVENUE_LIVE_LOOP_INTERVAL_MINUTES=30
```

先保持 `REVENUE_LIVE_LOOP_ENABLED=false`，在 `/app/revenue` 使用运营令牌解锁并手动验证第一条只读任务。确认供应商配额、画面和事件流正常后，再显式开启持续循环。云端浏览器运行可能消耗供应商配额；应用不会自动为你购买套餐或接受服务条款。

部署后检查：

- `/api/health` 返回 `status: ok`
- `/api/health/capabilities` 如实显示各能力是否启用
- `/api/revenue/dashboard?currency=USD` 返回当前工作区的收益状态
- 未带运营令牌访问 `/api/revenue/live/status` 不会返回直播地址或事件
- Account 页面显示与服务端一致的运行状态

## 云端浏览器安全边界

收益控制台只展示由 Sales Radar AI 后端实际创建的 Browserbase 会话：

- UI 不能提交任意提示词或 URL，只能选择当前工作区已有收益机会
- 后端生成只读研究任务，并拒绝本地、私网、带凭据和非 HTTP(S) 来源
- 禁止登录、注册、提交表单、发送消息、上传文件或接受条款
- 禁止 KYC、支付、钱包、充值、提现、购买、交易和杠杆
- 禁止安全扫描、漏洞利用、密钥收集、验证码或访问控制绕过
- API Key、连接 WebSocket、Selenium 地址和签名材料永不返回前端
- 页面只接收临时 Live View 地址和脱敏后的当前页面、动作与结果
- Browserbase 暂时失败时保留运行记录并在受保护时间线显示脱敏警告

## 主要页面

| 路由 | 功能 |
|---|---|
| `/app/dashboard` | 市场机会中心与联网研究 |
| `/app/discover` | 销售机会、证据筛选与客户确认 |
| `/app/customer/:id` | 公司研究、联系人、渠道与销售建议 |
| `/app/assistant` | GPT 销售执行器与外联准备 |
| `/app/revenue` | 收益排序、结算流水、真实云端浏览器 Live View 与操作时间线 |
| `/app/account` | 工作区和运行能力状态 |

## 收益确认原则

- `POTENTIAL` 仅表示机会的名义金额，不计入已确认收益
- `CONFIRMED` 必须有平台接受、奖励通知、合并记录或等效证据
- `PENDING_PAYOUT` 表示已确认但尚未到账
- `PAID` 只记录有付款凭证的已到账金额
- 风险调整值会扣除预计工时、本金占用和风险惩罚，仅用于任务排序，不构成收益保证
- 默认零本金、禁止杠杆，不执行虚假互动、未授权安全测试或要求交出密钥的任务

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
- 不把潜在奖金描述为已确认或已到账收益
- 不把普通日志、内部工具调用或推理过程描述为浏览器直播
- 不在仓库、日志或前端保存密钥和敏感用户数据
