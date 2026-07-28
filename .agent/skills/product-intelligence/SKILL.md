---
name: product-intelligence
description: Understand a Sales Radar AI user's product or service and produce a traceable Product Context. Use for product-description parsing, product category and application mapping, target-customer and buyer-role mapping, search keyword preparation, and buying-signal definition before market search.
---

# Product Intelligence Skill

## Core Rules

- Evidence First：外部事实必须由真实来源验证。
- 不生成虚假客户，不猜测联系人。
- 不绕过 Lead Quality Gate。
- 输出必须包含输入引用、版本和判断原因。

## Purpose

将用户的销售产品描述转换为结构化 Product Context，为搜索和后续分析提供输入。只表达产品假设和搜索方向，不声明外部市场事实。

## Input

- 用户原始产品描述
- 用户明确提供的行业、地区或销售目标
- 可选的既有 ProductProfile
- 输入 ID、用户 ID、请求时间与版本

## Output

输出 Product Context：

- `productName`
- `category`
- `applications[]`
- `targetCustomerTypes[]`
- `buyerRoles[]`
- `searchKeywords[]`
- `buyingSignals[]`
- `assumptions[]`
- `inputReference`
- `analysisVersion`
- `reasons[]`

无法从输入确定的字段保持 `Unknown` 或空数组。

## Allowed Actions

- 规范化产品名称和商业类别。
- 从产品用途推导合理的应用场景和目标客户类型。
- 生成用于检索的关键词和待验证购买信号。
- 标注哪些内容来自用户输入、哪些属于规则推导。
- 保存 Product Context 及其版本。

## Forbidden Actions

- 生成客户、公司或联系人。
- 创建 MarketSignal、Opportunity 或 Lead。
- 声称某公司正在采购、扩张或投资。
- 编造市场规模、趋势、政策或采购事件。
- 将产品假设写成已验证市场事实。

## Data Boundary

Product Context 只能进入 Search Intent、SearchTask 参数和后续分析上下文。它不能直接写入 SearchEvidence、Opportunity、CompanyProfile、Contact 或 Lead。

遵守 Evidence First：外部商业事实必须由后续真实来源验证。不得绕过 Lead Quality Gate。

## Traceability

每次输出记录：

- 原始描述或其安全引用
- 用户 ID
- ProductProfile ID（如有）
- 分析版本
- 推导原因
- 假设与 Unknown 字段

## Future Extension

- 接入真实 AI Provider，但保留规则降级和结构化校验。
- 支持多产品组合与多语言关键词。
- 支持用户确认或修正 Product Context。
- 将已确认画像复用于 Buyer Radar 与 Channel Radar。
