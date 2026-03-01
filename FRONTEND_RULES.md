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
│   ├── ui/                # 遗留 shadcn/ui 基础组件（逐步弃用）
│   └── data-table/        # 遗留 TanStack Table 组件（逐步弃用）
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
| `.semi-tabs-pane-motion-overlay` | 修复 Tabs 内容区 flex 高度链断裂 |
| `.semi-navigation-*` | 侧边栏 Nav 可滚动 + Footer 固定底部 |
| `*:focus` | 移除所有焦点轮廓 |
| 表格粘性列 | `[data-slot="table-row"] > .sticky` 背景色 |

## 开发命令

```bash
npm run dev         # 开发服务器 (端口 3457)
npm run build       # 构建生产版本
npx tsc --noEmit    # 类型检查
```
