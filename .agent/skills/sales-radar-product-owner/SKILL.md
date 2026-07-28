---
name: sales-radar-product-owner
description: Apply Sales Radar AI product-owner direction, data-trust boundaries, user-experience principles, architecture constraints, and delivery workflow. Use for product planning, frontend or backend development, data modeling, search, MarketSignal, SearchEvidence, Opportunity, Qualified Lead, Dashboard, Discover, Landing, or Sales Copilot changes in the Sales Radar AI project.
---

# Sales Radar AI Product Owner Skill

## Role

你正在协助开发 Sales Radar AI。

你的角色不是单纯代码执行者，而是遵循产品负责人方向完成开发。

所有修改必须符合：

- 产品定位
- 数据真实性原则
- 用户体验原则
- 长期架构规划

---

# 1. Product Positioning

Sales Radar AI 是：

> 销售机会发现平台

不是：

- AI搜索工具
- 普通CRM
- 自动生成客户工具
- 虚假客户数据库

核心价值：

帮助销售人员：

输入产品和目标市场

↓

理解市场变化

↓

发现销售机会

↓

找到值得跟进的销售目标

↓

生成销售行动

---

# 2. Core Product Model

系统必须区分：

## Market Signal

市场信息。

来源：

- 新闻
- 企业公告
- 招聘变化
- 投资信息
- 政策变化

不是客户。

---

## SearchEvidence

搜索得到的真实证据。

必须包含：

- 来源
- URL
- 内容依据

---

## Opportunity

销售机会。

表示：

企业或市场变化可能产生商业价值。

Opportunity:

不是客户。

---

## Qualified Lead

经过验证的销售目标。

必须满足：

- 公司身份验证
- 产品相关性
- 资格规则

Opportunity 不允许自动变成 Lead。

---

# 3. Trust Boundary

必须保护：

- SearchEvidence
- Opportunity
- Qualified Lead
- Lead Quality Gate
- Qualification Version

禁止：

为了增加展示数量：

- 制造客户
- 提升资格
- 修改验证规则
- 绕过质量门槛

真实性优先于数量。

---

# 4. AI Agent Future Architecture

未来支持多 Agent 协作。

## Research Agent

负责：

发现市场信息。

来源：

- Exa
- AgentReach
- Browser
- API

---

## Evidence Agent

负责：

判断：

- 来源真实性
- 公司主体
- 时间有效性

---

## Opportunity Agent

负责：

判断：

市场信息是否形成销售机会。

---

## Sales Agent

负责：

生成：

- 销售策略
- 联系建议
- 邮件
- LinkedIn消息

---

# 5. User Experience Rules

所有文案面向销售用户。

避免：

- AI智能体
- 大模型驱动
- 技术平台

优先：

- 销售机会
- 销售目标
- 企业变化
- 市场机会

---

# 6. Page Positioning

## Landing

目标：

让普通销售理解价值。

核心：

发现更多销售机会。

避免：

- B2B限制
- AI工具表达

Logo定位：

销售机会发现平台

---

## Discover

展示：

销售机会

和：

已确认客户

必须区分：

Opportunity

Qualified Lead

---

## Market Opportunity Center

不是传统Dashboard。

定位：

市场情报浏览器。

未来展示：

- 新闻
- 企业动态
- 投资
- 扩张
- 政策
- 视频
- 网页

禁止：

模拟新闻。

禁止：

虚假数字。

---

# 7. Development Workflow

执行任务时：

1. 理解产品目标
2. 分析影响范围
3. 小范围修改
4. 测试
5. 输出结果

输出格式：

必须包含：

- 修改文件列表
- 修改内容
- TypeScript结果
- Build结果
- 测试结果
- 是否修改backend

---

# 8. Screenshot Rule

不要自动截图。

不要执行浏览器截图。

原因：

节省token。

流程：

代码完成

↓

用户人工浏览

↓

用户提供截图

↓

人工验收

---

# 9. Code Change Rules

优先：

小步修改。

禁止：

为了页面展示：

修改核心数据逻辑。

如果涉及：

- 数据模型
- Lead规则
- 搜索流程

必须先说明影响。

---

# 10. Git Workflow

完成阶段任务后：

检查：

git status

确认：

git add

git commit

git push

保持项目历史清晰。

---

# 11. Long Term Vision

Sales Radar AI 最终目标：

产品输入

↓

Product Intelligence

↓

Market Intelligence

↓

Opportunity Detection

↓

Company Intelligence

↓

Contact Intelligence

↓

Sales Copilot

成为销售人员的市场雷达和销售助手。
