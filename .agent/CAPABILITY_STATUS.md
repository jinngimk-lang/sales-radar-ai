# Sales Radar AI — Codex Capability Status

审计日期：2026-07-27  
范围：当前 Codex Desktop 环境与 Sales Radar AI 本地开发工作区。  
原则：本文件只记录已验证状态；“已安装”不等于已获得具体账号、文件或工作区的访问权限。

## 状态总览

| Capability | Status | 已验证能力 | 依赖 | 权限 / 用户操作 |
|---|---|---|---|---|
| Browser / Chrome | Already Available | Codex 内置浏览器可打开本地站点、读取 DOM、检查 Console，并完成 Discover、Dashboard、Account、Assistant、Customer Detail 走查 | Browser 插件、Node/Playwright 运行时 | 本地页面无需额外授权；访问登录站点或执行外部写操作时需对应账号权限与用户确认。独立 Chrome 会话未在本轮验证 |
| Computer Use | Already Available | Browser 运行时提供 Playwright、DOM CUA 与视觉 CUA，可模拟点击、输入和完整 SaaS 旅程 | Browser 会话 | 对外发布、提交、删除、支付等有副作用操作仍需明确授权 |
| Git | Already Available | 用户已确认 Git 与仓库工作流正常；本轮未重装 | 已安装 Git | 仅读审计无需新增权限 |
| GitHub workflow | Already Available | 用户已确认仓库工作流正常；本轮未重复配置 | Git、现有 GitHub 凭据/远端 | PR、Issue、Push 等写操作需仓库权限；本轮未执行 |
| GitHub Connector | Requires User Action | 当前不影响本地审计；未安装独立 GitHub Connector | GitHub 插件（可选） | 仅当需要由 Codex 直接管理 PR/Issue 时再连接账号并授权仓库 |
| Data Analytics | Already Available | 可通过代码执行、Spreadsheet 与 Visualization 能力分析销售指标、学习数据和测试结果 | 本地运行时；按任务可使用表格/可视化技能 | 读取业务数据库或文件需要相应数据访问权限；不得输出敏感数据 |
| Product Design / UI UX | Already Available | 可结合浏览器真实走查、Product Design 判断、可视化能力进行用户旅程与界面质量审计 | Browser；按需使用 Figma/Visualize/ImageGen | 访问外部设计资产时需要对应文件权限 |
| Figma | Installed | Figma 插件安装已由用户确认 | Figma 插件 | 尚未验证具体 Figma 账号/文件连接；首次访问设计文件时可能需要登录和授权 |
| Notion | Installed | Notion 插件安装已由用户确认 | Notion 插件 | 尚未验证具体 Notion 工作区连接；写入或读取页面时需要工作区授权 |
| Agent Reach skill | Installed | Skill 指令文件可用；项目中存在 AgentReachProvider 与测试脚本 | `mcporter.cmd`、Exa MCP 配置、Node、网络 | 当前真实运行失败：`mcporter` 报 `Unknown MCP server 'exa'`；需用户完成 Exa MCP 注册/凭据配置后验证 |
| Superpowers | Requires User Action | 当前技能清单和可安装插件列表中未发现可确认兼容的 Superpowers 包，因此未安装 | 未确定 | 需要用户提供准确来源/插件 ID 后才能验证兼容性；当前项目不依赖它 |
| Remotion | Requires User Action | 未安装；当前稳定化审计不需要视频生成能力 | Remotion/Node（若未来使用） | 无需现在安装；仅在产品演示视频成为明确需求时评估 |

## 已安装与已可用能力

- Browser：已完成本地产品的多页面真实浏览器走查。
- Computer Use：通过 Browser 运行时可用，不需要额外安装。
- Git / GitHub repository workflow：用户已确认可用，本轮没有重装或改动。
- Data Analytics：本地分析与可视化能力可用。
- Product Design / UI UX：浏览器审计及设计评估能力可用。
- Figma：已安装；具体账号/文件权限尚待首次使用时验证。
- Notion：已安装；具体工作区权限尚待首次使用时验证。
- Agent Reach skill：技能文件已安装，但外部搜索运行时尚未达到可用状态。

## 失败或未完成项

### Agent Reach / Exa runtime

已验证：

- `mcporter.cmd` 存在：`C:\Users\Administrator\AppData\Roaming\npm\mcporter.cmd`
- 项目测试脚本可以启动 `AgentReachProvider`
- 实际调用失败：`Unknown MCP server 'exa'`
- 当前 Shell 中未发现独立 `agent-reach` CLI

结论：代码与技能存在，但真实互联网 Provider 的关键运行依赖未配置完整。不得将它标记为“可生产使用”。

建议人工步骤：

1. 在当前 Windows 用户的 `mcporter` 配置中注册 Exa MCP。
2. 配置 Exa 所需凭据，避免将 Key 写入仓库。
3. 执行：

   ```powershell
   mcporter.cmd list
   mcporter.cmd call "exa.web_search_exa(query: 'industrial automation suppliers USA', numResults: 5)"
   ```

4. 在项目后端执行：

   ```powershell
   npm run test:agent-reach -- "industrial automation suppliers USA"
   ```

5. 只有在上述测试稳定成功后，才能把 AgentReach 搜索标记为 Ready。

### Figma / Notion 连接状态

插件安装已确认，但本轮没有访问用户的 Figma 文件或 Notion 工作区。因此：

- 安装状态：Installed
- 账号连接与对象权限：Requires User Action when first used

### Superpowers

没有可靠的插件 ID 或兼容来源，本轮未尝试安装。Sales Radar AI 当前稳定化工作不依赖该能力。

## Sales Radar AI 推荐用法

| 能力 | 推荐使用场景 |
|---|---|
| Browser + Computer Use | 每次发布前跑 Discover → Lead Detail → Research → Outcome 的核心旅程；检查 loading、empty、error 和移动端体验 |
| Git / GitHub | 每个 P0/P1 独立分支与 PR；把运行证据、迁移影响和回滚方式写入 PR |
| Data Analytics | 验证 Learning 指标、漏斗口径、去重率、搜索命中率与 Provider 失败率 |
| Product Design / Figma | 在不改变整体视觉语言的前提下，统一搜索、证据、销售建议和反馈的交互层级 |
| Notion | 维护产品决策记录、上线检查表、Provider 运维手册和数据口径 |
| Agent Reach | 仅作为 Search Provider；完成运行时健康检查、配额/超时/失败降级后再用于真实用户 |

## 权限与安全边界

- 不在仓库、日志、文档中保存 API Key、登录 Cookie、完整 Prompt 或用户隐私数据。
- 浏览器已登录会话不等于允许对外提交或修改数据。
- Figma、Notion、GitHub 的对象级权限应遵循最小权限原则。
- 真实搜索 Provider 应设置超时、速率限制、可观测性，并遵守来源网站条款。

