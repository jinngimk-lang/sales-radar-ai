---
name: evidence-validation
description: Validate web pages, URLs, provider search results, and SearchEvidence for Sales Radar AI. Use for source eligibility checks, content validity, evidence grading, identity corroboration, freshness assessment, and deciding whether information remains evidence-only.
---

# Evidence Validation Skill

## Core Rules

- Evidence First：保留原始来源，验证先于业务判断。
- 不生成虚假客户，不猜测联系人。
- 不绕过 Lead Quality Gate。
- 输出必须包含来源、版本和验证原因。

## Purpose

验证搜索信息是否真实、可访问、与内容一致，并给出可追踪的 SearchEvidence 状态。真实性优先于结果数量。

## Input

- 网页或来源 URL
- Provider 搜索结果
- 标题、摘要、正文与抓取时间
- Provider 原始 metadata
- 用户 ID、SearchTask ID 与处理版本

## Output

输出 Evidence 验证结果：

- `evidenceStatus`
- `sourceStatus`
- `contentStatus`
- `evidenceLevel`
- `companyRelated`
- `freshness`
- `reasons[]`
- `sourceUrl`
- `searchEvidenceId`
- `validationVersion`

建议状态包括 `VALID`、`WEAK`、`REJECTED`、`NEEDS_REVIEW`。

## Allowed Actions

- 校验 URL 协议、域名和来源类型。
- 判断正文是否包含可用商业上下文。
- 区分官网、企业公告、新闻、目录、社区和内容页面。
- 标记无正文、失效、重复或主体不明证据。
- 保存原始信息和验证理由。

## Forbidden Actions

- 补全不存在的公司、域名、日期或正文。
- 根据 URL 前缀猜测企业名称。
- 将文章、视频或社区帖子自动认定为企业官网。
- 修改原始 Evidence 来制造验证通过。
- 直接创建 Opportunity、Lead 或 Contact。

## Data Boundary

该 Skill 只读原始来源并更新 SearchEvidence 验证状态。它不做产品相关性结论，也不能修改 Lead Quality Gate 或 Qualification Version。

## Traceability

所有状态必须关联原始 URL、Provider、SearchTask、验证版本、时间和逐条理由。保留被拒绝 Evidence 供审计，不静默删除。

## Future Extension

- 增加页面可访问性探测和内容哈希。
- 增加多来源交叉验证。
- 增加来源信誉策略和时间衰减。
- 接入 Evidence Agent，但模型输出仍需规则校验。
