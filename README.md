# Sales Radar AI · 全球客户发现平台

> AI 驱动的全球客户发现 SaaS 产品前端。输入你的产品，自动发现潜在客户、采购需求与销售机会。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript 5 |
| 构建 | Vite 5（路由懒加载分包） |
| 样式 | Tailwind CSS 3.4 + CSS Variables 主题 |
| 路由 | React Router v6 |
| 图表 | Recharts |
| 图标 | lucide-react |
| 动画 | Tailwind keyframes（fade-in / fade-in-up） |

## 核心页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Landing 首页 | 产品介绍、Hero 搜索、行业覆盖、CTA |
| `/app/discover` | 客户搜索 | 关键词搜索 + 多维筛选 + 卡片列表 + 一键生成开发信 |
| `/app/customer/:id` | 客户详情 | AI 深度分析、多渠道触达话术生成 |
| `/app/assistant` | AI 销售助手 | ChatGPT 风格对话，跟进方案/邮件/报价生成 |
| `/app/dashboard` | 数据看板 | 趋势/行业/平台分布图表，Recharts 渲染 |
| `/app/account` | 个人中心 | 账号、API、搜索历史、收藏、CRM 五标签 |

## 设计系统

- **品牌主色**：`#2046d8`（深蓝），辅以 `#3563f0` 渐变
- **中性色**：`ink-{50..900}` 自定义色阶，替代 Tailwind 默认 gray
- **字体**：系统无衬线栈，标题 600/700 字重
- **圆角**：卡片 `rounded-2xl`（16px），按钮 `rounded-xl`（12px）
- **阴影**：自定义 `shadow-card` / `shadow-card-hover` / `shadow-glow`

## 目录结构

```
src/
├── components/
│   ├── ui/            # 基础组件（Avatar / Modal / Logo / Badge）
│   ├── layout/        # 布局（AppLayout / PublicHeader / PublicFooter）
│   └── discover/      # 搜索页专用（FilterSidebar / CustomerCard）
├── pages/             # 6 个页面
├── services/api.ts    # API 抽象层（当前 mock，未来接入真实后端）
├── data/              # 模拟数据（客户 / 看板 / 元信息）
├── types/             # TypeScript 类型定义
└── lib/utils.ts       # 工具函数 + 意向等级元数据
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 接入真实后端

所有数据访问统一经过 `src/services/api.ts`。当前使用 mock 数据，未来替换为真实后端只需：

1. 在 `.env` 中配置 `VITE_API_BASE_URL`
2. 将各方法的 mock 实现替换为 `fetch` / `axios` 调用
3. 保持返回类型不变，页面组件无需改动

## 项目特点

- **路由懒加载**：首屏 bundle 仅 63KB（gzip），Dashboard 等重页面按需加载
- **响应式**：桌面侧边栏 + 移动端抽屉适配
- **无障碍**：模态框焦点管理、ESC 关闭、aria 标签
- **零 TypeScript 错误**：严格模式编译通过
