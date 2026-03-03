# React 前端开发规则

shadcn-admin (React 19 + Semi Design) 前端开发的核心规范。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 19+ |
| UI 组件库 | **Semi Design** (`@douyinfe/semi-ui-19`) | 2.91+ |
| 图标 | `@douyinfe/semi-icons` + `lucide-react` | - |
| 构建工具 | Vite + SWC | 7+ |
| 类型 | TypeScript (strict) | 5.9+ |
| 路由 | TanStack Router | 1.141+ |
| 数据获取 | TanStack React Query | 5.90+ |
| 状态管理 | Zustand | 5+ |
| 动画 | motion (framer-motion) | 12+ |
| 样式 | Tailwind CSS 4 + Semi Design 内联样式 | - |
| HTTP | Axios | 1.13+ |
| 通知 | `@/lib/toast`（基于 Semi Toast） | - |

## Semi Design 使用规范

### 调用 Semi Skills 和 MCP

当需要查询 Semi Design 组件用法、解决组件问题、或生成组件代码时：

1. **调用 `semi-ui-skills`** — 查询组件 API、使用模式、最佳实践
2. **调用 `semi-mcp` 工具** — 获取组件源码和示例（`get_semi_document`、`get_semi_code_block`）
3. **调用 `semi-datepicker-datetime-presets`** — DatePicker dateTime 模式下 presets 不触发 onChange 的修复方案

### 组件导入

```tsx
// Semi UI 组件
import { Button, Input, Select, Table, Tag, Typography, Toast, Modal, SideSheet } from '@douyinfe/semi-ui-19'
import { IconSearch, IconPlus, IconRefresh, IconFilter } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'

// Lucide 图标（Semi Icons 没有的）
import { Play, FileText, UserRound } from 'lucide-react'

// 统一通知入口
import { toast } from '@/lib/toast'
```

### 样式方式

Semi 组件使用 **inline style** 而非 Tailwind：

```tsx
// 正确 — Semi 组件用 style prop
<div style={{ display: 'flex', gap: 8, padding: '16px 20px' }}>
  <Input style={{ width: 220 }} />
  <Button theme="solid">搜索</Button>
</div>

// 错误 — 不要对 Semi 组件用 Tailwind class
<Input className="w-56" />  // ❌
```

Tailwind 仅用于：自定义非 Semi 元素、全局样式工具类（`.no-scrollbar`）。

## 端口配置

**前端端口: 3457** — 禁止随意更改

## 目录结构

```
src/
├── components/
│   ├── semi/              # Semi Design 通用组件（数据表、布局、分页等）
│   ├── layout/            # 页面布局（侧边栏、头部、标签页管理器）
│   └── ...                # 业务无关的通用组件
├── features/              # 功能模块（按业务域划分）
│   ├── crm/               # CRM（线索、公海、订单、工作台等）
│   ├── yunke/             # 云客（AI 助手、通话记录）
│   ├── hr/                # 人力资源
│   ├── admin/             # 系统管理
│   └── ...
├── hooks/                 # 全局自定义 Hooks
├── lib/                   # 工具函数
│   ├── api/               # API 客户端（client.ts、error-toast.ts）
│   ├── utils/             # 通用工具
│   └── table-utils.ts     # 表格骨架屏工具
├── stores/                # Zustand stores（auth-store、tabs-store）
├── context/               # React Context（sidebar、theme、layout）
├── routes/                # TanStack Router 路由定义
└── styles/                # 全局 CSS（index.css、theme.css）
```

### features 模块内部结构

```
features/crm/leads/
├── leads-page.tsx          # 页面入口（状态管理 + 布局组合）
├── components/
│   ├── leads-table.tsx     # 表格组件（列定义 + SemiDataTable）
│   ├── leads-toolbar.tsx   # 工具栏（搜索、筛选、批量操作）
│   ├── lead-detail-sheet.tsx
│   └── ...
├── api.ts                  # API 接口
└── types.ts                # TypeScript 类型
```

## 数据表页面开发规范

**所有数据表页面必须复用以下通用组件**，参考线索管理页面（`features/crm/leads/`）作为标准实现。

### 通用组件一览

| 组件 | 路径 | 职责 |
|------|------|------|
| `DataTableLayout` | `@/components/semi/data-table-layout` | 页面布局壳（标题 + 工具栏 + 筛选标签 + 表格区域） |
| `SemiDataTable<T>` | `@/components/semi/semi-data-table` | 表格 + 动态高度 + 骨架屏 + 分页 |
| `FilterTagsBar` | `@/components/semi/filter-tags-bar` | 筛选条件标签栏 |
| `SemiTablePagination` | `@/components/semi/table-pagination` | 底部分页器（SemiDataTable 内部使用） |
| `useTableScroll` | `@/components/semi/use-table-scroll` | ResizeObserver 动态高度 Hook |
| `isSkeletonRow` / `SemiSkeletonCell` / `createSkeletonData` | `@/lib/table-utils` | 骨架屏工具 |

### 标准页面结构

```tsx
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import type { FilterTag } from '@/components/semi/filter-tags-bar'

export function MyPage() {
  const [pagination, setPagination] = useState({ page: 1, size: 20 })
  const [selectedRows, setSelectedRows] = useState<MyItem[]>([])

  const { data, isLoading } = useQuery({ ... })
  const items = useMemo(() => data?.items ?? [], [data?.items])
  //                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // ⚠️ 必须 useMemo：data?.items 在加载中为 undefined，
  //    `?? []` 每次渲染创建新数组引用 → SemiDataTable useEffect(data)
  //    触发清空选中 → setState → 重渲染 → 无限循环

  const filterTags: FilterTag[] = [ /* ... */ ]

  return (
    <>
      <DataTableLayout
        title="页面标题"
        total={data?.total}
        headerActions={<Button icon={<IconPlus />} theme="solid">新建</Button>}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        toolbar={<MyToolbar ... />}
        filterTags={filterTags}
        onClearAllFilters={handleClearAll}
      >
        <MyTable data={items} total={data?.total ?? 0} ... />
      </DataTableLayout>

      {/* Dialog / SideSheet 放在 DataTableLayout 外面 */}
    </>
  )
}
```

### 标准表格组件

```tsx
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'

export function MyTable({ data, total, page, pageSize, isLoading, ... }) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])

  const columns: ColumnProps<MyItem>[] = useMemo(() => [
    {
      title: '名称',
      dataIndex: 'name',
      width: 120,
      fixed: 'left',
      render: (_text, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width="80%" />
        return <Text strong>{record.name}</Text>
      },
    },
    // ... 更多列
  ], [])

  return (
    <SemiDataTable<MyItem>
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      isLoading={isLoading}
      scrollX={1200}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={onRowClick}
      rowSelection={{
        selectedRowKeys,
        onChange: (keys, rows) => {
          setSelectedRowKeys(keys)
          onSelectionChange?.(rows)
        },
        fixed: 'left',
        width: 48,
      }}
      emptyText="暂无数据"
    />
  )
}
```

### 骨架屏规范

每列的 render 函数中**必须**处理骨架屏行：

```tsx
render: (_text, record) => {
  if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
  return <Text>{record.fieldName}</Text>
}
```

骨架屏宽度参考：

| 内容类型 | 宽度 |
|---------|------|
| 姓名/短文本 | `"80%"` 或 `64` |
| 手机号/ID | `96` |
| 数字/年龄 | `32` |
| 标签/状态 | `64` |
| 日期时间 | `120` |
| 长文本/备注 | `96` |

### 筛选标签栏

```tsx
const filterTags: FilterTag[] = []

if (statusFilter.length > 0) {
  filterTags.push({
    key: 'status',
    label: '状态',
    value: statusFilter.map(s => statusLabels[s]).join(', '),
    onClose: () => { setStatusFilter([]); resetToFirstPage() },
  })
}
// ... 每个活跃筛选条件 push 一个 tag
```

### 工具栏布局

```
标题行:  页面标题 共N条                     [操作按钮] [🔄刷新]
工具栏:  [搜索框] [搜索] [筛选下拉...]           [批量操作]
标签栏:  筛选条件: [状态: 待分配 ×] [意向: 高 ×]   清除全部
```

- 刷新按钮放在 DataTableLayout 的 `onRefresh`（标题行右侧）
- 搜索和筛选放在 toolbar slot
- 批量操作按钮放在工具栏右侧

## Semi Table 防无限循环

Semi Design Table 的 `componentDidUpdate` 会对比 props 引用，对象引用变化就触发 forceUpdate。以下是必须遵守的规则：

```tsx
// ✅ 稳定化 scroll 对象
const scrollConfig = useMemo(() => ({ x: scrollX, y: scrollY }), [scrollX, scrollY])

// ✅ 稳定化 rowSelection
const tableRowSelection = useMemo(() => ({
  selectedRowKeys,
  onChange: stableCallback,
  ...
}), [selectedRowKeys, stableCallback, ...])

// ✅ 稳定化 onRow
const handleRow = useCallback((record) => ({ ... }), [])

// ✅ 稳定化 empty
const emptyContent = useMemo(() => <div>...</div>, [])

// ✅ 使用 ref 持有回调
const callbackRef = useRef(callback)
callbackRef.current = callback

// ❌ 禁止每次渲染创建新对象传给 Table
<Table scroll={{ x: 1200, y: scrollY }} />  // 每次渲染新对象
<Table onRow={(r) => ({ onClick: () => ... })} />  // 每次渲染新函数
```

**注意**：`SemiDataTable` 组件已内置这些优化，直接使用即可。仅在自定义 Table 时需要关注。

## 数据查询模式

```tsx
// 标准 useQuery 用法
const { data, isLoading } = useQuery({
  queryKey: ['resource-name', pagination, filters, search],  // 包含所有影响查询的状态
  queryFn: async () => {
    const response = await api.getList({ ...filters, page, size })
    return response.data
  },
})

// 刷新数据
const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ['resource-name'] })
  Toast.success({ content: '已刷新' })
}

// 批量操作后
const handleBatchSuccess = () => {
  setSelectedRows([])
  queryClient.invalidateQueries({ queryKey: ['resource-name'] })
}
```

## 搜索模式

搜索采用**按钮/回车触发**而非实时防抖：

```tsx
const [searchValue, setSearchValue] = useState('')       // 输入值
const [committedSearch, setCommittedSearch] = useState('') // 已提交值（用于查询）

const handleSearchChange = (value: string) => {
  setSearchValue(value)
  if (!value) { setCommittedSearch(''); resetToFirstPage() }  // 清空时立即触发
}

const handleSearch = () => {
  setCommittedSearch(searchValue)
  resetToFirstPage()
}

// queryKey 使用 committedSearch，不是 searchValue
queryKey: ['leads', pagination, committedSearch, ...]
```

## 时间处理

后端返回 UTC 时间，前端显示时使用工具函数转换：

```tsx
import { formatTime, formatDate, formatRelativeTime } from '@/lib/utils/time'

formatTime(record.created_at)       // "2025/12/16 15:44"
formatDate(record.created_at)       // "2025/12/16"
formatRelativeTime(record.updated_at) // "3天前"
```

## 剪贴板复制

**禁止直接使用 `navigator.clipboard.writeText()`**，HTTP 环境下会失败：

```tsx
import { copyToClipboard } from '@/lib/utils'

const success = await copyToClipboard(text)
if (success) Toast.success({ content: '已复制' })
```

## API 客户端

```tsx
import { apiClient } from '@/lib/api/client'
import { showApiErrorToast } from '@/lib/api/error-toast'

// GET
const response = await apiClient.get('/leads', { params: { page: 1, size: 20 } })

// POST
const response = await apiClient.post('/leads', data)

// 错误处理
try { ... } catch (error) {
  showApiErrorToast(error, '操作失败')
}
```

配置：基础路径 `/api/v1`，超时 30s，自动注入 Bearer Token，401 自动跳转登录。

## 全局 CSS 覆盖

`src/styles/index.css` 中包含重要的 Semi Design 覆盖，修改前必须理解：

| 规则 | 作用 |
|------|------|
| `.semi-tabs-content` | 修复 Tabs 内容区 flex 高度链断裂（Layer 1） |
| `.semi-tabs-pane-motion-overlay` | 修复 Tabs 内容区 flex 高度链断裂（Layer 2） |
| `.semi-navigation-*` | 侧边栏 Nav 可滚动 + Footer 固定底部 |
| `*:focus` | 移除所有焦点轮廓 |
| 表格粘性列 | `[data-slot="table-row"] > .sticky` 背景色 |

## 数据表页面布局规范（强制）

**重要：所有包含分页数据表格的页面/组件必须使用 `SemiDataTable` 标准组件。独立页面还应使用 `DataTableLayout` 包裹。**

### 适用范围

| 场景 | 使用方式 |
|------|---------|
| 独立数据表页面（如线索管理、通话记录） | `DataTableLayout` + `SemiDataTable` |
| Tab 内嵌数据表（如日控表各 Tab） | `SemiDataTable`（外层可用 Card） |
| 弹窗/抽屉内小型数据表（<50条，无分页） | 可直接使用 `<Table>`（不需要分页/骨架屏） |
| 弹窗内选择列表（如绑定员工选择） | 可直接使用 `<Table>`（交互性小表格） |

### 禁止的做法（code review 必查项）

- **禁止**在 features/ 目录中直接使用 `<Table>` + `<SemiTablePagination>` 组合 → 必须用 `SemiDataTable`
- **禁止**直接使用 Semi `<Table pagination={...}>` 内置分页 → 必须用 `SemiDataTable`
- **禁止**在页面/组件中定义本地 `createSkeletonData` / `isSkeletonRow` / `SKELETON_PREFIX` → 必须用 `@/lib/table-utils`
- **禁止**手动编写 `ResizeObserver` 来计算表格高度 → `SemiDataTable` 内部的 `useTableScroll` 已封装
- **禁止**手动计算 `displayData`（`isLoading ? createSkeletonData(...) : data`） → `SemiDataTable` 内部管理
- **禁止**使用 `<Main fixed>` 包裹数据表页面
- **禁止**手动定义 `pagination` useMemo 配置对象

### 自查清单（新增/修改数据表时）

1. 是否使用了 `SemiDataTable` 而非直接 `<Table>`？
2. 是否从 `@/lib/table-utils` 导入 `isSkeletonRow` / `SemiSkeletonCell`（而非本地定义）？
3. 是否用 `useMemo` 稳定了 `data?.items ?? []` 的引用？
4. 独立页面是否用 `DataTableLayout` 包裹？
5. 弹窗/SideSheet 是否放在 `DataTableLayout` 外面？

### 标准页面结构（简化版）

```tsx
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'

export function MyPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { data, isLoading, refetch } = useQuery({ ... })

  // ⚠️ 必须 useMemo 稳定引用，否则 SemiDataTable 内部 useEffect 因引用变化导致无限循环
  const items = useMemo(() => data?.items ?? [], [data?.items])

  const columns: ColumnProps[] = useMemo(() => [
    {
      title: '名称', dataIndex: 'name', width: 120,
      render: (text, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return <Text strong>{text}</Text>
      },
    },
  ], [])

  return (
    <>
      <DataTableLayout
        title="xxx管理"
        total={data?.total}
        headerActions={<Button theme="solid" icon={<Plus />} onClick={handleCreate}>新建</Button>}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input prefix={<IconSearch />} ... />
            <Select ... />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 弹窗放在 DataTableLayout 外面 */}
      <Modal>...</Modal>
    </>
  )
}
```

### 注意事项

- SemiDataTable 自动计算 `scroll.y`，无需手动设置表格高度
- DataTableLayout 自带刷新按钮（`onRefresh` prop），toolbar 中不需要额外的刷新按钮
- 骨架屏使用 `isSkeletonRow(record.id)` + `<SemiSkeletonCell width={N} />`
- 所有弹窗（Modal / SideSheet）放在 `<DataTableLayout>` 外面

## 数据表高度链规范（强制）

**核心原则：所有数据表页面的分页器必须紧贴浏览器底部，表格体在固定区域内滚动，而非分页器跟随数据表高度浮动。**

### 高度链原理

从根布局到分页器，必须形成一条**不间断的 flex 高度链**。任何中间层缺少关键 CSS 属性都会导致高度链断裂，表现为分页器"飘"在表格下方。

```
Layout (100vh, overflow: hidden)
  └── Layout.Content (flex: 1, overflow: hidden)
      └── TabsManager
          ├── Tab 栏 (flexShrink: 0)
          └── 内容区 (flex: 1, min-h-0, overflow: hidden)
              └── Outlet → 页面组件
                  └── DataTableLayout (h: 100%, overflow: hidden, flex-col)
                      ├── 头部/工具栏 (flexShrink: 0)
                      └── 表格容器 (flex: 1, min-h-0, overflow: hidden)
                          └── SemiDataTable (flex: 1, min-h-0, flex-col)
                              ├── 表格包装器 (flex: 1, min-h-0) ← useTableScroll 测量
                              │   └── Table (scroll.y = 动态计算)
                              └── 分页器 (flexShrink: 0) ← 贴底锚点
```

### 中间层三要素

高度链中每个容器层**必须同时具备**以下三个属性，缺一不可：

```css
flex: 1;           /* 填充父容器剩余空间 */
min-height: 0;     /* 允许 flex 子项缩小于内容高度（CSS 默认 min-height: auto 会撑开） */
overflow: hidden;  /* 截断溢出，将滚动权委托给内部 Table scroll.y */
```

### Semi Tabs 高度链修复

Semi Design Tabs 内部有三层默认 `flex: 0 1 auto` 的容器会**打断**高度链。`src/styles/index.css` 中的全局覆盖修复了这三层：

```css
/* Layer 1 */  .semi-tabs-content           { display: flex; flex: 1 1 0%; ... }
/* Layer 2 */  .semi-tabs-pane-motion-overlay { display: flex; flex: 1 1 0%; ... }
/* Layer 3 */  .semi-tabs-pane-active         { display: flex; flex: 1 1 0%; ... }
```

### 禁止的做法

- **禁止**使用 `h-[calc(100vh-Npx)]` 硬编码视口高度 → 必须通过 flex 链自适应
- **禁止**在中间层遗漏 `min-height: 0` → 会导致 flex 子项被内容撑开，高度链断裂
- **禁止**在中间层使用 `overflow: auto/scroll` → 滚动权应委托给最内层 `Table scroll.y`
- **禁止**给表格容器设定固定 `height` → 应使用 `flex: 1` 自适应

### 排查高度链断裂

如果分页器没有贴底（跟随表格内容浮动），逐层检查：

1. 打开浏览器 DevTools → 从 `<body>` 逐层向下检查
2. 找到第一个**高度超出视口**的元素 → 该层缺少 `overflow: hidden`
3. 找到第一个**高度等于内容高度**（而非父容器分配的高度）的 flex 子项 → 该层缺少 `min-height: 0`
4. 检查 Semi Tabs 相关层 → 确认 `index.css` 中的 `.semi-tabs-pane-motion-overlay` 修复存在

## SideSheet 抽屉加载规范

**核心原则：抽屉必须在用户点击时立即打开，数据加载期间显示骨架屏，禁止等待 API 响应后才打开抽屉。**

### 标准模式

```tsx
// ✅ 正确 — 先打开抽屉，再加载数据
const handleViewDetail = (id: string) => {
  setDetailId(id)     // 触发查询
  setDetailOpen(true) // 立即打开抽屉
}

const { data, isLoading } = useQuery({
  queryKey: ['detail', detailId],
  queryFn: () => api.getDetail(detailId!),
  enabled: !!detailId && detailOpen, // 打开时才请求
})

// ❌ 错误 — 等数据返回后才打开
const handleViewDetail = async (id: string) => {
  const data = await api.getDetail(id)  // 用户等待...
  setDetail(data)
  setDetailOpen(true)  // 数据回来后才打开
}

// ❌ 错误 — 数据未就绪时阻止渲染
if (!data && !isLoading) return null  // 抽屉无法展示
```

### 抽屉内骨架屏

使用 Semi Design `<Skeleton>` 组件，根据抽屉内容类型选择骨架屏布局：

```tsx
<SideSheet visible={open} ...>
  {isLoading && !data ? (
    // Header 骨架
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px' }}>
      <Skeleton.Title style={{ width: 60, height: 22 }} />
      <Skeleton.Button style={{ width: 64, height: 32 }} />
    </div>
    // 内容骨架
    <Skeleton loading active style={{ padding: '16px 20px' }}>
      <Skeleton.Title style={{ width: 120, height: 18, marginBottom: 16 }} />
      <Skeleton.Paragraph rows={4} style={{ width: '100%' }} />
    </Skeleton>
  ) : (
    // 真实内容
  )}
</SideSheet>
```

### 各场景骨架屏参考

| 抽屉类型 | 骨架屏布局 | 参考实现 |
|---------|-----------|---------|
| 详情查看（Tab 式） | Header 标签占位 + Tab 栏 + 表单字段网格 | `lead-detail-sheet.tsx` |
| 报告/文档 | 标题 + 段落 + 数据表格 | `disc-detail-drawer.tsx` |
| 对话/转写 | 头像 + 不等宽文本行（气泡式） | `record-detail-modal.tsx` |
| 筛选面板 | Select 组件设置 `loading` prop | `filter-sheet.tsx` |
| 表单编辑（prop 驱动） | 无需骨架屏（数据由 prop 传入） | `tasks-mutate-drawer.tsx` |

### 关闭按钮

骨架屏状态下**关闭按钮必须始终可用**，确保用户任何时候都能关闭抽屉。

## 禁止使用原生 HTML/JS 组件（强制）

**核心原则：所有交互元素必须使用 Semi Design 组件，禁止使用原生 HTML 表单元素和浏览器弹窗 API。**

### 禁止的浏览器 API

| 禁止 | 替代方案 |
|------|---------|
| `window.confirm()` / `confirm()` | `Modal.confirm({ title, content, onOk })` |
| `window.alert()` / `alert()` | `Toast.info()` / `Toast.warning()` / `Modal.info()` |
| `window.prompt()` / `prompt()` | 自定义 `Modal` + `Input` 表单 |

### 禁止的原生 HTML 表单元素

| 禁止 | 替代方案 |
|------|---------|
| `<button>` | `Button` (`@douyinfe/semi-ui-19`) |
| `<input>` | `Input` / `InputNumber` / `DatePicker` |
| `<select>` | `Select` |
| `<textarea>` | `Input` 的 `TextArea` (`Input.TextArea`) |
| `<form>` | Semi `Form` 或普通 `<div>` 布局 |
| `<label>` | Semi `Form.Label` / `Form.Item` 的 `label` prop |

### 允许的例外

以下场景中使用原生 HTML 标签是可接受的：

| 场景 | 说明 |
|------|------|
| Markdown 渲染器内的组件覆写 | `react-markdown` 的 `components` 配置中使用 `<table>`、`<button>` 等是标准做法 |
| `src/lib/craft-renderer/` 库组件 | 自包含的渲染库，使用 Tailwind 独立于 Semi 设计体系 |
| `document.createElement('a')` 下载触发器 | 标准的文件下载模式，无 Semi 替代方案 |
| 布局用 `<table>` (key-value 信息展示) | `lead-info-display.tsx`、`info-grid.tsx` 中用于表格式信息布局，非数据表格 |

### 自查清单

新增/修改组件时：
1. 是否使用了 `confirm()` / `alert()` / `prompt()`？→ 替换为 `Modal.confirm()` / `Toast` / `Modal`
2. 是否使用了 `<button>`？→ 替换为 Semi `Button`
3. 是否使用了 `<input>` / `<select>` / `<textarea>`？→ 替换为 Semi `Input` / `Select` / `Input.TextArea`
4. `<form>` 是否必要？→ 仅在需要原生表单提交语义时使用，否则用 `<div>` 或 Semi `Form`

## 开发命令

```bash
npm run dev         # 开发服务器 (端口 3457)
npm run build       # 构建生产版本
npx tsc --noEmit    # 类型检查
```
