---
name: opportunity-analysis
description: Assess real SearchEvidence against Product Context and create traceable Sales Radar AI Opportunities. Use for company expansion, investment, digital upgrade, policy, hiring, or market-change analysis while keeping Opportunity separate from Qualified Lead.
---

# Opportunity Analysis Skill

## Core Rules

- Evidence First：Opportunity 必须关联真实 Evidence。
- 不生成虚假客户，不猜测联系人。
- 不绕过 Lead Quality Gate。
- 输出必须包含 Evidence、版本、评分和原因。

## Purpose

判断真实市场信息是否可能形成销售机会，并解释为什么值得关注。Opportunity 表示可研究的商业变化，不表示客户或采购确认。

## Input

- 已保存的 SearchEvidence
- ProductContextSnapshot
- Evidence Validation 结果
- 可选 MarketSignal
- 用户 ID、SearchTask ID 与检测版本

## Output

输出 Opportunity：

- `opportunityType`
- `summary`
- `whyItMatters`
- `recommendedNextStep`
- `productRelevanceScore`
- `evidenceConfidence`
- `commercialImpactScore`
- `timelinessScore`
- `actionabilityScore`
- `confidence`
- `evidenceIds[]`
- `reasons[]`
- `detectionVersion`

## Allowed Actions

- 识别企业投资、扩张、数字化升级等事件。
- 根据 Product Context 评估销售相关性。
- 计算并解释五个评分维度。
- 在信息不足时返回无机会或待验证。
- 保存 OpportunityEvidence 和检测版本。

## Forbidden Actions

- 将 Opportunity 自动转换为 Lead。
- 声称采购、预算、负责人或项目阶段已经确认。
- 使用无来源信息提高评分。
- 修改 SearchEvidence 使其满足条件。
- 绕过 Lead Quality Gate 或 Qualification Version。

## Data Boundary

允许的数据流：

`SearchEvidence + ProductContext (+ MarketSignal) → Opportunity`

Opportunity 与 Qualified Lead 永久分离。只有现有质量链路可以决定是否形成销售目标。

## Traceability

每个 Opportunity 必须保存 Evidence ID、真实 URL、Product Context 快照、评分明细、判断原因、版本和生成时间。

## Future Extension

- 支持政策、招聘和行业趋势的专用评分策略。
- 增加时间衰减与多来源佐证。
- 接入 Opportunity Agent 和人工反馈。
- 支持 Opportunity 聚类，但不自动创建客户。
