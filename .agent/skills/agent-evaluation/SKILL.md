---
name: agent-evaluation
description: Run the Sales Radar AI sales-radar-evals quality suite whenever an agent, prompt, provider, extraction rule, scoring rule, or orchestration policy changes. Use to verify product understanding, search direction, opportunity decisions, traceability, and trust-boundary compliance.
---

# Agent Evaluation Skill

## Core Rules

- Evidence First：评估必须检查来源关联。
- 不接受虚假客户或联系人猜测。
- 不允许绕过 Lead Quality Gate。
- 评估输出必须关联案例、版本和失败原因。

## Purpose

建立 `sales-radar-evals` 质量测试体系。每次 Agent 行为、Prompt、Provider 或规则修改后必须运行 Evaluation，防止真实性与业务边界回归。

## Input

- Agent 名称和版本
- 变更内容
- 固定评估案例
- 实际结构化输出
- 预期边界与允许状态

## Output

- `evaluationRunId`
- `agentVersion`
- `caseResults[]`
- `boundaryViolations[]`
- `traceabilityFailures[]`
- `passRate`
- `status`
- `evaluatedAt`

状态必须清晰返回 `PASS`、`FAIL` 或 `NEEDS_REVIEW`。

## sales-radar-evals

至少覆盖以下产品案例：

1. 工业机器人
2. 包装机械
3. 新能源电池设备
4. CRM SaaS

每个案例验证：

- 产品理解是否保留真实产品含义。
- 搜索方向是否匹配目标客户或渠道。
- Opportunity 判断是否引用真实 Evidence。
- 新闻是否被错误描述为采购。
- 是否生成虚假公司或联系人。
- 是否绕过 Lead Quality Gate。
- 输出是否包含来源、原因和版本。

## Allowed Actions

- 使用确定性 fixture、已脱敏真实样例或模拟 Provider 响应测试代码行为。
- 比较结构化输出和明确断言。
- 运行单元、集成、回归和边界测试。
- 对小样本或模糊结论要求人工复核。
- 阻止未通过关键边界测试的 Agent 发布。

## Forbidden Actions

- 把测试 fixture 写入生产数据。
- 为通过测试降低真实性标准。
- 忽略虚假客户、联系人猜测或来源缺失。
- 用总通过率掩盖 P0 边界失败。
- 自动修改 Prompt 或业务规则。

## Data Boundary

Evaluation 只读 Agent 输出和测试数据，只写评估结果。不得写生产 MarketSignal、Opportunity、CompanyProfile、Lead 或 Contact。

## Traceability

保留案例 ID、输入版本、Agent 版本、预期结果、实际结果、失败原因和运行时间。任何关键边界失败都必须可复现。

## Future Extension

- 增加真实搜索回放和 Provider 合约测试。
- 增加中英文、多行业和地区案例。
- 建立版本基线与质量趋势。
- 接入 CI，Agent 变更必须通过 `sales-radar-evals`。
