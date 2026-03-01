# RMF CRM Frontend

`shadcn-admin/` 是 RMF CRM 当前活跃的 React 前端，已完成从 shadcn/Radix 到 Semi Design 的迁移。

## 技术栈

- React 19
- Vite 7
- Semi Design (`@douyinfe/semi-ui-19`)
- TanStack Router / React Query
- Tailwind CSS 4
- Zustand

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：`http://localhost:3457`

## 关键约定

- 业务组件优先使用 Semi Design 与 `src/components/semi/`
- 全局通知统一通过 `src/lib/toast.tsx`
- 目录和实现规范以 [FRONTEND_RULES.md](./FRONTEND_RULES.md) 为准

## 构建

```bash
npm run build
```
