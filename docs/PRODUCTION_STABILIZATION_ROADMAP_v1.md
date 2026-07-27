# Sales Radar AI — Production Stabilization Roadmap v1

审计日期：2026-07-27  
审计方式：静态代码审计、Prisma/TypeScript/Build/Tests 验证、后端 API 探测、Codex 内置浏览器真实页面走查、AgentReach 实际运行测试。  
变更边界：本轮没有修改应用代码、产品布局或业务架构，只新增审计文档。

## 1. Executive Summary

Sales Radar AI 已经不只是前端原型：产品理解、搜索意图、Lead、Lead Research、反馈、Outcome、Learning、Contact、Channel、Outreach 与统一 AI Provider 的基础模块均已存在，数据库有 15 个 migration，构建与 107 个后端测试全部通过。

但它仍属于“可演示的混合原型”，暂不适合真实多用户生产使用。核心原因不是功能数量不足，而是运行时、数据可信度和用户隔离尚未形成闭环：

1. 默认搜索绑定 `agent-reach`，但当前真实运行因 Exa MCP 未注册而失败。
2. 后端仍使用固定 Demo User，且 Lead 列表/详情查询没有按用户过滤；真实多用户上线会产生数据泄露风险。
3. Dashboard 使用静态 Mock 指标，CRM 漏斗使用 localStorage，而 Customer Detail 已经使用持久化 LeadOutcome；同一客户存在两套销售状态。
4. Discover 能显示真实 Provider 数据，但当前数据库仍混有旧 Mock、合成用户名、重复公司候选和过长原文，影响销售判断效率。
5. Landing、Account 和部分文案表达了超出当前运行能力的承诺。

产品方向应继续聚焦：

> 理解用户卖什么 → 找到可验证的潜在公司/联系人 → 解释为何值得联系 → 给出下一步行动 → 收集反馈和结果 → 形成销售洞察。

不要把下一阶段变成通用 CRM、BI 平台或 AI 工具集合。

## 2. Current System Status

### 2.1 验证结果

| 检查项 | 结果 | 说明 |
|---|---|---|
| Backend health | PASS | `GET http://127.0.0.1:8787/api/health` 返回 `{"status":"ok"}` |
| Vite proxy | PASS | `GET http://127.0.0.1:5173/api/health` 可代理到 8787 |
| Prisma schema | PASS | `prisma validate` 通过 |
| Migration status | PASS | PostgreSQL `sales_radar_ai`；15 个 migration；schema up to date |
| Backend TypeScript | PASS | `npm run typecheck` |
| Backend build | PASS | `npm run build` |
| Frontend build | PASS | `npm run build` |
| Backend tests | PASS | 107/107 |
| Browser smoke test | PARTIAL PASS | Landing、Discover、Dashboard、Account、Assistant、Customer Detail 可加载；发现多项数据/体验问题 |
| AgentReach real runtime | FAIL | `mcporter` 找不到 `exa` MCP server |
| Learning backend | PASS with data caveat | 路由可用；当前数据为 3 条已分析 Lead、0 个产品统计、1 条低信息 Insight |
| Production cross-origin connection | NOT READY | Dev proxy 可用；后端未配置 CORS，分离域名部署会失败，除非统一同源反向代理 |

### 2.2 已完成的核心架构

- React + TypeScript + Vite + Tailwind 前端。
- Express + TypeScript + Prisma + PostgreSQL 后端。
- SearchProvider 接口、Provider Factory、Mock 与 AgentReach Provider。
- SearchTask → Provider → Extractor → Normalizer → Deduplication → Lead。
- Product Understanding / Product Intelligence Hub。
- Lead Research、Feedback、Outcome、Learning Analytics、Learning Insights。
- Contact Discovery / Ranking、Channel Discovery、Outreach。
- AIProvider Interface、Factory、RuleBased fallback、Qwen Provider、AI Usage Log。

### 2.3 当前数据观察

- `GET /api/leads` 返回 129 条 Lead。
- 浏览器中 Discover 显示 125 条，页面统计与 API 当前总数不一致，说明页面状态、筛选或旧进程数据可能造成口径漂移。
- 首批数据仍包含 `buyer_industrial_automation_*`、`Mock Buyer`、内容标题、重复 Shorr Packaging 候选。
- 同一 AgentReach 原文被拆成多个低质量公司名，例如：
  - `Shorr Packaging Corp. Shorr Packaging Corp`
  - `Containers Manufacturing - Type: Privately Held - Headquarters: Aurora`
  - `Shorr Packaging Corp. ... is a Packaging`
- Customer Detail 同时显示旧的 Mock AI Analysis 和新的 Lead Research，用户会遇到两套“AI判断”。
- 原始 Provider 文本在卡片和详情中占据过多空间，证据、客户主体和行动建议的层级不清晰。

## 3. Capability Installation Status

详细状态见 [`.agent/CAPABILITY_STATUS.md`](../.agent/CAPABILITY_STATUS.md)。

摘要：

- Already Available：Browser、Computer Use、Git/GitHub workflow、Data Analytics、Product Design/UI UX。
- Installed：Figma、Notion（具体账号与对象权限未验证）。
- Installed but runtime incomplete：Agent Reach skill；Exa MCP 未注册。
- Requires User Action：Superpowers（没有可靠兼容来源）、Remotion（当前不需要）、可选 GitHub Connector。

## 4. Product Quality Review

### 4.1 SaaS Founder 视角

核心痛点成立：全球 B2B 销售确实花费大量时间寻找公司、判断匹配度和组织第一次触达。当前产品最有价值的不是“生成文案”，而是把搜索证据转成可信的销售优先级。

当前商业风险：

- 搜索不可用时，核心价值立即归零。
- 数据中混入内容标题、重复公司和旧 Mock，会快速破坏信任。
- Landing 宣称“8 大平台实时捕捉”“190+ 国家”“24/7 实时监控”“无需信用卡”等，但当前实现是单一 Exa/MCP 查询、每次最多 5 个结果、没有持续调度、认证或计费闭环。必须先让承诺与能力一致。

### 4.2 Sales User 视角

优点：

- 搜索、客户卡、详情、研究、联系人、渠道和触达已形成可理解路径。
- 真实公司数据能够进入系统。

阻力：

- Search input 每次变化后 450ms 自动执行，可能在用户尚未完成输入时创建真实外部任务。
- Search Intent 与 Product Understanding 会显示解释，但实际 SearchTask 仍使用原始 keyword/platforms/regions，并未执行生成的多语言关键词策略。
- 结果卡的原文过长，客户主体、来源证据和推荐行动不够突出。
- Discover、Customer Detail、Dashboard 的状态口径不一致。
- Assistant 会话列表包含 Mock/低质量 Lead，且消息历史不持久。

结论：用户可能看到“很多结果”，但仍需要手工判断哪些是真客户。下一阶段应减少噪音，而不是增加更多来源。

### 4.3 Product Designer 视角

整体视觉风格已统一，卡片、按钮、侧边栏和详情页具备 B2B SaaS 基础。

需要稳定化的体验：

- 用“证据 → 判断 → 下一步”替代大段原文和重复 AI 模块。
- Learning 应呈现“系统发现”，而不是传统 BI 图表。
- Account 当前显示固定 `Sales Rep / sales@company.com / Pro 计划 / 已认证`，编辑与升级缺乏真实闭环，会产生演示感。
- Customer Detail 同时存在“销售进展”和“CRM 跟进”，是同一任务的重复表达。
- P0/P1 修复不应重新设计页面，而应统一数据源、术语和状态。

### 4.4 Technical Architect 视角

优点：

- Provider、Normalizer、Scoring、AI Provider、业务 Service 的分层方向正确。
- Prisma relation、cascade、unique/index 基础较完整。
- RuleBased fallback 保证 AI 不可用时业务可运行。

生产风险：

- Demo User 贯穿 SearchTask、Product、Feedback、Outcome、Learning。
- `lead.service.ts` 的列表与详情按 Lead 字段/ID查询，没有 `userId` ownership 条件。
- SearchTask 通过 Controller 中的 `void processSearchTask(...)` 在 Web 进程内异步执行，没有持久队列；重启可能遗留 RUNNING/PENDING 任务。
- `retryCount` 只在失败时加一，没有重试调度、退避或死信策略。
- Provider 可记录第一条 normalized Lead 的大量 metadata，生产日志需做最小化与脱敏。
- 后端没有 CORS、Helmet、rate limit、request ID 或统一 Provider health 指标。
- Factory 的默认 Provider 仍是 mock，但 SearchTask 创建时硬编码 agent-reach；配置职责不统一。
- AI Analysis 仍直接使用 Mock Analyzer，与新的 AIProvider/LeadResearch 并存。

### 4.5 QA Engineer 视角

自动化测试覆盖业务规则良好，但真实运行暴露了测试未覆盖的依赖问题：

- 107 个测试全部通过，AgentReach 独立真实运行仍失败。
- Browser 只有 React Router v7 future warnings，没有本轮发现的运行时崩溃。
- 当前测试主要验证 Service/Parser；缺少带真实 PostgreSQL、HTTP 路由、任务重启、超时、空结果和浏览器 E2E 的发布门禁。
- 本轮启动时发现旧后端进程没有加载源码中的 Learning 路由，重启后恢复，说明需要可靠的 dev/prod 进程管理与版本/commit 标识。

## 5. Confirmed Problems and Priorities

## P0 — Must fix before real users

### P0-1：真实搜索 Provider 当前不可用

证据：

```text
ProviderError: Agent Reach search failed
[mcporter] Unknown MCP server 'exa'
```

影响：默认 SearchTask 使用 `provider='agent-reach'`，用户点击搜索后任务会失败。

建议：

1. 完成 Exa MCP 注册与凭据管理。
2. 增加启动时 Provider preflight/health check。
3. 在 UI 搜索前展示可操作的 Provider unavailable 状态。
4. 建立外部 Provider smoke test 作为发布门禁。
5. 明确失败降级策略：生产环境不应静默返回 Mock 数据；可返回失败原因或切换到经批准的备用真实 Provider。

涉及：

- `backend/src/providers/search/agent-reach.provider.ts`
- `backend/src/providers/search/provider.factory.ts`
- `backend/src/services/search-task.service.ts`
- `backend/scripts/test-agent-reach-provider.ts`
- `backend/.env.example`
- 运维环境中的 `mcporter` / Exa MCP 配置

### P0-2：多用户数据隔离与真实认证缺失

证据：

- 固定 `demo@salesradar.local`。
- Lead 列表与详情没有按当前用户过滤。
- Account/侧边栏显示固定演示身份。

影响：一旦启用多个真实用户，Lead、研究或销售结果可能被越权读取；这是安全与合规阻断项。

建议：

1. 完成 JWT/session 认证中间件与真实用户上下文。
2. 所有 Lead/SearchTask/Product/Research/Contact/Channel/Outreach/Learning 查询强制带 `userId`。
3. 为越权访问建立集成测试。
4. 移除生产环境自动创建 Demo User 的路径；Demo/Seed 仅限开发环境。

涉及：

- `backend/src/config/demo-user.ts`
- `backend/src/services/demo-user.service.ts`
- `backend/src/services/lead.service.ts`
- `backend/src/services/search-task.service.ts`
- 其他按 Lead ID 查询的 services/controllers
- `backend/src/app.ts`
- `src/pages/AccountPage.tsx`
- `src/components/layout/AppSidebar.tsx`

### P0-3：两套销售状态导致数据冲突

当前：

- Discover / CustomerCard / CRM panel：localStorage `FollowUpStatus`
- Customer Detail / Learning：PostgreSQL `LeadOutcomeStatus`

影响：

- 用户可在同一 Lead 上看到互相冲突的“未联系/已联系/已回复/成交”。
- Dashboard 漏斗统计 localStorage，Learning 统计数据库 Outcome。
- 跨设备、清缓存或换浏览器会丢失 CRM 状态。

建议：

1. 确定 LeadOutcome 为唯一后端事实源。
2. 建立 localStorage → LeadOutcome 的一次性、可幂等迁移。
3. 映射旧状态：
   - `new` → `NEW`
   - `contacted` → `CONTACTED`
   - `engaging` → 根据证据映射 `REPLIED` 或 `MEETING`，无法判断时保守为 `REPLIED`
   - `won` → `WON`
   - `lost` → `LOST`
4. 收藏、标签、备注若继续保留，应建立独立持久模型/API，不能混入 Outcome。
5. 迁移期间避免双写；失败可重试并显示清晰状态。

数据库/API需求：

- 复用现有 `LeadOutcome`。
- 新增或明确 Favorite/Tag/Note 的持久化边界（后续单独设计，不在本轮实现）。
- 复用 `GET/POST/PUT /api/leads/:id/outcome`。
- 增加批量迁移 endpoint 或前端幂等同步流程。

涉及：

- `src/lib/crmStore.ts`
- `src/lib/useCrm.ts`
- `src/services/api.ts`
- `src/components/discover/CRMStatusBar.tsx`
- `src/components/discover/CustomerCard.tsx`
- `src/pages/CustomerDetailPage.tsx`
- `src/pages/DashboardPage.tsx`
- `backend/src/services/lead-outcome.service.ts`

### P0-4：生产前后端连接策略未确定

已确认：开发代理 `/api → localhost:8787` 正常。

风险：

- `VITE_API_BASE_URL` 已预留，但后端没有 CORS。
- 若生产前后端不同域，浏览器请求会失败。
- 若采用同源反向代理，则需要正式的 `/api` 路由、HTTPS、健康检查与部署配置。

建议：优先采用同源部署；如必须跨域，明确允许域、credentials 和安全 headers，禁止 `*` 配合凭据。

涉及：

- `vite.config.ts`
- `.env.example`
- `backend/.env.example`
- `backend/src/app.ts`
- 生产反向代理/Hosting 配置

### P0-5：产品承诺与真实能力不一致

Landing 当前宣称 8 平台实时捕捉、190+ 国家、24/7 监控等，当前系统尚未提供对应可验证能力。

影响：早期客户信任、合规和商业承诺风险。

建议：在能力正式上线前，文案应改为可验证范围；每项关键承诺需绑定技术指标与监控。

涉及：

- `src/pages/LandingPage.tsx`
- 产品营销资料与销售 Demo 话术

## P1 — Important improvements

### P1-1：Dashboard 从 Mock 转向可信 Sales Intelligence

确认：

- `getDashboardStats/getDiscoveryTrend/getIndustryDistribution/getPlatformDistribution` 返回 `src/data/dashboard.ts` 静态数据。
- 漏斗读取 localStorage CRM。
- 后端已有 `/api/learning/overview`、`/products`、`/insights`。

建议体验：

- 顶部不再展示不可追溯的固定数字。
- 首屏显示 3–5 条“系统发现”，例如：
  - 哪类产品/市场组合回复更好；
  - 哪个销售角度在当前样本中更有效；
  - 哪些高分 Lead 实际没有回复。
- 样本不足必须显示样本量与 LOW confidence。
- 基础数字只作为证据，不把页面做成 BI Dashboard。

涉及：

- `src/pages/DashboardPage.tsx`
- `src/services/api.ts`
- `src/data/dashboard.ts`
- `backend/src/routes/learning.routes.ts`
- `backend/src/services/sales-learning-analytics.service.ts`
- `backend/src/services/sales-learning-insight.service.ts`

### P1-2：搜索策略真正进入执行链

当前 UI 会调用 Search Intent 和 Product Understanding，但 SearchTask 仍只接收用户原始 keyword/platforms/regions。

建议：

1. 用户输入“产品 + 市场 + 行业 + 客户类型”。
2. Search Intent 生成目标类型、地区、行业与商业关键词。
3. Product Profile 贡献 buyer/channel keywords。
4. 生成少量可解释的搜索子任务，而非一次超长查询。
5. 输出公司/Lead/证据/推荐销售角度，并展示“为何命中”。

注意：保持现有 SearchTask 核心模型；先扩展输入编排和可观测性，不重写 Provider 架构。

涉及：

- `src/pages/DiscoverPage.tsx`
- `src/services/api.ts`
- `backend/src/services/search-intent.service.ts`
- `backend/src/services/search-keyword-expansion.service.ts`
- `backend/src/services/product-intelligence.service.ts`
- `backend/src/services/search-task.service.ts`

### P1-3：Lead 数据质量与结果排序

建议发布门槛：

- 公司主体去重率、非公司内容占比、Unknown 比例、来源 URL 可访问率可量化。
- 同一来源产生多个公司候选时必须有明确证据，不应把段落片段当公司。
- Discover 默认按 `company > person > community/content` 与商业证据排序。
- 卡片只展示摘要；原始正文折叠并限制长度。
- 旧 Mock/合成数据在开发环境可保留，但生产查询必须隔离。

涉及：

- `backend/src/services/lead-extractor.service.ts`
- `backend/src/services/lead-normalizer.service.ts`
- `backend/src/services/lead-classifier.service.ts`
- `backend/src/services/lead-deduplication.service.ts`
- `backend/src/services/lead-scoring.service.ts`
- `src/components/discover/CustomerCard.tsx`

### P1-4：统一 AI 判断层

当前 Customer Detail 同时存在：

- Mock `AIAnalysis`
- 新的 `LeadResearch`
- Sales Intelligence/Outreach

建议：

- Lead Research 成为唯一“是否值得开发”的主判断。
- 旧 AIAnalysis 仅保留兼容读取或开发测试，不在生产 UI 作为同级模块展示。
- 明确术语：初始评分、研究评分、优先级、销售建议各自只有一个来源。

涉及：

- `backend/src/services/ai-analysis.service.ts`
- `backend/src/services/lead-research.service.ts`
- `src/pages/CustomerDetailPage.tsx`
- `src/components/discover/CustomerCard.tsx`

### P1-5：Assistant 持久化与定位

确认：

- Session 列表尝试从 Lead API生成，失败后回退 Mock。
- Message 历史使用本地静态数据。
- 每条消息实质上调用 Lead Analysis，不是持久对话。

建议：

- 在决定持久化前，先把 Assistant 定位为“对当前 Lead 的销售问答”，避免假装完整聊天系统。
- 后续如保留会话，建立 Session/Message 模型、用户隔离和可删除策略。
- 不要把所有 Lead 自动变成“会话历史”。

涉及：

- `src/pages/AssistantPage.tsx`
- `src/services/api.ts`
- `src/data/dashboard.ts`
- 后续可选的对话模型/API

### P1-6：Account 真实化

当前固定显示 Pro、已认证、自动续费和演示公司信息。

建议：

- 认证上线前明确标记开发环境或只显示真实可用设置。
- “升级套餐/API 设置”没有后端闭环时不可呈现为已可用能力。
- 不在本阶段开发计费；先实现身份、组织与数据隔离。

涉及：

- `src/pages/AccountPage.tsx`
- `src/components/layout/AppSidebar.tsx`
- 未来 auth/user endpoints

### P1-7：SearchTask 可靠性

建议：

- 将任务执行从 Web 请求进程迁移到持久 worker/queue。
- 启动时恢复长期 PENDING/RUNNING 任务。
- 实现指数退避、最大重试、可重试错误分类。
- 记录 task/provider/resultCount/duration/errorCode，不记录完整原文。
- 前端 polling 目前最多约 15 秒（60 × 250ms），与 Provider timeout 15 秒边界冲突，应统一 SLA。
- 用户输入应显式提交或更长 debounce，避免输入过程中创建任务。

涉及：

- `backend/src/controllers/search-task.controller.ts`
- `backend/src/services/search-task.service.ts`
- `backend/src/workers/`
- `src/services/api.ts`
- `src/pages/DiscoverPage.tsx`

## P2 — Future enhancements

- Provider health/latency/cost dashboard（内部运维，不做用户 BI）。
- 真实 Browser Provider 或第二个合规数据源，必须在核心搜索质量稳定后再接入。
- 设计系统在 Figma 中固化证据、置信度、空状态和错误状态。
- Learning Insight 的自然语言摘要与行动建议，但不自动修改 Prompt/模型。
- 组织级权限、审计日志、数据导出/删除。
- 前端 route-level error boundary、可访问性与移动端 E2E。
- 经验证后再评估 Chrome Extension；当前不是稳定化前置条件。

## 6. Search Discovery Engine Audit

### 6.1 当前调用链

```text
DiscoverPage
  ├─ SearchIntentService（仅用于 UI 理解提示）
  ├─ ProductUnderstandingService（仅用于 UI 理解提示）
  └─ POST /api/search-task
       └─ create task: provider=agent-reach, status=PENDING
          └─ controller fire-and-forget processSearchTask
             └─ ProviderFactory
                └─ AgentReachProvider → mcporter → Exa
                   └─ SearchResult[]
                      └─ LeadExtractor
                         └─ LeadNormalizer
                            └─ LeadDeduplication
                               └─ Prisma Lead
                                  └─ GET /api/leads
```

### 6.2 外部依赖与环境变量

必要依赖：

- Node.js
- `mcporter` Windows 可执行文件
- Exa MCP server 注册
- Exa 所需凭据/网络权限
- PostgreSQL

当前 `.env.example` 预留：

- `DATABASE_URL`
- `AGENT_REACH_MCPORTER_PATH`
- `AGENT_REACH_TIMEOUT_MS`
- `AGENT_REACH_MAX_RESULTS`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_API_KEY`

本机实际 `.env` 只检查了变量名，没有读取或记录值。当前 AgentReach 测试失败的直接原因是 Exa MCP 未注册，不是代码编译错误。

### 6.3 空结果可能原因

1. Exa MCP 未安装/未注册/凭据无效。
2. Provider timeout 或 rate limit。
3. 平台 site filter 与地区扩展使查询过窄。
4. Exa 返回 0 条。
5. Parser 把不兼容响应判为 INVALID_RESPONSE。
6. Extractor/Normalizer 过滤掉不可信内容。
7. Deduplication 判定所有结果已经存在，因此 SearchTask `resultCount=0`。
8. Web 进程重启导致任务未完成。
9. 前端约 15 秒 polling 超时早于后端完成。
10. Search Intent 生成的关键词没有实际进入 SearchTask。

### 6.4 目标输出契约

每次搜索应至少返回：

- Target product：用户销售的产品/服务。
- Market：国家、地区、语言。
- Industry：目标行业。
- Customer type：buyer/channel/both 与 company/person/content/community。
- Company candidates：可验证的公司主体、域名和来源。
- Lead candidates：仅保留有商业证据的潜在对象。
- Explanation：命中原因、证据、置信度和不确定项。
- Recommended sales angle：基于真实信号的第一步，不编造采购事件。

## 7. CRM / Sales State Migration Analysis

### 数据库需求

- `LeadOutcome` 已足够承载轻量销售阶段。
- Favorite、Tag、Note 与 Outcome 是不同概念，后续应按最小模型拆分。
- 所有模型必须有 user ownership 或通过 Lead 强制校验 ownership。

### API需求

- 保留 Outcome API。
- 增加幂等批量同步或逐条 migration API。
- 返回统一状态与更新时间，解决多标签页/多设备冲突。
- 使用 optimistic concurrency 或 `updatedAt` 冲突检测。

### 迁移风险

- localStorage 中可能包含数据库不存在的旧 customer ID。
- `engaging` 无法无损映射到新状态。
- 用户清理浏览器后无法恢复旧备注/标签。
- 双写期间会产生竞态和重复。
- 固定 Demo User 会把迁移数据归入错误账号。

### UX影响

- 迁移应静默、可重试、可解释，不做复杂 CRM onboarding。
- 用户只看到一个“销售进展”入口。
- 失败时保留本地副本并提示重新同步，不能直接丢数据。

## 8. Learning Integration Recommendation

后端能力已经存在，但前端尚未形成产品体验。

建议将 Learning 呈现为“销售发现”：

- “基于 12 个类似 Lead，德国制造业客户的回复表现高于当前平均；可信度 Medium。”
- “高匹配评分客户中仍有一批未联系，建议优先处理。”
- “成本降低角度在当前样本中比技术升级角度获得更多回复。”

原则：

- 每条 insight 包含样本量、confidence、证据窗口。
- 无数据时解释需要哪些反馈/Outcome，而不是显示空图表。
- 不展示模型、Prompt 或 API Key。
- 不自动调整评分、Prompt 或销售策略。

当前数据提醒：overview 显示 `totalAnalyzedLeads=3`，但平均分与 score buckets 均为 0；在 UI 接入前需确认历史 LeadResearch 的字段兼容和统计口径。

## 9. Recommended Development Order

### Phase 1：核心可用性与安全（P0）

1. 修复 Exa MCP/AgentReach runtime，并建立 health preflight。
2. 实现真实认证与全链路 user ownership。
3. 决定生产同源部署策略；补齐安全 headers/CORS/rate limit。
4. 统一销售状态到 LeadOutcome，并设计 localStorage 迁移。
5. 校准 Landing/Account 的产品承诺。

完成标准：

- 新账号只能看到自己的数据。
- 一次真实搜索可以稳定完成并生成可验证 Lead。
- Provider 失败时用户得到明确错误。
- 跨设备看到一致 Outcome。

### Phase 2：数据可信度与核心旅程（P1）

1. 真实 Search Intent/Product Profile 进入 SearchTask 编排。
2. 清理生产数据集与 Mock 隔离。
3. 设定 Lead quality gate、去重与排序。
4. 合并旧 AIAnalysis 与 LeadResearch 展示。
5. Browser E2E 覆盖：
   - 产品选择/自然语言输入
   - 创建任务与进度
   - 结果/空结果/Provider失败
   - Lead Research
   - Outcome/Feedback

完成标准：

- 用户在 3 分钟内从搜索到得到一个可解释的销售下一步。
- 结果不包含明显合成用户名或段落片段公司。
- 核心旅程在 Chrome/内置浏览器通过。

### Phase 3：Learning 与人性化体验（P1/P2）

1. Dashboard 改为 Learning Insight 驱动。
2. Account 接真实用户信息。
3. Assistant 明确定位并决定是否持久化。
4. 在 Figma 固化 evidence/confidence/error/empty 状态。

### Phase 4：扩展（P2）

在真实用户留存和数据质量指标成立后，才增加第二真实 Provider、Chrome Extension、更多平台或高级组织能力。

## 10. Files / Modules Affected by Future Work

| 领域 | 主要模块 |
|---|---|
| Search runtime | `backend/src/providers/search/`, `backend/src/services/search-task.service.ts`, `backend/src/workers/`, `backend/.env.example` |
| Auth / ownership | `backend/src/app.ts`, middleware、controllers、所有按 Lead/User 查询的 services |
| Lead quality | extractor、normalizer、classifier、deduplication、scoring、Discover CustomerCard |
| Sales state | `src/lib/crmStore.ts`, `src/lib/useCrm.ts`, CustomerCard、CustomerDetail、Dashboard、LeadOutcome service |
| Learning UX | Dashboard、frontend API service、Learning routes/services |
| Assistant | AssistantPage、chat API/data、后续 session/message persistence |
| Account | AccountPage、Sidebar、未来 user/auth API |
| Deployment | Vite env、backend app、安全 middleware、反向代理/hosting 配置 |

## 11. Items That Should NOT Be Changed

- 不把 Sales Radar AI 改造成通用 CRM。
- 不把 Dashboard 做成复杂 BI 后台。
- 不重写现有前端整体布局和视觉风格。
- 不破坏 SearchProvider / AIProvider 的接口分层。
- 不删除 Mock Provider；仅将其隔离到开发、Seed 和测试。
- 不删除 LeadResearch → Feedback → Outcome → Analytics → Insight 的学习基础链路。
- 不让业务 Service 直接绑定 Qwen/OpenAI/DeepSeek。
- 不在没有证据时编造公司、联系人、采购事件、预算或购买时间。
- 不在核心搜索稳定前增加更多数据源。
- 不在本阶段开发计费、会员、佣金或复杂销售团队权限。

## 12. Release Gate Proposal

生产发布前必须全部满足：

- [ ] AgentReach real smoke test 连续通过。
- [ ] Provider health 在启动时可检测，失败不返回 Mock 冒充真实数据。
- [ ] 认证和 user ownership 集成测试通过。
- [ ] Lead 列表/详情/关联实体越权测试通过。
- [ ] CRM localStorage 与 LeadOutcome 已统一。
- [ ] 生产连接、HTTPS、CORS/同源、安全 headers 和 rate limit 已验证。
- [ ] Landing 与 Account 不展示未实现承诺。
- [ ] Discover 核心 E2E 覆盖成功、空结果、Provider失败、超时。
- [ ] 数据质量抽检通过：无明显合成用户、段落片段公司和不可解释高分。
- [ ] Dashboard 不再展示固定 Mock 业务数字。
- [ ] Prisma migration、TypeScript、Build 和全量测试通过。

