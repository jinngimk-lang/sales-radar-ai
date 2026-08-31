# Owner-Verified Direct Delivery Workflow
## 跨项目 Agent 协作与交接协议

> 用途：这是一份可跨项目复用的 Agent 协作规则。
> 将本文件放进项目仓库（推荐命名为 `AGENTS.md`、`PROJECT_WORKFLOW.md` 或保留本文件名），或在新对话 / 新 Agent 接手时直接提供给它。
> 目标是让任何后续 Agent 在缺失聊天上下文的情况下，也能快速恢复正确的协作方式、权限边界和交付流程。

---

## 1. 核心合作原则

默认采用：

**Agent 先独立完成改动 → Owner 本地实际核验 → Owner 明确批准 → 再安全同步主体仓库。**

除非 Owner 明确改变规则，否则：

- 不把“代码写完”视为“可以发布”。
- 不把“自动测试通过”视为“Owner 已验收”。
- 不在 Owner 本地核验前更新主体仓库。
- Owner 明确批准后，默认直接安全同步主体，不为了流程形式额外创建 PR。
- 不允许 force push 主体默认分支。
- 不允许覆盖、丢弃或改写别人已经进入主体仓库的新提交。
- 每个任务应尽量保持单一、最小、可回滚、可独立验证。

---

## 2. 项目角色模板

接手新项目时，Agent 应先确认并记录以下角色：

```text
项目名称：<PROJECT_NAME>

生产/主体仓库：
<UPSTREAM_REPO>

工作仓库 / Fork：
<WORKING_REPO>

主体默认分支：
<UPSTREAM_BRANCH，通常为 main>

本地工作目录：
<LOCAL_PATH>

生产环境 / 网站（如有）：
<PRODUCTION_URL>
```

如果某项目没有 Fork，也可以使用同一仓库中的独立工作分支，但仍应保留：

**独立分支 → 本地核验 → 明确批准 → 主体分支**

这一交付顺序。

---

## 3. 每个任务开始前

Agent 在修改任何内容前，应：

1. 读取项目内已有的 `AGENTS.md`、`PROJECT.md`、`README.md`、技术约束、设计规范、状态文档或等价文件。
2. 获取主体默认分支的最新状态。
3. 确认当前工作区是否干净，避免把 Owner 的临时文件、调试改动或其他任务一起带入。
4. 从**主体最新产品基线**创建一个干净、聚焦的工作分支。
5. 明确本次任务只需要改什么，以及明确“不需要改什么”。

禁止为了“顺手优化”而混入：

- 无关重构；
- 无关格式化；
- 无关依赖升级；
- 无关文档更新；
- 其他页面或组件修改；
- 临时调试配置；
- 其他未被 Owner 请求的功能。

如果发现其他问题，应作为后续独立任务处理。

---

## 4. Agent 的实现阶段

Agent 应：

- 在工作仓库 / 独立分支中完成修改。
- 优先保持改动最小。
- 尽可能做到一个任务对应一个独立提交。
- 保留清晰、可逆的 Git 历史。
- 使用现有项目架构和约束，而不是随意引入新的框架或工作流。
- 运行足以证伪本次改动的最小自动验证。

例如可根据项目风险选择：

```text
lint
typecheck
unit tests
build
targeted integration tests
browser test
visual verification
```

不是每次都必须跑全部测试，但不能在没有证据时声称“已通过”。

---

## 5. UI / 网站 / 可视化任务的特殊规则

只要任务会改变用户实际看到或操作到的内容，例如：

- Logo
- Header / Footer
- 页面布局
- 字体
- 响应式表现
- 动画
- 导航
- 表单
- 交互
- 文案展示
- 图片或视频

就必须优先采用：

**Agent 修改 → Owner 本地真实运行 → Owner 浏览器检查。**

Agent 应主动给出尽可能短、明确、可复制的本地运行步骤。

在 Windows 项目中，命令应尽量使用单行、可直接粘贴的 PowerShell 命令。

---

## 6. Owner 本地验收门

在 Owner 明确表示接受之前：

**禁止修改主体仓库。**

以下表达可视为明确批准，例如：

```text
可以提交
没问题
这版可以
直接同步主体
可以 push
就用这版
```

模糊表达不应自动当作发布授权，例如：

```text
看起来还行
先这样吧
我再看看
应该可以
```

如有歧义，应继续保持在工作分支，不碰主体。

---

## 7. Owner 批准后的最终安全检查

Owner 明确批准以后，Agent 不应立即盲目 push。

必须重新检查主体仓库，因为在 Owner 本地检查期间，其他协作者可能已经提交了新内容。

至少完成：

1. 重新 fetch / 读取主体默认分支。
2. 确认主体分支有没有新提交。
3. 比较当前工作分支与最新主体分支。
4. 确认最终 diff 仍然只包含 Owner 刚批准的任务。
5. 确认当前提交仍可安全 fast-forward 到主体。

推荐本地安全检查：

```bash
git fetch upstream
git merge-base --is-ancestor upstream/main HEAD
```

如果返回退出码 `0`，通常表示当前 HEAD 是主体 `main` 的后代，可进行正常 fast-forward 推送。

如果返回非 `0`：

**不要 force push。**

应重新基于最新主体分支整理或重放本次改动，并再次确认结果没有偏离 Owner 已批准的版本。

---

## 8. 默认交付方式

在 Owner 已经本地验收并明确批准后：

### 默认

直接将已批准的干净提交安全同步到主体默认分支。

例如：

```bash
git push upstream HEAD:main
```

前提是：

- 已确认 fast-forward；
- 当前 diff 只包含批准内容；
- 没有新的主体提交被覆盖；
- 当前身份确实拥有写权限。

### 默认不创建 PR

Owner 已经选择了“本地人工验收作为最终产品验收门”的协作模式。

因此，除非以下情况之一发生，否则不为了形式额外创建 PR：

- Owner 明确要求 PR；
- 仓库保护规则强制 PR；
- 组织流程强制 code review；
- 当前身份没有直接写入主体的权限；
- 变更风险高到需要额外独立审查；
- 多人团队约定必须通过 PR。

---

## 9. 写权限不足时

如果 Agent 的 GitHub / GitLab / 其他集成可以读主体但无法写主体：

不要声称已经同步成功。

应保留 Owner 已批准的工作分支，并指导 Owner 使用最小本地命令完成同步。

典型流程：

```bash
git remote add upstream <UPSTREAM_REPO_URL>
git fetch upstream
git merge-base --is-ancestor upstream/main HEAD
git push upstream HEAD:main
```

如果 `upstream` 已存在，则不要重复添加。

Agent 应根据终端真实输出逐步指导，而不是一次给大量可能不需要的命令。

---

## 10. 永远禁止的主体操作

除非存在极端、明确、单独批准的恢复场景，否则：

- 禁止 `git push --force`
- 禁止 `git push --force-with-lease` 到主体默认分支
- 禁止 reset 后强推主体
- 禁止删除主体默认分支
- 禁止覆盖别人的新提交
- 禁止为了让历史“更漂亮”而重写已经接受的主体历史
- 禁止把临时 debug 修改一起推入主体
- 禁止把本地 secret、token、密码、cookie、证书或生产凭据写入仓库

---

## 11. 推送完成后的复核

不能只凭本地终端显示 `push` 成功就结束。

Agent 应尽可能从远端再次确认：

- 主体默认分支已经指向预期 commit；
- commit message 正确；
- 目标文件确实存在；
- 关键代码内容确实是 Owner 本地验收的那一版；
- 没有额外文件意外进入主体。

只有完成这一步后，才可以向 Owner 表示：

**主体同步已确认完成。**

---

## 12. 上下文过长 / Agent 更换时的恢复规则

聊天上下文不是项目事实源。

如果发生：

- 对话上下文达到上限；
- 新 Agent 接手；
- 新会话继续；
- Agent 重启；
- Owner 隔了很久回来；

新 Agent 必须先从仓库恢复状态，而不是要求 Owner 从头解释。

推荐恢复顺序：

1. `AGENTS.md` 或本协议；
2. `PROJECT.md` / 项目长期说明；
3. `STATUS.md` / 当前状态；
4. 技术硬约束；
5. 相关设计 / feature spec；
6. 主体默认分支最新 commit；
7. 当前工作仓库相关 branch；
8. Git log / diff；
9. 本地 worktree 状态。

核心原则：

> **Repository evidence beats chat memory.**

仓库证据优先于模糊的对话记忆。

---

## 13. 给新 Agent 的快速摘要

如果只允许新 Agent 读一小段，就让它读下面这段：

> 本项目默认采用 Owner-Verified Direct Delivery Workflow。
> 任何正常产品改动先在工作仓库的独立干净分支完成，只做一个聚焦任务并进行必要自动验证。
> 对 UI / 网站改动，必须先指导 Owner 在本地真实运行并检查。
> Owner 没有明确批准前，绝不能修改主体仓库。
> Owner 批准后，要重新 fetch 主体默认分支，确认没有别人新提交，检查 diff 仅包含已批准任务，并验证当前提交可正常 fast-forward。
> 满足条件后默认直接同步主体默认分支，不主动创建 PR。
> 永远不 force push 主体默认分支，不覆盖别人代码。
> 如果 Agent 集成没有主体写权限，就保留已批准分支并指导 Owner 本地执行安全 push。
> 推送后还要从远端重新确认主体分支和文件内容。
> 如果上下文丢失或换 Agent，先读仓库内本协议和项目状态，再看 Git 历史恢复，不依赖聊天记忆。

---

## 14. 推荐的项目目录放置方式

一个长期项目建议至少保留：

```text
AGENTS.md
PROJECT.md
STATUS.md
```

职责建议：

### `AGENTS.md`

Agent 的第一入口：

- 工作方式
- 权限边界
- 交付流程
- 禁止事项
- 恢复顺序

### `PROJECT.md`

长期不容易变化的信息：

- 项目目标
- 仓库角色
- 架构原则
- 长期工作模式
- 重要产品约束

### `STATUS.md`

频繁变化的信息：

- 当前阶段
- 最近完成
- 当前任务
- 下一步
- 已知阻塞
- 当前基线 commit

这样即使聊天完全丢失，新 Agent 也能从仓库恢复。

---

## 15. 可选的多人协作增强规则

如果未来变成多人开发，可在保留本协议核心思想的同时增加：

- 每个开发者独立 branch；
- Owner 仍保留最终本地产品验收权；
- 高风险改动增加 code review；
- 主体分支开启 branch protection；
- CI 必须通过才能进入主体；
- 安全 / 数据库 / 基础设施改动强制 PR；
- UI 小改在 Owner 验收后允许直接 fast-forward。

也就是说：

**本协议不是反 PR，而是不为了形式而 PR。**

PR 是风险控制工具，不应替代 Owner 的真实产品验收，也不应在低风险、已验收、可 fast-forward 的简单改动上制造无意义流程成本。

---

## 16. 最终默认规则

没有其他项目规则覆盖时，默认执行：

```text
最新主体基线
    ↓
干净独立工作分支
    ↓
只完成一个任务
    ↓
自动验证
    ↓
Owner 本地真实检查
    ↓
Owner 明确批准
    ↓
重新检查最新主体
    ↓
确认 diff + fast-forward
    ↓
直接同步主体
    ↓
远端再次复核
```

永远坚持：

**Local verification first. Upstream synchronization second.**

**No owner approval, no upstream change.**

**No force push to the upstream default branch.**

**No unrelated changes hitchhiking into delivery.**

---

## 17. 项目覆盖规则

本协议是通用默认规则。

如果某个具体项目存在更高优先级要求，例如：

- 公司强制 PR；
- 法规要求双人审批；
- 安全仓库禁止直接 push；
- branch protection 强制检查；
- 发布必须经过 staging；
- 数据迁移需要单独审批；

则具体项目的这些约束优先。

Agent 不应为了遵守本通用模板而绕过项目自身的安全、法律、组织或技术限制。

---

**Version:** 1.0

**Purpose:** Cross-project Agent collaboration, context recovery, local owner verification, and safe direct delivery.
