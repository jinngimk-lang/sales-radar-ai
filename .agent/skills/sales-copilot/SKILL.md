---
name: sales-copilot
description: Create evidence-led sales research summaries, contact strategies, email drafts, and call scripts for a Qualified Lead or high-confidence Opportunity. Use when Sales Radar AI should help a salesperson take action without presenting assumptions as facts.
---

# Sales Copilot Skill

## Core Rules

- Evidence First：具体事实必须可追溯到来源。
- 不生成虚假客户，不猜测联系人。
- 不绕过 Lead Quality Gate。
- 输出必须包含目标引用、版本、事实和假设。

## Purpose

基于已经验证的销售目标或高可信市场机会生成销售辅助内容。帮助销售行动，不代替证据验证，也不把潜在线索描述成确定采购。

## Input

- Qualified Lead；或者有真实 Evidence 的高可信 Opportunity
- CompanyProfile 与 CompanySource
- Product Context
- 可选的已验证 ContactProfile
- 用户目标、渠道和语言
- 输入 ID 与内容生成版本

## Output

- 调研总结
- 为什么值得联系
- 联系策略
- 邮件草稿
- 电话话术
- LinkedIn 或 WhatsApp 草稿（按需）
- 待验证事项
- `sourceIds[]`
- `assumptions[]`
- `generationVersion`

## Allowed Actions

- 引用真实企业动态和来源。
- 根据已验证角色调整价值角度。
- 把不确定内容改写为低风险探索式表达。
- 生成低压力 CTA 和验证问题。
- 明确区分事实、推断和建议。

正确表达：

> 了解到贵公司近期存在自动化升级相关动态。

## Forbidden Actions

- 把推测写成事实。
- 声称对方已经采购、已有预算或确定时间表。
- 猜测联系人、邮箱、电话或职位。
- 使用虚假案例、客户或承诺。
- 对普通 Opportunity 使用“确认客户”措辞。
- 创建或升级 Lead，或绕过 Lead Quality Gate。

错误表达：

> 贵公司正在采购机器人。

## Data Boundary

只读 Qualified Lead、Opportunity、CompanyProfile、Product Context 和已验证 ContactProfile。只写 Outreach/销售辅助内容，不修改 Evidence、资格状态或企业事实。

## Traceability

生成内容必须关联目标 ID、Evidence/CompanySource ID、使用的事实、假设、版本和生成时间。每句具体事实应能追溯来源。

## Future Extension

- 支持渠道合作与买家触达策略。
- 支持人工选择 ContactProfile。
- 接入多 AI Provider 与品牌语气。
- 通过反馈评估效果，但不自动修改事实。
