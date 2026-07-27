# Sales Radar AI — Search Truth Recovery Plan v1

版本：v1  
范围：Phase 1 — Search Truth Recovery  
原则：最小工程修复，不重构完整产品，不增加新数据源，不把产品扩展为 CRM 或 BI。

## 1. Executive Summary

Phase 1 的唯一目标是恢复搜索可信度：

> 用户看到的每一个“本次搜索结果”，都必须确实由本次成功的真实搜索产生，并能追溯到产品上下文、来源证据和质量判断。

当前主要问题不是功能缺失，而是四条“事实链”中断：

1. Provider 事实不可靠：默认使用 AgentReach，但 Exa MCP 当前不可用。
2. 搜索结果事实不可靠：失败后前端继续展示历史 Lead。
3. 产品事实不可靠：Product Understanding、Search Intent、SearchTask 和 LeadResearch 使用不同上下文。
4. Lead 事实不可靠：内容片段、重复来源和缺失域名对象进入销售候选。

Phase 1 完成后，系统应具备以下最小保证：

- 搜索前知道 Provider 是否可用。
- 每个搜索有明确且持久的生命周期。
- 成功、空结果、失败是三个互斥状态。
- 当前搜索结果只能来自当前 SearchTask。
- Product Context 以不可变快照贯穿 SearchTask、Lead 和 LeadResearch。
- 未通过质量门槛的结果保存为 Evidence，不进入销售 Lead。
- 生产环境不会用 Mock 数据掩盖真实 Provider 失败。

## 2. Current Problems

### 2.1 Real Provider unavailable

已确认当前环境：

- `mcporter.cmd` 可执行。
- `AgentReachProvider` 可以启动子进程。
- `mcporter list` 没有 `exa` server。
- 实际调用失败：`Unknown MCP server 'exa'`。

现有系统只在执行 SearchTask 后才发现 Provider 不可用，用户需要等待失败。

### 2.2 False success in Discover

当前前端流程：

```text
create SearchTask
→ wait
→ GET /api/leads?keyword=...
→ map all matching/historical Leads
```

当 SearchTask 失败时：

- 当前 `customers` 没有在新搜索开始时隔离。
- 历史 Lead 仍留在页面。
- 页面标题使用新关键词，但卡片来自旧任务。
- 错误主要出现在 Console，用户界面没有可靠失败状态。

### 2.3 Product context drift

同一个输入可能产生：

- Product Understanding：SaaS Software。
- Search Intent：industrial automation equipment。
- Region：Europe 被识别为 Unknown。
- SearchTask：优化后关键词丢失 SaaS/Europe。
- LeadResearch：`productProfileId = null`。

当前 `SearchTask.keyword` 同时承担原始输入与执行关键词的职责，无法审计“用户说了什么”和“系统实际搜了什么”。

### 2.4 Lead and Evidence are mixed

当前任何 Normalized Lead 都可能直接进入 `Lead` 表。

后果：

- 内容标题和段落片段成为公司名。
- 同一 URL 产生多个 Lead。
- 缺失 domain 的对象仍被标为企业客户。
- 供应商自述被判断为买方采购信号。
- 低质量输入进入 LeadResearch、Outreach、Outcome 和 Learning。

### 2.5 Current SearchTask relation is insufficient

`Lead.searchTaskId` 只能表示 Lead 的单一来源任务。

但实际搜索需要支持：

- 同一个真实公司可被多个任务发现。
- 已存在 Lead 被新任务再次命中时，必须属于本次结果。
- 全局去重后，不能因为未创建新 Lead 就把本次任务显示为空。

因此需要一个轻量的 SearchTask–Lead 映射，而不是把 `Lead.searchTaskId` 当作唯一结果归属。

## 3. Proposed Architecture

## 3.1 Target flow

```text
User submits search
  ↓
Product Context Builder
  ├─ ProductProfile（可选）
  ├─ Product Understanding
  └─ User constraints
  ↓
Immutable ProductContext Snapshot
  ↓
Search Intent / Keyword Plan
  ↓
Provider Health Gate
  ├─ unavailable → structured 503, no fake results
  └─ available
       ↓
SearchTask PENDING
  ↓
SearchTask RUNNING
  ↓
SearchProvider
  ↓
SearchResult[]
  ↓
Normalize + Evidence sanitation
  ↓
Lead Quality Gate
  ├─ rejected → SearchEvidence
  └─ accepted → Lead upsert + SearchTaskLead
  ↓
SearchTask COMPLETED
  ├─ candidateCount > 0 → SUCCESS
  └─ candidateCount = 0 → EMPTY
  ↓
Frontend fetches only /search-task/:id/results
  ↓
LeadResearch reads the same ProductContext Snapshot
```

## 3.2 Component responsibilities

### ProviderHealthService

职责：

- 确认 Provider 可执行文件存在。
- 确认目标 MCP server 已注册。
- 确认 server 处于 healthy/available 状态。
- 输出稳定的错误码，不暴露完整命令或敏感配置。
- 短时间缓存健康结果，避免每次输入都启动外部进程。

建议状态：

```ts
type ProviderHealthStatus =
  | 'AVAILABLE'
  | 'DEGRADED'
  | 'UNAVAILABLE'
```

建议结果：

```json
{
  "provider": "agent-reach",
  "status": "UNAVAILABLE",
  "code": "MCP_SERVER_NOT_CONFIGURED",
  "message": "Real search is temporarily unavailable.",
  "checkedAt": "2026-07-27T00:00:00.000Z"
}
```

AgentReach 健康检查应依次验证：

1. `AGENT_REACH_MCPORTER_PATH` 可解析。
2. `mcporter` 可执行。
3. `exa` server 存在。
4. `exa` server 可连接。
5. 可选：低成本 capability/tool-list probe。

不要用真实收费搜索作为每次健康检查。

### SearchOrchestrator

职责：

- 接收原始查询和用户明确约束。
- 构建 ProductContext。
- 生成并保存执行策略。
- 进行后端权威 Provider health check。
- 创建并推进 SearchTask。
- 调用质量门槛。
- 记录真实数量与结果状态。

Controller 不应负责业务编排，只负责验证请求、调用 Orchestrator 和返回响应。

### LeadQualityGate

职责：

- 只判断“这个 Result 是否可以成为可销售 Lead”。
- 不负责生成销售文案。
- 输出 accepted/rejected、质量分、原因和可审计证据。

### SearchEvidenceStore

职责：

- 保存真实 Provider 返回但未达到 Lead 门槛的结果。
- 支持后续调试质量规则。
- 不进入 Discover 默认客户列表。
- 不触发 LeadResearch、Outreach 或 Learning。

### SearchTaskLead

职责：

- 表示某个 Lead 确实被某个 SearchTask 命中。
- 保存本次任务的匹配原因、排名和上下文匹配证据。
- 允许同一 Lead 被多个搜索任务发现。

## 4. Search Lifecycle and Truth States

## 4.1 Before search

前端可以预读 Provider 状态，但后端必须再次权威检查。

```text
Frontend opens Discover
→ GET provider health
→ show ready/unavailable

User submits
→ POST search-task
→ backend health gate
```

如果 Provider 不可用：

- 返回 HTTP `503`。
- 不创建 PENDING 任务。
- 不执行 Mock fallback。
- 不读取历史 Lead。
- 前端显示 Provider unavailable。

建议错误：

```json
{
  "error": {
    "code": "SEARCH_PROVIDER_UNAVAILABLE",
    "provider": "agent-reach",
    "retryable": true,
    "message": "Real search is temporarily unavailable."
  }
}
```

## 4.2 During search

服务端保留现有状态：

```text
PENDING
→ RUNNING
→ COMPLETED | FAILED | CANCELLED
```

前端本地可以使用：

```text
IDLE
CHECKING_PROVIDER
CREATING_TASK
POLLING
```

这些本地状态不需要写入数据库。

任务进度必须来自服务端，不能仅由时间模拟。

建议阶段字段：

```text
QUEUED
SEARCHING
NORMALIZING
QUALITY_CHECK
SAVING
```

Phase 1 可将其作为 API 计算字段或简单字符串，不需要新枚举表。

## 4.3 After search

### SUCCESS

条件：

```text
status = COMPLETED
candidateCount > 0
```

前端只请求当前 Task 的 candidates。

### EMPTY

条件：

```text
status = COMPLETED
candidateCount = 0
```

EMPTY 不是 FAILED。

前端显示：

- 系统实际执行的市场、关键词和 Provider。
- raw/evidence 数量。
- 为什么没有可销售 Lead，例如“找到 5 条来源，但均缺少可验证公司域名”。
- 调整条件或重试入口。

### FAILED

条件：

```text
status = FAILED
```

前端必须：

- 清空 `currentResults`。
- 显示用户可理解的错误。
- 保留 taskId 供支持排查。
- 允许重试为新的 SearchTask。
- 不展示旧 Lead 作为当前结果。

## 5. Remove False Success

## 5.1 Frontend state separation

Discover 应明确维护：

```ts
interface CurrentSearchState {
  taskId: string | null
  submittedQuery: string
  context: ProductContextSnapshot | null
  status:
    | 'idle'
    | 'checking'
    | 'pending'
    | 'running'
    | 'success'
    | 'empty'
    | 'failed'
  results: Customer[]
  error: SearchError | null
}
```

历史客户使用独立状态：

```ts
interface HistoricalLeadState {
  results: Customer[]
  loaded: boolean
}
```

规则：

1. 用户提交新搜索时，立即清空 `currentSearch.results`。
2. SearchTask 完成前，不把历史 Lead 注入 current results。
3. SUCCESS 只使用 `/search-task/:id/results`。
4. EMPTY 显示空状态。
5. FAILED 显示错误状态。
6. 历史 Lead 只能在明确的“历史客户”视图或区域出现。
7. 历史 Lead 不显示当前搜索关键词。

## 5.2 Remove query-based completion cache

当前前端 `completedSearches: Set<string>` 仅按 query/filter 记忆完成状态。

风险：

- 同样查询不会重新验证 Provider。
- 历史完成状态可能绕过当前真实搜索。
- 页面无法区分旧任务和新任务。

Phase 1 建议：

- 删除该客户端“已完成即跳过”逻辑。
- 任务真相只来自 `taskId`。
- 如需复用缓存，应由后端返回明确的 reusable task，并包含有效期、Provider 和上下文版本；Phase 1 不实现。

## 5.3 Result ownership

禁止：

```text
new query
→ GET /api/leads?keyword=query
```

必须：

```text
new query
→ SearchTask ID
→ GET /api/search-task/:id/results
```

历史 Lead：

```text
GET /api/leads
```

两个接口语义不可混用。

## 6. Preserve Product Context

## 6.1 Canonical ProductContext

一次搜索必须生成一个规范上下文：

```ts
interface ProductContextSnapshot {
  version: 1
  originalQuery: string

  productProfileId: string | null
  productName: string
  category: string
  industry: string
  applications: string[]

  targetType: 'buyer' | 'channel' | 'both'
  customerTypes: string[]
  buyerRoles: string[]

  regions: string[]
  countries: string[]
  languages: string[]

  buyerKeywords: string[]
  channelKeywords: string[]
  executionKeywords: string[]
  platforms: string[]

  understandingProvider: string
  intentProvider: string
  strategyVersion: string
  createdAt: string
}
```

### Required fields

最小必填：

- originalQuery
- productName
- industry
- targetType
- regions/countries 至少一项或明确 `GLOBAL`
- customerTypes
- executionKeywords
- strategyVersion

buyerRoles 可以为空，但不能被虚构。

## 6.2 Source of truth rules

优先级：

1. 用户明确选择或输入的约束。
2. 已保存 ProductProfile。
3. Product Understanding。
4. Search Intent inference。
5. Unknown。

后层不能覆盖前层的明确事实。

例：

- 用户输入 Europe，Search Intent 不得改成 Unknown。
- 用户选择 SaaS ProductProfile，关键词扩展不得把产品改成纯工业设备。
- 无法判断 buyer role 时保存空数组，不生成具体职位。

## 6.3 Snapshot, not live reference only

SearchTask 既关联 ProductProfile，也保存 ProductContext Snapshot。

原因：

- ProductProfile 未来可能被更新。
- 历史任务必须保留当时实际使用的上下文。
- LeadResearch 必须能够解释“当时为什么匹配”。

## 6.4 LeadResearch context resolution

LeadResearch 默认上下文：

```text
Lead
→ SearchTaskLead
→ SearchTask.contextSnapshot
```

如果 Lead 被多个任务发现：

- 从用户当前打开的 searchTaskId 读取上下文。
- 如果从历史 Lead 直接打开，使用最近一次有效 SearchTaskLead。
- UI 可明确显示“基于产品 X / 市场 Y 的研究”。

禁止在没有上下文时输出：

- High purchase likelihood
- Priority A
- contact_now
- 明确产品匹配结论

没有上下文时应返回：

```text
matchScore: Unknown / null
recommendedAngle: Unknown
risk: Product context missing
```

## 7. Lead Quality Gate

## 7.1 Acceptance rule

只有同时满足以下四类硬条件，Result 才能成为 sales candidate：

```text
Company verified
AND Domain available
AND Source evidence exists
AND Target customer match
```

### Company verified

至少满足一项强证据：

- Provider 返回明确 company 字段，并有一致 domain。
- 来源为该公司的官方站点/官方公司主页。
- profile/company URL 与公司主体一致。

禁止作为公司：

- YouTube 视频标题。
- Reddit/论坛帖子标题。
- 文章标题。
- 章节名、标签、主题词。
- `YouTube source`、`Facebook source`、`N/A`、`#430`。
- 句子或元数据片段。

### Domain available

要求：

- 可规范化为合法域名。
- 不是 `youtube.com`、`reddit.com`、`linkedin.com` 等来源平台域名。
- 与公司主体有证据关联。

社交 profile URL 不是 company domain。

### Source evidence exists

要求：

- 有可访问 source URL。
- 有支持公司身份或商业关系的具体文本。
- 保存 evidence excerpt 与字段来源。

不能只保存：

- 通用关键词。
- 自动生成的总结。
- 没有原文定位的 AI 判断。

### Target customer match

至少验证：

- 产品/行业相关性。
- 地区约束。
- customer type/relationship。

买方信号必须识别主语：

```text
Company is looking for / purchasing / implementing X
```

以下不是买方信号：

```text
Company sells X
Company provides procurement services
Article discusses X
Video teaches X
```

## 7.2 Gate output

```ts
interface LeadQualityDecision {
  accepted: boolean
  qualityScore: number
  rejectionCodes: string[]
  verifiedCompany: string | null
  canonicalDomain: string | null
  matchReason: string | null
  evidence: Array<{
    field: string
    excerpt: string
    sourceUrl: string
  }>
}
```

建议拒绝码：

- `COMPANY_NOT_VERIFIED`
- `DOMAIN_MISSING`
- `DOMAIN_NOT_ASSOCIATED`
- `CONTENT_ONLY`
- `INVALID_COMPANY_FRAGMENT`
- `REGION_MISMATCH`
- `CUSTOMER_TYPE_MISMATCH`
- `NO_COMMERCIAL_EVIDENCE`
- `DUPLICATE_SOURCE_SUBJECT`

## 7.3 Evidence-only storage

Rejected Result 不删除，保存为 `SearchEvidence`：

- 可用于调试 Provider 与规则。
- 可统计“raw results 与 sales candidates 的差距”。
- 不进入默认 Lead API。
- 不运行 Research/Outreach。
- 不进入 Learning 成功率统计。

## 7.4 Deduplication order

1. `userId + canonicalDomain`。
2. `userId + normalizedCompanyName + country`。
3. `userId + provider + externalId`。
4. 当前任务内 `sourceUrl + verifiedCompany`。

如果发现已存在 Lead：

- 不创建重复 Lead。
- 创建新的 `SearchTaskLead` 关联。
- 保存本次 matchReason、rank 与 evidence。

同一个来源可以产生多个公司 Lead，但每一个公司必须有独立、明确的公司证据。普通内容关键词不能拆成多个 Lead。

## 8. Database Impact

Phase 1 建议一次向后兼容 migration。

## 8.1 SearchTask fields

新增：

```prisma
originalQuery       String
productProfileId    String?
contextSnapshot     Json
executionKeywords   String[]
rawResultCount      Int      @default(0)
evidenceCount       Int      @default(0)
candidateCount      Int      @default(0)
providerCheckedAt   DateTime?
```

保留：

- `keyword`：Phase 1 可作为 primary execution keyword，后续逐步弃用其多重语义。
- `resultCount`：为向后兼容暂时保留，并与 `candidateCount` 同值。
- 现有 status/error/retry 字段。

关系：

```prisma
productProfile ProductProfile?
resultLinks    SearchTaskLead[]
evidence       SearchEvidence[]
```

## 8.2 SearchTaskLead

```prisma
model SearchTaskLead {
  id              String   @id @default(cuid())
  searchTaskId    String
  leadId          String
  rankScore       Int
  matchReason     String
  matchEvidence   Json
  createdAt       DateTime @default(now())

  searchTask SearchTask @relation(fields: [searchTaskId], references: [id], onDelete: Cascade)
  lead       Lead       @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@unique([searchTaskId, leadId])
  @@index([searchTaskId, rankScore])
}
```

## 8.3 SearchEvidence

```prisma
model SearchEvidence {
  id              String   @id @default(cuid())
  searchTaskId    String
  provider        String
  externalId      String?
  title           String?
  sourceUrl       String
  profileUrl      String?
  rawContent      String   @db.Text
  metadata        Json?
  qualityScore    Int
  rejectionCodes String[]
  promotedLeadId  String?
  createdAt       DateTime @default(now())

  searchTask SearchTask @relation(fields: [searchTaskId], references: [id], onDelete: Cascade)

  @@index([searchTaskId, qualityScore])
  @@unique([searchTaskId, provider, externalId])
}
```

如果 `externalId` 可能为空，需要在 Service 层使用 source hash 保证任务内幂等；不要依赖 nullable unique 完成全部去重。

## 8.4 Lead

不改变 Lead 核心字段含义。

建议：

- 保留现有 `searchTaskId` 作为 origin task，保持兼容。
- 新增 `searchTaskLinks SearchTaskLead[]`。
- 后续查询当前搜索结果只使用 SearchTaskLead。

## 8.5 LeadResearch

Phase 1 不必新增新的 ProductContext 表。

研究时通过：

```text
Lead → SearchTaskLead → SearchTask.contextSnapshot
```

现有 `productProfileId` 继续保存实际使用的 ProductProfile。

可选增加：

```prisma
searchTaskId String?
```

仅当需要同一 Lead 针对多个产品保存多份 Research 时使用。当前 LeadResearch 对 `leadId` 唯一，因此 Phase 1 先维持“最近上下文研究”，不要扩大到多研究版本系统。

## 8.6 Backfill

历史数据迁移：

1. 对存在 `Lead.searchTaskId` 的 Lead 创建 SearchTaskLead。
2. 标记 `matchEvidence` 为 legacy/imported。
3. 历史 SearchTask 的 `originalQuery = keyword`。
4. 无法恢复的 contextSnapshot 使用明确 Unknown，不反推或编造。
5. 历史 Mock Lead 不加入生产当前搜索结果。

## 9. API Changes

## 9.1 Provider health

```http
GET /api/search/providers/health
```

返回：

```json
{
  "data": [
    {
      "provider": "agent-reach",
      "status": "AVAILABLE",
      "checkedAt": "2026-07-27T00:00:00.000Z"
    }
  ]
}
```

不要返回：

- API Key。
- 完整环境变量。
- 可执行文件参数。
- MCP 配置内容。

## 9.2 Create SearchTask

```http
POST /api/search-task
```

请求：

```json
{
  "query": "industrial automation SaaS manufacturing companies Europe",
  "productProfileId": "optional",
  "constraints": {
    "regions": ["EUROPE"],
    "countries": [],
    "targetType": "buyer",
    "customerTypes": ["company"],
    "platforms": []
  }
}
```

后端：

1. 验证 ownership。
2. 构建 canonical ProductContext。
3. 运行 health gate。
4. 创建任务。
5. 返回 task + context snapshot。

Provider unavailable：

```http
503 SEARCH_PROVIDER_UNAVAILABLE
```

## 9.3 Get task

```http
GET /api/search-task/:id
```

返回：

```json
{
  "data": {
    "id": "...",
    "status": "COMPLETED",
    "completionType": "SUCCESS",
    "stage": "SAVING",
    "progress": 100,
    "rawResultCount": 5,
    "evidenceCount": 3,
    "candidateCount": 2,
    "context": {},
    "error": null
  }
}
```

`completionType` 为计算字段：

- SUCCESS
- EMPTY
- null

FAILED 时返回稳定错误：

```json
{
  "code": "MCP_SERVER_NOT_CONFIGURED",
  "retryable": true,
  "message": "Real search is temporarily unavailable."
}
```

## 9.4 Current task results

```http
GET /api/search-task/:id/results
```

只返回 SearchTaskLead 中的 Lead：

- 必须校验 task.userId。
- 默认按 rankScore 排序。
- 包含 task-specific matchReason/evidence。
- 不返回历史但未被本任务命中的 Lead。

## 9.5 Evidence

Phase 1 可提供内部/调试接口：

```http
GET /api/search-task/:id/evidence
```

用户 UI 默认只显示聚合原因，不需要展示所有 rejected raw content。

## 9.6 Historical leads

```http
GET /api/leads
```

语义固定为用户历史 Lead 库。

它不能再作为当前 SearchTask 的结果接口。

## 9.7 Research

保留现有：

```http
POST /api/leads/:id/research
```

增加可选：

```json
{
  "searchTaskId": "current task context"
}
```

后端必须验证：

- Lead 确实关联该 Task。
- Task 属于当前用户。
- ProductProfile 属于当前用户。

## 10. Frontend Changes

Phase 1 不改变 Discover 整体布局。

## 10.1 Search input behavior

- 输入变化：只更新 query 与低成本理解提示。
- 点击“雷达扫描”：才创建真实任务。
- 不因每次按键/筛选变化自动调用付费 Provider。

## 10.2 Provider state

搜索区域轻量显示：

- Ready。
- Temporarily unavailable。
- Checking。

不要展示 `mcporter`、MCP 或 Exa 技术细节给普通销售用户。

## 10.3 Search states

### Running

显示：

- 正在理解目标。
- 正在搜索来源。
- 正在验证公司。

### Success

显示：

- 本次任务候选数量。
- 质量过滤摘要。
- 每条 Lead 的匹配原因。

### Empty

显示：

```text
搜索已完成，但没有找到可验证的销售客户。
发现 5 条来源，其中 5 条缺少公司域名或商业匹配证据。
```

### Failed

显示：

```text
真实搜索暂时不可用，本次没有生成客户结果。
```

操作：

- 重试。
- 保留输入。
- 不显示历史 Lead。

### Historical leads

如果产品仍需展示历史 Lead：

- 使用明确标题“历史客户”。
- 不显示当前关键词标签。
- 与本次结果视觉和状态完全隔离。

## 10.4 Result card

Phase 1 每个 current result 必须展示：

- verified company。
- company domain/website。
- location。
- source。
- why matched。
- evidence excerpt。
- recommended angle 或 Unknown。

没有这些字段的对象不应出现在结果卡。

## 11. Implementation Order

## Step 0 — Environment repair

1. 在目标运行环境注册 Exa MCP。
2. 验证 `mcporter list` 可看到健康的 `exa`。
3. 验证直接 Exa tool call。
4. 验证项目 `test:agent-reach`。

完成标准：

- 连续 3 次 smoke test 成功。
- 不依赖交互式 Shell 临时配置。

## Step 1 — Provider health gate

1. 实现 ProviderHealthService。
2. 增加 health API。
3. `POST /search-task` 后端权威检查。
4. 统一 Provider 错误码。

测试：

- executable missing。
- Exa missing。
- Exa offline。
- timeout。
- available。

## Step 2 — Current results isolation

1. 增加 SearchTaskLead。
2. 回填现有 origin relations。
3. 增加 task results API。
4. 前端只用 task results。
5. 删除客户端 query completion cache。
6. 实现 success/empty/failed 独立状态。

这是恢复“搜索事实”的第一优先代码阶段。

## Step 3 — Canonical ProductContext

1. 定义 ProductContextSnapshot 类型和版本。
2. 明确用户输入优先级。
3. SearchTask 保存 originalQuery、context 和 execution keywords。
4. Europe 等显式约束加入回归测试。
5. LeadResearch 自动读取 task context。

## Step 4 — Evidence and Quality Gate

1. 增加 SearchEvidence。
2. 实现 LeadQualityGate。
3. rejected result 保存 evidence。
4. accepted result upsert Lead 并创建 SearchTaskLead。
5. 增加 source URL + company domain 去重。

## Step 5 — Browser E2E release gate

必须覆盖：

1. Provider unavailable。
2. Search failed。
3. Search completed empty。
4. Search success。
5. 历史 Lead 不进入当前结果。
6. 产品和 Europe 上下文进入 Research。
7. 同一来源内容片段不生成多个公司 Lead。

## 12. Acceptance Criteria

Phase 1 只有全部满足才完成：

- [ ] Exa MCP 在部署账号下可用。
- [ ] Provider unavailable 时 POST search 返回结构化 503。
- [ ] FAILED 搜索页面结果为 0，不展示历史 Lead。
- [ ] EMPTY 与 FAILED 有不同 UI。
- [ ] Current results 全部通过 SearchTaskLead 获取。
- [ ] 每个 current result 可追溯到本次 task 和 source evidence。
- [ ] 用户显式 Europe 不会变成 Unknown。
- [ ] SaaS ProductProfile 不会被改写成纯设备搜索。
- [ ] LeadResearch 自动读取搜索的 ProductContext。
- [ ] 无 ProductContext 时不会输出 High/A/contact_now。
- [ ] 缺少 verified company 或 domain 的结果只保存为 Evidence。
- [ ] 同一 source URL 的标签/段落片段不会成为多个 Lead。
- [ ] Mock 数据不会出现在生产 current results。
- [ ] 成功、空结果、失败 E2E 全部通过。

## 13. Risks and Mitigations

| 风险 | 影响 | 缓解 |
|---|---|---|
| Quality Gate 过严 | 初期 EMPTY 增多 | 宁可真实空结果，不返回不可用客户；记录 rejection metrics 后调整 |
| Provider health false positive | health available 但搜索失败 | POST 前检查 + 运行期错误处理；不把 health 当成功保证 |
| Exa 配置依赖本地用户 | 开发成功、部署失败 | 配置写入部署 Runbook；以服务账号执行 smoke test |
| ProductContext JSON 演进 | 历史结构不兼容 | 添加 `version`，只做向前解析 |
| ProductProfile 后续更新 | 历史搜索无法重现 | SearchTask 保存不可变 snapshot |
| 全局 Lead 去重造成当前任务“丢结果” | 已有客户不显示 | SearchTaskLead 关联已有 Lead |
| Evidence 数据量增长 | PostgreSQL 膨胀 | Phase 1 设置保留期、截断 raw content、索引 taskId |
| Domain 不可获得 | 有价值的 person/content 被过滤 | 作为 Evidence 保存；不冒充 sales candidate |
| 历史脏数据 | 新规则上线后仍污染历史页 | 标记 legacy/mock；current results 严格使用新关联 |
| Research 单 Lead 唯一 | 同一 Lead 多产品研究相互覆盖 | Phase 1 使用当前/最近 task；后续再评估多上下文 Research |
| 外部搜索成本 | 自动输入触发浪费 | 改为显式“雷达扫描”提交 |
| 多用户越权 | task/results 被其他用户读取 | 所有 health 以外 task/lead/evidence API 强制 user ownership |

## 14. Files and Modules Expected to Change Later

本计划不修改代码。实施阶段预计影响：

### Backend

- `backend/prisma/schema.prisma`
- 新 migration
- `backend/src/providers/search/`
- `backend/src/services/search-task.service.ts`
- 新 `provider-health.service.ts`
- 新 `lead-quality-gate.service.ts`
- SearchTask controllers/routes
- LeadResearch context resolution

### Frontend

- `src/services/api.ts`
- `src/pages/DiscoverPage.tsx`
- Discover 搜索状态与空/失败提示组件
- Customer Card 的 evidence/match 字段映射

### Tests

- Provider health tests
- Search lifecycle integration tests
- Context preservation tests
- Quality Gate tests
- Browser E2E

## 15. Items Not Included in Phase 1

- 不增加第二真实数据源。
- 不开发 Browser Provider。
- 不重做 Discover UI。
- 不开发复杂 CRM。
- 不开发 BI Dashboard。
- 不自动训练模型。
- 不自动修改 Prompt。
- 不扩展计费、会员或团队权限。
- 不删除 Mock Provider；仅隔离到开发、Seed 和测试。

Phase 1 的成功不是“返回更多结果”，而是：

> 用户能够明确知道搜索是否真实成功，并且每个展示的客户都有可验证的公司身份、网站、匹配证据和产品上下文。

