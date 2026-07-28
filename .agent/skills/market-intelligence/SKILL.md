---
name: market-intelligence
description: Convert real SearchEvidence into traceable Sales Radar AI MarketSignals. Use when classifying sourced company investment, factory expansion, digital transformation, policy change, hiring change, or industry trend information without turning it into a customer or confirmed purchase.
---

# Market Intelligence Skill

## Core Rules

- Evidence First：没有真实来源不生成 MarketSignal。
- 不生成虚假客户，不猜测联系人。
- 不绕过 Lead Quality Gate。
- 输出必须包含 Evidence、版本和判断原因。

## Purpose

从真实 SearchEvidence 中识别市场变化并保存 MarketSignal。MarketSignal 是市场信息，不是客户，也不是销售机会的最终判断。

## Input

- SearchEvidence ID
- 来源 URL、标题、正文、时间与 Provider
- Product Context（仅用于关注方向）
- 用户 ID 与处理版本

## Output

输出 MarketSignal：

- `signalType`
- `title`
- `summary`
- `companyName`（有明确来源时）
- `country` / `region`
- `confidence`
- `detectedAt`
- `searchEvidenceId`
- `sourceUrl`
- `reasons[]`
- `analysisVersion`

支持类型：

- 企业投资
- 工厂扩张
- 数字化升级
- 政策变化
- 招聘变化
- 行业趋势

## Allowed Actions

- 从有 URL 和正文的 Evidence 识别市场变化。
- 区分企业事件、政策和行业趋势。
- 保存来源引用、时间和判断原因。
- 对不确定主体保留空值或 `Unknown`。
- 将低置信信息保留为待验证 MarketSignal。

## Forbidden Actions

- 自动创建 Lead、Contact 或 Qualified Lead。
- 把新闻、招聘或投资公告描述成采购确认。
- 从标题补全不存在的企业身份。
- 创建没有真实来源的 MarketSignal。
- 因为结果不足而生成模拟新闻或公司。

## Data Boundary

允许的数据流：

`SearchEvidence → MarketSignal`

MarketSignal 只能作为 Opportunity Analysis 的输入之一，不能直接进入 Lead Repository 或绕过 Lead Quality Gate。

## Traceability

每条 MarketSignal 必须保留 Evidence ID、来源 URL、抓取时间、判断版本、信号理由和置信度。无法追踪来源时不保存。

## Future Extension

- 增加 RSS、企业公告、新闻 API 与 Browser Adapter。
- 增加时效性和重复事件合并。
- 由 Evidence Validation Skill 提供来源等级。
- 支持持续监控，但不得自动升级为 Lead。
