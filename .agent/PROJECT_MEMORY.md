# Sales Radar AI Project Memory

更新时间：

2026

---

# 当前产品定位

Sales Radar AI

定位：

销售机会发现平台

核心：

从市场变化中发现销售机会。

不是：

客户数据库。

---

# 已完成阶段

## Search Truth

目标：

解决搜索结果真实性问题。

完成：

- SearchEvidence Pipeline
- Provider验证
- 公司身份识别

---

## Qualification v2

目标：

避免虚假客户。

完成：

- qualificationVersion
- Lead Quality Gate
- Assistant Trust Boundary

---

## Opportunity MVP

目标：

区分：

市场机会

和：

确认客户。

完成：

Opportunity模型。

OpportunityEvidence。

Opportunity Detection。

规则：

Opportunity ≠ Lead

---

## 产品定位优化

完成：

首页：

发现更多销售机会

Logo：

销售机会发现平台

Dashboard：

市场机会中心

---

# 当前开发方向

## Market Intelligence Layer

目标：

让系统拥有真实市场信息流。

来源：

- Exa
- AgentReach
- Browser
- API

数据流程：

Market Signal

↓

AI分析

↓

Opportunity

↓

Lead

---

# 长期规划

## Phase 1

市场情报来源层。

## Phase 2

多Agent分析。

包括：

Research Agent

Evidence Agent

Opportunity Agent

Sales Agent

## Phase 3

Product Intelligence。

用户只输入产品。

系统理解：

行业

客户类型

应用场景

搜索方向。

## Phase 4

Sales Copilot。

生成：

客户分析

联系策略

销售话术

---

# 开发合作方式

流程：

1. 产品方向确认
2. 生成Codex Prompt
3. Codex修改代码
4. 输出修改结果
5. 用户人工截图验收
6. 继续优化

---

# 验收原则

重点检查：

- 产品表达
- 用户体验
- 数据真实性
- 页面逻辑

不要为了数量牺牲可信度。

---

# 当前保护边界

禁止随意修改：

- Lead Quality Gate
- Qualification Version
- SearchEvidence
- Opportunity与Lead关系
- Assistant Trust Boundary

---

# Sales Radar Agent OS 架构规划

## 目标

建立可编排、可评估、可追踪的销售机会 Agent 系统。

## Current Agent OS Layers

1. Product Intelligence
2. Market Intelligence
3. Evidence Validation
4. Opportunity Analysis
5. Company Intelligence
6. Research Trace
7. Contact Intelligence
8. Sales Action Planning

## Core Boundary

AI assists research.

AI does not create customer truth.

## Truth Hierarchy

```text
Source
  ↓
Evidence
  ↓
Fact
  ↓
Assessment
  ↓
Recommendation
```

CRM entities require human confirmation and quality gates.

所有 Agent 共同遵守：

- Evidence First
- 不生成虚假客户
- 不猜测联系人
- 不绕过 Lead Quality Gate
- 输出必须关联输入、来源、原因和版本

## 当前 Agent

### Product Intelligence

将用户产品描述转换为 Product Context。

边界：

不生成客户、市场事实或 Opportunity。

### Market Intelligence

从真实 SearchEvidence 识别 MarketSignal。

边界：

MarketSignal 不是客户，也不是采购确认。

### Evidence Validation

校验来源、内容有效性和 Evidence 等级。

边界：

不补全不存在的信息。

### Company Intelligence

从 Opportunity、SearchEvidence 和 Product Context 建立 CompanyProfile。

边界：

不创建 Lead、Contact，不猜测负责人或联系方式。

### Opportunity Analysis

根据真实 Evidence 和 Product Context 判断销售机会。

边界：

Opportunity 不自动转换为 Qualified Lead。

### Sales Copilot

根据 Qualified Lead 或高可信 Opportunity 生成销售辅助内容。

边界：

必须区分事实、推断和建议。

## Agent OS 支撑能力

### Supervisor Agent

负责：

- 任务分配
- 权限控制
- ID传递
- 状态管理
- 版本记录

Supervisor 不进行商业判断。

### Agent Evaluation

使用 `sales-radar-evals` 验证：

- 产品理解
- 搜索方向
- Opportunity判断
- 真实性边界
- 输出可追踪性

每次 Agent 修改必须运行 Evaluation。

### Agent Trace

记录：

- 输入与输出 ID
- Agent和分析版本
- 判断原因
- 来源
- 状态与错误

目标：

让用户理解为什么发现某个销售机会。

## 目标数据流

```text
Product Intelligence
        ↓
Research / Search
        ↓
Evidence Validation
        ↓
Market Intelligence
        ↓
Opportunity Analysis
        ↓
Company Intelligence
        ↓
Lead Quality Gate
        ↓
Sales Copilot
```

说明：

CompanyProfile、MarketSignal 和 Opportunity 都不能绕过 Lead Quality Gate。

## 未来 Agent

### Contact Intelligence

只从可验证来源发现联系人。没有来源时返回 Unknown。

### Supervisor Agent

从基础编排升级为可配置的多 Agent 工作流控制器。

### Agent Marketplace

允许注册新的数据源和 Agent 能力。

要求：

- 明确输入输出
- 最小权限
- 版本管理
- Evaluation通过
- Trace完整

---

# 2026-08-25 双边机会工作台方向

长期产品方向升级为“证据优先的双边机会市场 + 销售操作工作台”。参考成熟招聘/撮合产品的交互机制，但不复制其品牌视觉、素材或专有表达。

商业目标必须支持并真实影响检索意图：

- FIND_BUYERS：找买家 / 采购侧机会
- FIND_SUPPLIERS：找供应商 / 供给侧机会
- FIND_PARTNERS：找合作伙伴
- FIND_DISTRIBUTORS：找渠道 / 经销商
- RESEARCH_COMPETITORS：研究竞品
- EXPLORE_MARKET：探索市场

目标体验链路：

```text
商业目标
  ↓
推荐 / 市场雷达
  ↓
主动搜索
  ↓
证据与判断
  ↓
公开联系人研究
  ↓
明确用户控制的沟通动作
  ↓
可验证回复 / 会议 / 结果
  ↓
收益证据
```

新增永久约束：

- 预测意向不能显示为真实互动。
- 生成的沟通内容不能显示为已发送。
- 打开外部渠道不能显示为已发送。
- Communication / Intent / Interaction 页面只有在有真实持久状态后才能上线，禁止用演示数据伪装业务闭环。
- Search 是一等工作区；市场雷达负责推荐和判断，主动搜索负责用户主动探索，两者共享商业目标上下文。
- Crawl4AI、LiveKit、社交来源、浏览器代理均属于可替换的增强层，不能成为新的“真相系统”。
- 每次引入新的开源子系统前检查项目身份、维护活跃度、发布日期与许可证；Apache-2.0 / MIT / BSD 优先。只在能解决具体已验证问题时集成最小必要部分。

长期方向与上下文恢复以根目录 `PROJECT_BLUEPRINT.md` 为准；如果验证出更好的方向，必须同步更新该文件。
