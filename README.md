# 青藤集市 Qingteng Market

> 校园闲置，再生长一次。

校园学生专用二手闲置交易平台。纯线下自提交易，不做线上支付、不做订单，专注信息撮合。

## 功能

- 🏠 首页：搜索、分类入口、「向阳位」置顶商品、「林间好店」广告轮播、最新上架
- 🛍️ 集市：商品搜索 / 分类筛选 / 价格时间排序
- 📦 商品详情：多图轮播、卖家信誉卡、私信 / 收藏 / 举报
- 📝 发布：拍照 / 相册多选上传（canvas 压缩，最多 6 张）
- 🔍 求购专区：发布求购、分类筛选、联系买家
- 💬 站内私信：会话列表 + 聊天窗口，不展示外部联系方式
- 👤 个人中心：开放注册（学号自助填写）、在售 / 收藏 / 交易记录 / 信誉评价 / 意见反馈工单
- 🛡️ 管理后台 `/admin`：数据概览、商品管理（置顶 / 上下架）、广告位管理、用户管理、举报记录、反馈工单

## 技术栈

- Vite 6 + React 18 + TypeScript
- Tailwind CSS v4 + shadcn/ui（Radix UI）
- React Router v7
- React Context 状态管理 + localStorage 持久化（纯前端，无后端）
- framer-motion / react-hook-form / zod / sonner

## 启动

```bash
npm install     # 安装依赖
npm run dev     # 本地开发 http://localhost:5173
npm run build   # 类型检查 + 生产构建（产物在 dist/）
npm run preview # 预览生产构建
```

## 目录结构

```
src/
├── components/     # 通用组件 + shadcn/ui 组件
├── pages/          # 9 个页面（首页/集市/详情/发布/求购/消息/个人中心/管理后台/帮助）
├── context/        # AppContext 全局状态（登录、商品、广告、反馈工单等）
├── data/           # 类型定义 + mock 数据
├── lib/            # 工具函数、localStorage 封装
├── app.tsx         # 路由配置
└── tailwind-theme.css  # 品牌主题变量（绿色系）

public/images/      # 商品图 / 广告图 / 首页大图
```

## 说明

- 当前为纯前端版本：数据存于浏览器 localStorage，清除缓存会丢失
- 管理后台入口 `/admin`，需管理员账号登录
- 纯静态站点，可部署到 Vercel / Netlify / Cloudflare Pages
