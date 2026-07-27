# Sales Radar AI Search Truth Phase 1.1 实施报告

## 1. 实施结论

Phase 1.1 已完成。当前搜索链路建立了三个明确的真值边界：

1. 搜索任务创建前验证 AgentReach Runtime 与 Exa MCP。
2. 本次搜索结果只由 `SearchTaskLead` 归属关系提供。
3. Provider 不可用或任务失败时，本次结果为零，不再以历史 Lead 伪装成功。

本阶段没有加入新 Provider，没有启用 Mock fallback，也没有重构 SearchTask 的核心执行链。

## 2. 修改文件

### Backend

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260727070217_search_truth_phase_1_1/migration.sql`
- `backend/src/services/provider-health.service.ts`
- `backend/src/services/search-task.service.ts`
- `backend/src/controllers/search.controller.ts`
- `backend/src/controllers/search-task.controller.ts`
- `backend/src/routes/search.routes.ts`
- `backend/src/routes/search-task.routes.ts`
- `backend/src/utils/app-error.ts`
- `backend/src/middleware/error-handler.ts`
- `backend/tests/provider-health.test.ts`
- `backend/tests/search-truth.test.ts`

### Frontend

- `src/services/api.ts`
- `src/pages/DiscoverPage.tsx`
- `src/types/index.ts`

### Documentation

- `docs/SEARCH_TRUTH_PHASE1_1_IMPLEMENTATION_REPORT.md`

## 3. Provider Health Gate

新增 `ProviderHealthService`，通过 `mcporter list --json` 检查 AgentReach Runtime 以及名为 `exa` 的 MCP Server。

健康状态：

- `AVAILABLE`：Exa 已配置并处于健康状态。
- `DEGRADED`：Exa 已配置，但状态不是 healthy/connected/ready。
- `UNAVAILABLE`：mcporter 不存在、健康检查失败，或 Exa 未配置。

新增接口：

```http
GET /api/search/providers/health
```

搜索任务创建前执行健康门禁。非 `AVAILABLE` 状态返回：

```json
{
  "error": {
    "code": "SEARCH_PROVIDER_UNAVAILABLE",
    "message": "Exa MCP is not configured in mcporter.",
    "provider": "agent-reach",
    "dependency": "exa",
    "providerState": "UNAVAILABLE",
    "healthCode": "EXA_NOT_CONFIGURED",
    "retryable": true
  }
}
```

HTTP 状态为 `503`。此路径不会创建 SearchTask，不会调用 Mock Provider，也不会生成假结果。

## 4. SearchTask Result Ownership

新增 `SearchTaskLead` 归属表：

- `searchTaskId`
- `leadId`
- `rankScore`
- `matchReason`
- `matchEvidence`
- `createdAt`

约束：

- `(searchTaskId, leadId)` 唯一。
- 删除 SearchTask 或 Lead 时级联删除归属记录。
- 同一真实 Lead 被后续任务再次发现时，不重复创建 Lead，但会建立新的任务归属。

新增接口：

```http
GET /api/search-task/:id/results
```

接口只返回当前用户、指定 SearchTask 明确关联的 Lead。它不会执行关键词模糊查询，也不会读取未关联的历史 Lead。

任务状态为 `FAILED` 或 `CANCELLED` 时，接口固定返回空数组。

## 5. Frontend Search Truth

Discover 搜索已停止使用：

```http
GET /api/leads?keyword=...
```

当前调用链为：

```text
POST /api/search-task
  -> GET /api/search-task/:id
  -> GET /api/search-task/:id/results
```

行为变化：

- 开始新搜索时立即清空上一轮当前结果。
- Provider 门禁失败或 SearchTask 失败时保持零结果。
- 页面显示真实失败原因。
- 不再缓存“相同关键词已成功”，每次执行都拥有独立 SearchTask。
- 无搜索关键词时不自动把历史 Lead 当作当前结果。

历史 Lead API 仍然保留，但不再被 Discover 当前搜索链路消费。

## 6. Product Context 准备

本阶段没有实现完整 `ProductContextSnapshot`，仅预留了向后兼容的接口：

```ts
interface SearchProductContext {
  product?: string
  industry?: string
  region?: string
  customerType?: string
}
```

前端可以在创建任务时传递 `productContext`，后端暂存于现有 `SearchTask.parameters.productContext`。没有新增产品上下文数据库模型，也没有改变 SearchTask 执行策略。

## 7. 测试与验证

### Database

- Prisma schema validation：通过。
- Migration `20260727070217_search_truth_phase_1_1`：创建并成功应用。
- PostgreSQL schema：已同步。

### Backend

- TypeScript typecheck：通过。
- Backend build：通过。
- 全量测试：`113 passed / 0 failed`。

新增测试覆盖：

- AgentReach / Exa 可用状态。
- Exa 不可用时返回结构化阻断错误。
- mcporter 缺失。
- failed SearchTask 返回零结果。
- 未归属的历史 Lead 不出现在当前搜索。
- 不同用户之间的 SearchTask 结果隔离。

### Frontend

- TypeScript project build：通过。
- Vite production build：通过。
- 当前项目未配置前端单元测试 runner，因此没有可执行的 frontend test script；搜索真值契约已由后端集成测试覆盖，前端通过类型检查和生产构建验证。

### Runtime truth check

检查时的实际环境结果：

```json
{
  "provider": "agent-reach",
  "dependency": "exa",
  "state": "UNAVAILABLE",
  "code": "EXA_NOT_CONFIGURED"
}
```

当前 `mcporter list --json` 只发现离线的 `node_repl`，没有 Exa。实际创建搜索任务返回结构化 `503 SEARCH_PROVIDER_UNAVAILABLE`，没有产生 SearchTask 或假 Lead。

## 8. Remaining Phase 1 Items

Phase 1.1 之后仍需处理：

1. 恢复并验证 Exa MCP 的运行时配置，使健康状态达到 `AVAILABLE`。
2. 实现完整、不可变的 `ProductContextSnapshot`，贯穿 SearchTask、Lead 与 LeadResearch。
3. 建立 Lead Quality Gate，将销售候选与仅供参考的 evidence 分层。
4. 为 SearchTask 增加更明确的前端生命周期展示：running、empty、failed、success。
5. 增加显式的历史 Lead 浏览入口，继续保持与当前搜索结果分离。
6. 在 Provider 恢复后执行一次真实端到端搜索验收，核对结果归属、去重和证据字段。

## 9. 风险说明

- Provider 健康门禁依赖 mcporter 暴露的 Server 状态；不同 mcporter 版本的输出已兼容 JSON 与文本格式，但升级运行时后仍需回归。
- 旧 SearchTask 没有历史 `SearchTaskLead` 记录，因此新结果接口不会重建或猜测旧任务归属；这是保守且可信的行为。
- 当前仍使用 Demo User 解析用户身份。结果查询已经按用户隔离，但正式认证接入后需要把 resolver 替换为真实认证上下文。
