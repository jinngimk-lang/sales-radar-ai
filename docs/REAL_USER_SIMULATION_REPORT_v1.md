# Sales Radar AI — Real User Simulation & Search Validation v1

审计日期：2026-07-27  
测试角色：B2B SaaS Sales Representative  
销售产品：Industrial automation SaaS  
目标市场：Manufacturing companies in Europe  
测试输入：`industrial automation SaaS manufacturing companies Europe`

## 1. Executive Summary

### 结论

当前 Sales Radar AI **尚不能可靠完成“在 3 分钟内找到值得联系的真实客户”**。

产品的完整界面路径已经存在：

```text
描述产品
→ Product Understanding
→ Search Intent
→ SearchTask
→ Lead
→ Lead Research
→ Sales Recommendation
→ Outcome
```

但真实用户测试在最关键的 Search Provider 阶段失败。更严重的是，前端没有清空旧结果或显示明确失败，而是继续展示 129 条历史 Lead，并将它们标记为当前搜索的结果。销售人员会误以为真实搜索成功。

下游 Research 与 Outcome 可以操作，但本次研究结果出现明显矛盾：

- AI匹配评分：`0/100`
- 购买可能性：`High`
- Sales Intelligence Priority：`A`
- 推荐销售角度：`Unknown`
- 数据来源：美国包装设备供应商，不是欧洲工业自动化 SaaS 买家

系统还把企业自己的“我们提供采购方法与自动化设备方案”误判成该企业正在采购，并生成“Active procurement process”“Time-sensitive requirement”等未经证据支持的购买信号。

### Production Readiness Score

**32 / 100 — Not ready for real sales users**

| 维度 | 得分 | 满分 | 结论 |
|---|---:|---:|---|
| Core mission workflow | 8 | 15 | 页面链路存在，但产品上下文没有可靠贯穿 |
| Real search availability | 0 | 25 | 当前 Exa MCP 不可用 |
| Lead data quality | 5 | 20 | 大量缺失公司/域名、重复和内容页误判 |
| Sales intelligence quality | 6 | 15 | 研究可生成，但存在互相冲突与伪购买信号 |
| User experience | 5 | 10 | 搜索失败被旧结果掩盖 |
| Reliability and transparency | 3 | 10 | 失败不透明、测试全绿不能代表真实 Provider 可用 |
| Outcome / learning signal | 5 | 5 | Outcome 可以持久保存 |

### Core Mission 验证

| 用户目标 | 当前支持程度 | 说明 |
|---|---|---|
| 1. 描述销售产品 | Partial | Product Understanding 能识别 SaaS，但与 Search Intent 的解释冲突 |
| 2. 自动发现潜在客户 | Failed | 当前 AgentReach → Exa 调用失败 |
| 3. 理解客户为什么匹配 | Failed | 旧 Lead 被错误关联到新搜索；研究结论矛盾 |
| 4. 决定优先联系谁 | Failed | 0 分 Lead 同时被标为 High、Priority A、立即联系 |
| 5. 从销售结果学习 | Partial | Outcome 能保存；输入数据质量不足会污染 Learning |

## 2. Test Scenario and Execution

### 2.1 测试人物

- Role：B2B SaaS Sales Representative
- Product：面向制造企业的工业自动化 SaaS
- Market：欧洲制造业
- User expectation：输入一句产品与市场描述后，获得可验证的欧洲制造企业、匹配原因和第一销售切入点

### 2.2 实际执行步骤

1. 打开 `/app/discover`。
2. 输入：

   ```text
   industrial automation SaaS manufacturing companies Europe
   ```

3. 检查 Product Understanding 和 Search Intent。
4. 等待 SearchTask。
5. 检查 Provider、任务状态及数据库。
6. 打开页面当前第一条 Lead：Shorr Packaging。
7. 点击“AI研究客户”。
8. 检查匹配评分、购买可能性、推荐销售角度与证据。
9. 将 Outcome 更新为“不匹配”，备注：

   ```text
   QA simulation: off-target for Europe industrial automation SaaS search
   ```

### 2.3 本轮产生的测试数据

本轮没有修改应用代码，但按照真实用户流程产生了三条 Demo 数据记录：

| 类型 | ID | 结果 |
|---|---|---|
| SearchTask | `cms2ukbph000ctsj05ccks3dq` | FAILED / INVALID_RESPONSE |
| LeadResearch | `cms2unqtl000jtsj09fox5bep` | 为现有 Shorr Lead 生成 |
| LeadOutcome | `cms2uo8fx000mtsj0egndemby` | LOST / 不匹配 |

## 3. End-to-End Flow Audit

## 3.1 Product Understanding

请求：

```text
industrial automation SaaS manufacturing companies Europe
```

返回的主要判断：

- Product：`SaaS Software`
- Category：`Business Software`
- Industry：`Software`
- Buyer roles：Operations、IT、Department Head、Procurement
- Recommended countries：United States、United Kingdom、Germany、Singapore、Australia
- Recommended platforms：Google、LinkedIn、Software directories、Technology communities

优点：

- 能识别用户销售的是 SaaS，而不是纯工业设备。
- 能给出 SaaS 决策角色、应用场景与平台建议。

问题：

- “欧洲”被展开成包含美国、新加坡、澳大利亚的默认国家列表，目标市场约束不够严格。
- Product Understanding 仅作为提示，没有形成可追踪、自动绑定到 LeadResearch 的 ProductProfile。

## 3.2 Search Intent

同一个输入被解释为：

- Product：`industrial automation equipment`
- Industry：`Industrial Automation`
- Region：`Unknown`
- Country：`Unknown`
- TargetType：`buyer`
- Executed keyword：`industrial automation equipment procurement buyers`

问题：

1. Product Understanding 认为是 SaaS，Search Intent 认为是工业设备。
2. 输入明确包含 Europe，Region 仍为 Unknown。
3. 搜索策略丢失了“SaaS”和“欧洲制造公司”两个关键约束。
4. 系统把用户意图扩展为泛化的 `procurement buyers`，容易召回采购内容、媒体和教育视频，而不是目标公司。

这意味着核心搜索在 Provider 调用之前已经发生语义漂移。

## 3.3 SearchTask

创建的任务：

```json
{
  "keyword": "industrial automation equipment procurement buyers",
  "provider": "agent-reach",
  "regions": [],
  "status": "FAILED",
  "resultCount": 0,
  "retryCount": 1,
  "errorCode": "INVALID_RESPONSE"
}
```

确认：

- 任务确实使用 `agent-reach`，没有静默切换 Mock Provider。
- 失败状态和错误信息正确写入数据库。
- Europe 没有进入任务 regions。

## 3.4 AgentReach / mcporter / Exa

### 环境体检

`agent-reach doctor --json` 无法执行：

```text
agent-reach is not recognized
```

`mcporter list` 返回：

```text
1 server:
- node_repl (offline)
0 healthy
```

没有 `exa` server。

### 项目真实测试

执行：

```powershell
npm run test:agent-reach -- "industrial automation SaaS manufacturing companies Europe"
```

失败：

```text
ProviderError: Agent Reach search failed
[mcporter] Unknown MCP server 'exa'
```

### Exact root cause

当前 `AGENT_REACH_MCPORTER_PATH` 能找到 `mcporter.cmd`，Windows 可执行文件问题已经解决；失败点是：

> 当前用户的 mcporter 配置没有注册 Exa MCP server。

因此 `exa.web_search_exa(...)` 不存在。

这不是 Parser、LeadExtractor、Prisma 或前端代理问题。

## 3.5 Frontend failure handling

这是本轮最严重的产品问题。

真实 SearchTask 失败后，Discover 页面仍显示：

```text
找到 129 个潜在客户
关键词「industrial automation SaaS manufacturing companies Europe」
```

页面继续展示旧数据库中的 Shorr Packaging、Mock Buyer 和其他历史 Lead。浏览器 Console 中可以看到 Provider error，但普通用户看不到明确错误。

结果：

- 失败被表现成成功。
- 历史 Lead 被错误归因给当前查询。
- 销售人员无法区分“本次搜索结果”和“全部历史 Lead”。
- 产品最重要的信任承诺被破坏。

## 3.6 Lead Extraction / Normalization / Ranking

当前数据库：

| 指标 | 数量 |
|---|---:|
| Lead 总数 | 129 |
| AgentReach Lead | 118 |
| Mock Lead | 11 |
| AgentReach 缺失 company | 67 |
| AgentReach 缺失可识别 company domain / website | 112 |
| AgentReach 重复 source URL 分组 | 9 |
| 位于重复 source URL 分组中的 Lead | 38 |
| AgentReach Europe Lead | 0 |
| 同时具备 Company + Website + Evidence + Match reason + Action | 2 |
| 再具备有效 Research sales angle | 0 |

只有 **2 / 118** 条 AgentReach Lead 满足最基本的销售结果字段要求；没有一条同时具备有效的研究销售角度。

### 重复和碎片证据

同一个 LinkedIn URL：

```text
https://www.linkedin.com/company/shorr-packaging
```

生成 5 条 Lead：

- `Shorr Packaging Corp. Shorr Packaging Corp`
- `Shorr Packaging Corp`
- `Shorr Packaging Corp. Shorr Packaging Corp. is a Packaging`
- `more. Shorr Packaging Corp. employs 420 people`
- `Containers Manufacturing - Type: Privately Held - Headquarters: Aurora`

同一个 YouTube URL生成 10 条“Lead”：

- `#430`
- `Packaging`
- `Branding`
- `Design`
- `E-commerce`
- `Product Perception`
- `Premium Pricing`
- `Sustainability`
- `Small Businesses`
- `Wholesale`

同一个 Reddit URL生成 6 条完全相同的：

```text
Largest Industrial Automation integrators/contractors in the ...
```

### Invalid content / ranking evidence

以下内容仍进入 Lead：

- `Semantic HTML : r/learnprogramming`
- `Best practices: what do you leave for html and what to leave for css?`
- `Can someone explain what SaaS is?`
- `YouTube source`
- `Facebook source`
- `#430`

部分 YouTube/Reddit 内容被标为：

- CustomerType：Buyer
- IntentScore：77
- RecommendedAction：contact_now

当前 Ranking 更像“关键词命中评分”，不是“可联系客户优先级”。

## 3.7 Customer Detail

打开 Shorr Packaging 后：

- 国家：United States
- 目标场景：Europe
- 业务：包装设备、包装耗材与自动化解决方案供应商
- 当前搜索产品：Industrial automation SaaS
- 页面仍显示：
  - 高意向
  - 90/100
  - 立即联系
  - 决策窗口紧迫

问题：

- Lead 不属于本次搜索任务。
- 国家不匹配。
- 没有公司网站字段展示。
- 公司名称重复。
- 原始内容过长，重要证据没有摘要。
- 供应商推广内容被当成买家需求。

## 3.8 Lead Research

点击“AI研究客户”后产生：

| 字段 | 结果 |
|---|---|
| matchScore | 0 |
| purchaseLikelihood | High |
| priority | A |
| leadQuality | low |
| salesRecommendation | nurture |
| recommendedAngle | Unknown |
| ProductProfile | null |
| Provider | rule-based |

这些结果互相冲突，无法回答“应该不应该联系”。

### 伪购买信号

系统根据公司自述：

```text
We specialize in packaging design, process and procurement methodologies...
```

生成：

- Active procurement process
- Technical problem requiring assistance
- Procurement or sourcing activity detected

又根据一条历史 LinkedIn 内容日期生成：

- Time-sensitive requirement

原文表达的是 Shorr 向客户提供服务，并不能证明 Shorr 正在采购工业自动化 SaaS。

这是“主语/角色识别”错误：

```text
供应商描述自己的能力
≠
买家表达采购需求
```

## 3.9 Sales Recommendation and Outcome

销售建议层的问题：

- 页面上方旧分析建议“立即联系”。
- LeadResearch 为 0 分并返回 Unknown angle。
- Sales Intelligence 同时给出 Priority A 和 nurture。
- Outreach 内容已经存在于研究结果中，基于错误购买信号生成。

Outcome 流程表现：

- “不匹配”可以点击。
- 备注可以保存。
- 数据库正确保存为 `LOST`。

结论：Outcome 技术闭环可用，但上游判断错误会污染 Feedback、Outcome Analytics 和 Learning Insights。

## 4. Problems Found

## P0 — Blocks real users

### P0-1：Exa MCP 未注册，默认真实搜索不可用

影响：用户无法产生新的真实 Lead。

建议修复：

1. 为当前运行账号注册 Exa MCP。
2. 增加启动时 Provider health preflight。
3. Search 按钮在 Provider unavailable 时阻止任务并显示可操作错误。
4. 外部 Provider smoke test 必须成为发布门禁。

涉及：

- Windows mcporter/Exa 配置
- `backend/src/providers/search/agent-reach.provider.ts`
- `backend/src/services/search-task.service.ts`
- Provider health endpoint / startup check

### P0-2：搜索失败后展示旧结果，形成虚假成功

影响：销售人员把历史/Mock Lead 当成本次真实搜索结果。

建议修复：

- 新搜索开始时建立独立 result state。
- FAILED 时不请求或不展示全量 Lead。
- 页面显示失败原因、任务 ID、重试操作。
- Lead 查询必须按 `searchTaskId` 返回本次结果。
- 空结果、失败和历史结果必须是三个不同状态。

涉及：

- `src/pages/DiscoverPage.tsx`
- `src/services/api.ts`
- `backend/src/services/lead.service.ts`
- SearchTask response contract

### P0-3：Product Understanding、Search Intent 和 Research 的产品上下文断裂

影响：

- SaaS 被搜索成 industrial automation equipment。
- Europe 变成 Unknown。
- LeadResearch 没有 ProductProfile，最终 matchScore 为 0。

建议修复：

- 建立一次搜索使用的 canonical ProductContext。
- SearchTask 保存或关联 ProductProfile ID。
- Search Intent 使用 Product Understanding 结果，而不是分别猜测。
- Research 自动读取产生该 Lead 的 ProductProfile。
- 对 product/market/industry/customerType 设置不可丢失的执行约束。

### P0-4：内容片段和同一来源被批量生成高分 Lead

影响：结果数量看起来很高，但销售无法使用。

建议修复：

- company Lead 必须有唯一公司主体证据。
- 同一 source URL 的内容词不能分别成为公司 Lead。
- 公司域名优先于标题片段。
- content/community 不能默认 `contact_now`。
- 在写入前增加 Lead Quality Gate。

最低写入条件建议：

```text
company subject verified
AND source URL valid
AND commercial relationship identified
AND evidence supports target role
```

无法满足时保存为 content evidence，而不是销售 Lead。

### P0-5：研究结果自相矛盾并编造购买信号

影响：系统可能建议销售联系错误对象，并基于错误事实生成 Outreach。

建议修复：

- 建立 subject / actor / action 三元判断：
  - 谁在说话？
  - 谁提供产品？
  - 谁表达需求？
- 没有 ProductProfile 时禁止输出 High、Priority A 或 contact_now。
- `matchScore=0` 时 purchaseLikelihood 不得为 High。
- 没有买方动作证据时 buying signal 必须为空或 Unknown。
- 研究输出增加 cross-field validation。

## P1 — Important improvements

### P1-1：搜索应显式提交

当前输入变化后自动执行搜索，容易在用户尚未输入完成时创建付费外部任务。

建议：

- 输入时只运行本地/低成本意图预览。
- 仅点击“雷达扫描”后创建真实 SearchTask。
- 显示将执行的产品、地区、客户类型和关键词，让用户可轻量确认。

### P1-2：结果卡必须围绕可信证据

每条可销售 Lead 至少展示：

- Company
- Website/domain
- Location
- Business evidence
- Why matched
- Recommended sales angle
- Confidence / Unknown
- Source

原始长文本应折叠，不应成为卡片主体。

### P1-3：生产数据隔离 Mock

- Mock Provider 和 Seed 保留。
- 生产 Discover 默认不得混入 `provider=mock`。
- 提供开发环境明确的 Demo 数据标识。

### P1-4：统一一个销售判断

当前页面同时存在：

- 初始 intent score
- 旧 AI Analysis
- LeadResearch match score
- Lead quality
- Priority
- Sales recommendation

需要统一为：

```text
Fit
Evidence
Buying signal
Priority
Next action
```

内部可以保留多个模型，但用户只能看到一致结论。

### P1-5：去重应覆盖 source identity 与 company identity

当前 `externalId` 唯一约束不足以避免同一 URL 派生多个垃圾 Lead。

建议在服务层增加：

- canonical source URL
- normalized company domain
- normalized legal/company name
- same searchTask + same company subject
- content candidate 与 company candidate 分离

### P1-6：加入真实 Provider 集成测试

107 个自动化测试全部通过，但真实 Provider 仍不可用。

测试门禁应分层：

1. Unit：Parser / Normalizer / Scoring。
2. Contract：固定的真实响应 fixture。
3. Runtime smoke：mcporter + Exa。
4. HTTP integration：SearchTask → Lead。
5. Browser E2E：成功 / 空结果 / 失败 / 超时。

## P2 — Future improvements

- 将 SearchTask 迁移到持久队列/worker，支持进程重启恢复。
- Provider latency、失败率、空结果率和有效公司率监控。
- 产品/市场策略的可解释多查询编排。
- 在数据质量稳定后增加第二真实 Provider。
- Learning Insights 只读取质量合格的 Lead，避免垃圾输入污染洞察。

## 5. Evidence Summary

| Evidence | Observation |
|---|---|
| Agent Reach doctor | CLI 不存在 |
| mcporter list | 没有 Exa server；0 healthy |
| Project real test | `Unknown MCP server 'exa'` |
| SearchTask | FAILED / INVALID_RESPONSE / 0 results |
| Discover UI | 失败后仍显示 129 个历史客户 |
| Search semantics | SaaS → industrial equipment；Europe → Unknown |
| Database | 118 AgentReach + 11 Mock |
| Missing company | 67/118 |
| Missing domain/website | 112/118 |
| Duplicate source groups | 9 groups / 38 Leads |
| Europe results | 0 |
| Minimum usable AgentReach results | 2/118 |
| Full result with valid sales angle | 0/118 |
| Research contradiction | match 0 + purchase High + priority A |
| Outcome | LOST 成功持久化 |
| Regression tests | 107/107 pass；证明 Unit tests 不能替代真实运行验证 |

## 6. Can a New Salesperson Succeed?

### Can a new salesperson understand the product?

**部分可以。**

首页和 Discover 能表达“输入产品、寻找客户、AI分析”的方向。但 Search Intent、Product Understanding 和最终执行结果不一致，用户无法确认系统究竟理解了什么。

### Can they find a customer within 3 minutes?

**当前不能。**

本次真实 Provider 在 1 秒内失败，页面却展示历史结果。用户可能在 3 分钟内打开一个 Lead，但无法证明它来自当前搜索或值得联系。

### Does it increase sales efficiency?

**当前数据下可能降低效率。**

原因：

- 用户需要手工排除内容页、重复公司和错误国家。
- 错误高分与购买信号会诱导无效触达。
- 搜索失败没有明确解释。

当 Provider 可用、结果按任务隔离、数据质量门槛和研究一致性修复后，现有架构才有机会真正节省销售时间。

## 7. Recommended Fix Order

### Step 1 — Restore truth

1. 注册并验证 Exa MCP。
2. SearchTask failed 时显示失败，不展示旧结果。
3. Lead API 按本次 `searchTaskId` 返回结果。
4. 生产结果排除 Mock。

### Step 2 — Preserve intent

1. Product Understanding 生成 canonical ProductContext。
2. 正确识别 Europe。
3. SearchTask 关联 ProductProfile。
4. LeadResearch 自动继承同一个产品上下文。

### Step 3 — Establish Lead Quality Gate

1. company/domain/source/evidence 主体校验。
2. source URL + company identity 去重。
3. content/community 不进入 company priority。
4. 无购买主体证据时禁止 contact_now。

### Step 4 — Make research internally consistent

1. 主语与买卖角色判断。
2. cross-field validation。
3. `matchScore=0`、Unknown angle、无 ProductProfile 时安全降级。
4. 错误购买信号不得进入 Outreach 或 Learning。

### Step 5 — Add release-level E2E

验证：

```text
one product
→ one market
→ one successful real task
→ 3–5 traceable company candidates
→ one evidence-led research
→ one saved outcome
```

发布指标不应是“返回多少 Lead”，而应是：

- Valid company rate
- Website/domain coverage
- Duplicate rate
- Evidence-backed match rate
- Sales user acceptance rate

## 8. Final Readiness Decision

**Decision: NO-GO for real users**

当前可以继续作为内部原型和架构验证环境，但不应对真实销售用户承诺“找到正确客户”。

解除 NO-GO 的最低条件：

- Exa Runtime smoke test 稳定通过。
- 搜索失败不再展示历史结果。
- Product/Market 上下文完整贯穿。
- 同一来源不再批量生成内容碎片 Lead。
- 每条展示结果具备公司、网站、证据、匹配原因和销售角度。
- Research 输出通过一致性校验。

产品方向无需改变。需要修复的是可信执行：

> Find the right customers faster with trustworthy evidence.

