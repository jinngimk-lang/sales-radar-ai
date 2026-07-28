---
name: company-intelligence
description: Build and update traceable Sales Radar AI CompanyProfiles from an owned Opportunity, real SearchEvidence, and Product Context. Use for verified company identity, official website, business understanding, product relevance, and sales research hints without creating leads or contacts.
---

# Company Intelligence Skill

## Core Rules

- Evidence First：企业事实必须来自 CompanySource。
- 不生成虚假客户，不猜测联系人。
- 不绕过 Lead Quality Gate。
- 输出必须包含来源、版本和判断原因。

## Purpose

把 Opportunity 与真实 SearchEvidence 中的企业主体转换为结构化 CompanyProfile，帮助销售理解企业及其与产品方向的关系。

## Input

- 当前用户拥有的 Opportunity
- 与 Opportunity 明确关联的 SearchEvidence
- ProductContextSnapshot
- 可选的既有 CompanyProfile
- 输入 ID、来源 ID 与分析版本

## Output

输出 CompanyProfile 领域数据：

- 企业身份与身份状态
- 官方网站和规范化域名
- 行业与企业类型（有来源时）
- 业务理解
- 产品匹配分析
- 研究建议
- CompanySource 列表
- CompanyIntelligenceSnapshot
- `analysisVersion`
- `confidence`
- `reasons[]`

未知信息保持 `Unknown`、`null` 或空数组。

## Allowed Actions

- 校验 Opportunity、Evidence 与用户归属。
- 复用经过验证的企业身份提取规则。
- 从官网和可信 Evidence 保存企业事实。
- 保存不可变历史 Snapshot 和来源引用。
- 给出明确标注为建议的研究方向与验证问题。

## Forbidden Actions

- 创建 Lead、Qualified Lead 或 Contact。
- 猜测负责人、职位、邮箱、电话或社交主页。
- 猜测公司规模、预算或采购时间。
- 将 Opportunity 描述成已确认采购。
- 使用无来源信息补齐 CompanyProfile。
- 注入 Lead Repository 或绕过 Lead Quality Gate。

## Data Boundary

允许的数据流：

`Opportunity + SearchEvidence + ProductContext → CompanyProfile`

CompanyProfile 只能增强企业理解。它不能单独生成 Lead；进入 Qualified Lead 仍必须结合 Evidence、产品相关性和现有 Lead Quality Gate。

## Traceability

每个事实保存 CompanySource。每个 Snapshot 保存 Evidence ID、Opportunity ID、Product Context、分析版本、Provider、置信度和判断原因。

## Future Extension

- 加入官网研究 Adapter 与多来源合并。
- 通过 AIProvider 增强业务理解，但输出必须安全解析。
- 增加用户复核和版本比较。
- 为 Contact Intelligence 提供企业与建议部门，不提供虚构联系人。
