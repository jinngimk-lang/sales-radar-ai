---
name: agent-trace
description: Record traceable Sales Radar AI agent executions. Use when an agent run must preserve input references, output references, agent and analysis versions, decision reasons, source evidence, state changes, errors, and user-visible explanations of why an opportunity was found.
---

# Agent Trace Skill

## Core Rules

- Evidence First：Trace 必须引用实际来源实体。
- 不生成虚假客户，不猜测联系人。
- 不绕过 Lead Quality Gate。
- 输出必须记录输入、输出、版本、原因和来源。

## Purpose

记录 Agent 执行过程，让系统和用户能够回答：“为什么发现这个机会，以及依据是什么？”

## Input

- `workflowId` 与 `traceId`
- 用户 ID
- Agent 名称和版本
- 输入实体 ID
- 来源 Evidence/URL
- 执行状态、时间和错误
- 输出实体 ID 与判断原因

## Output

输出 Agent Trace：

- `traceId`
- `workflowId`
- `agentName`
- `agentVersion`
- `inputReferences[]`
- `outputReferences[]`
- `sourceReferences[]`
- `reasons[]`
- `status`
- `startedAt`
- `completedAt`
- `errorCode`

## Allowed Actions

- 记录实体 ID、版本、状态与来源引用。
- 记录结构化判断原因和置信度。
- 记录 Agent 间 ID 传递和状态变化。
- 对用户展示不含技术噪音的来源与原因。
- 对失败保留错误代码和可审计状态。

## Forbidden Actions

- 在 Trace 中补写不存在的来源或判断。
- 保存 API Key、密码或完整敏感 Prompt。
- 通过 Trace 修改业务实体或资格状态。
- 把失败记录成成功。
- 保存无必要的个人隐私数据。
- 删除用于掩盖错误的追踪记录。

## Data Boundary

Trace 是审计记录，不是业务事实来源。它只能引用 Product Context、SearchEvidence、MarketSignal、Opportunity、CompanyProfile、Lead 等实体，不能替代这些实体或绕过 Lead Quality Gate。

## Traceability

每个 Agent 输出至少关联：

- 输入 ID
- 输出 ID
- Agent/分析版本
- 判断原因
- Evidence 或 CompanySource ID
- 执行状态和时间

缺少来源时必须记录 `SOURCE_MISSING`，不能生成替代来源。

## Future Extension

- 增加用户可读的“发现原因”时间线。
- 增加跨 Agent lineage 查询。
- 增加成本、延迟和质量评估关联。
- 支持合规保留策略与敏感字段脱敏。
