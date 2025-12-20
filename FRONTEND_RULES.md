# React 前端开发规则

shadcn-admin (React + shadcn/ui) 前端开发的核心规范。

## 技术栈

- React 18+ 函数组件 + Hooks
- shadcn/ui 组件库 (基于 Radix UI)
- Vite 构建工具
- TypeScript 5+
- TanStack Query (React Query) 数据获取
- TanStack Table 高级表格
- Tailwind CSS 样式
- recharts 图表库

## 组件使用优先级

**重要：组件和样式选择遵循以下优先级顺序：**

### 1. 优先使用 shadcn-admin 项目已有组件

首先检查本项目 `src/` 目录下是否已有相关组件：

```
src/
├── components/ui/          # 基础 UI 组件 (已扩展)
├── components/data-table/  # 数据表格相关组件
├── components/layout/      # 布局组件
└── features/*/components/  # 业务模块组件
```

**已扩展的组件示例：**
- `Badge` - 扩展了 success/warning/info/purple 等语义化 variant
- `Timeline` - 时间轴组件 (shadcn 原版没有)
- `SimplePagination` - 简化分页组件
- `DatePicker` - 日期选择器 (支持三种 UI 风格 + 中文格式)
- `DateRangePicker` - 日期范围选择器
- `FormDatePicker` - 表单用日期选择器 (兼容 react-hook-form)

### 2. 其次参考 shadcn-admin 示例项目

- GitHub: https://github.com/satnaing/shadcn-admin
- Demo: https://shadcn-admin.netlify.app

参考其布局模式、组件组合方式、样式处理等。

### 3. 最后降级使用 shadcn/ui 默认组件

- 官方文档: https://ui.shadcn.com/docs/components
- 如需新增组件，使用 `npx shadcn@latest add <component>` 安装

### 使用检查流程

```
需要某个组件/样式时：
  │
  ├─ 1. 项目内是否已有？ ──是──> 直接使用
  │         │
  │        否
  │         │
  ├─ 2. shadcn-admin 示例是否有类似实现？ ──是──> 参考其实现方式
  │         │
  │        否
  │         │
  └─ 3. 使用 shadcn/ui 默认组件，必要时扩展
```

## 端口配置

**前端端口: 3457** - 禁止随意更改

## 三种 UI 风格

项目支持 Mira/Lyra/Maia 三种风格切换，使用 `useStyleClasses()` Hook：

```tsx
import { useStyleClasses } from '@/lib/style-utils'

function MyComponent() {
  const s = useStyleClasses()

  return (
    <div className={cn(s.text.xs, s.height.control, s.rounded)}>
      内容
    </div>
  )
}
```

### 风格尺寸对比

| 属性 | Mira | Lyra | Maia |
|------|------|------|------|
| text.xs | text-xs | text-xs | text-sm |
| text.sm | text-xs | text-sm | text-base |
| text.base | text-sm | text-base | text-lg |
| height.control | h-8 | h-9 | h-11 |
| height.badge | h-5 | h-6 | h-6 |
| gap.tight | gap-1.5 | gap-2 | gap-4 |
| rounded | rounded-sm | rounded-none | rounded-lg |

## Sheet/抽屉组件规范

### 关闭按钮位置

**重要：Sheet 组件的关闭按钮必须放在 SheetHeader 内的标题旁边，而非默认的右上角位置。**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

<Sheet open={open} onOpenChange={onOpenChange}>
  {/*
    关键配置：
    1. p-0 移除默认内边距
    2. [&>button:last-child]:hidden 隐藏 Sheet 默认的关闭按钮
  */}
  <SheetContent className="w-full sm:max-w-md p-0 [&>button:last-child]:hidden">
    <SheetHeader className="px-4 py-3 border-b">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <SheetTitle>标题</SheetTitle>
          <SheetDescription>描述文本</SheetDescription>
        </div>
        {/* 自定义关闭按钮放在标题旁边 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">关闭</span>
        </Button>
      </div>
    </SheetHeader>

    {/* 内容区域 */}
  </SheetContent>
</Sheet>
```

### Sheet 宽度配置

```tsx
// 筛选抽屉 (窄)
className="w-full sm:max-w-md"

// 详情抽屉 (宽)
className="w-full sm:max-w-2xl md:max-w-[70%] lg:max-w-3xl xl:max-w-4xl"

// 编辑表单抽屉 (中等)
className="w-full sm:max-w-lg"
```

## Badge 状态样式

使用全局状态样式配置：

```tsx
import { getLeadStatusStyle, getIntentionLevelStyle, getFollowupResultStyle } from '@/lib/status-styles'

// 线索状态
const statusStyle = getLeadStatusStyle(lead.status)
<Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>

// 意向等级
const intentionStyle = getIntentionLevelStyle(lead.intention_level)
<Badge variant={intentionStyle.variant}>{intentionStyle.label}</Badge>

// 跟进结果
const resultStyle = getFollowupResultStyle(followup.result)
<Badge variant={resultStyle.variant}>{resultStyle.label}</Badge>
```

### Badge Variant 类型

```typescript
type BadgeVariant =
  | 'default'      // 主色
  | 'secondary'    // 次要色
  | 'destructive'  // 红色/危险
  | 'outline'      // 轮廓
  | 'success'      // 绿色/成功
  | 'warning'      // 黄色/警告
  | 'info'         // 蓝色/信息
  | 'purple'       // 紫色
```

## 日期选择器规范

**重要：禁止使用原生 `<input type="date">`，统一使用项目 DatePicker 组件**

```tsx
import { DatePicker, DateRangePicker, FormDatePicker } from '@/components/date-picker'

// 1. 基础日期选择器
<DatePicker
  selected={date}
  onSelect={setDate}
  placeholder="选择日期"
  dateFormat="yyyy/MM/dd"
/>

// 2. 日期范围选择 (用于筛选)
<DateRangePicker
  startDate={filters.created_from}
  endDate={filters.created_to}
  onStartDateChange={(date) => updateFilter('created_from', date)}
  onEndDateChange={(date) => updateFilter('created_to', date)}
  startPlaceholder="开始日期"
  endPlaceholder="结束日期"
/>

// 3. 表单日期选择 (兼容 react-hook-form)
<FormField
  control={form.control}
  name="birthday"
  render={({ field }) => (
    <FormItem>
      <FormLabel>生日</FormLabel>
      <FormControl>
        <FormDatePicker
          value={field.value}
          onChange={field.onChange}
          placeholder="选择生日"
          maxDate={new Date()}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

### DatePicker 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| selected | Date \| undefined | 选中的日期 |
| onSelect | (date: Date \| undefined) => void | 选择回调 |
| placeholder | string | 占位文本 |
| dateFormat | string | 日期格式 (默认 yyyy/MM/dd) |
| minDate | Date | 最小可选日期 |
| maxDate | Date | 最大可选日期 |
| disabled | boolean | 是否禁用 |
| fullWidth | boolean | 是否全宽 |

## 数据表格布局

使用 TanStack Table + TanStack Virtual 实现高性能虚拟滚动：

```tsx
// 表格容器必须有固定高度和 overflow-auto
<div className="flex flex-1 flex-col gap-4 overflow-hidden">
  <div ref={tableContainerRef} className="min-h-0 flex-1 overflow-auto rounded-md border">
    <Table>...</Table>
  </div>
  <SimplePagination ... />
</div>
```

## 数据表格骨架屏规范

**重要：所有数据表格在加载中状态必须使用骨架屏，禁止使用纯文本 "加载中..." 或 spinner**

### 行内骨架屏模式（推荐）

在表格列渲染器中检测骨架屏行并显示占位符：

```tsx
import {
  SKELETON_ID_PREFIX,
  isSkeletonRow,
  createSkeletonData,
  TextSkeleton,
  BadgeSkeleton
} from '@/components/ui/table-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

// 1. 生成骨架屏占位数据
const displayData = useMemo(() => {
  return isLoading ? createSkeletonData(pageSize) : data
}, [isLoading, data, pageSize])

// 2. 在列渲染器中检测并显示骨架屏
const columns = [
  {
    accessorKey: 'name',
    header: '姓名',
    cell: ({ row }) => {
      if (isSkeletonRow(row.original.id)) {
        return <Skeleton className="h-4 w-20" />
        // 或使用封装组件: return <TextSkeleton width={80} />
      }
      return row.original.name
    }
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      if (isSkeletonRow(row.original.id)) {
        return <Skeleton className="h-5 w-16 rounded-full" />
        // 或使用封装组件: return <BadgeSkeleton width={60} />
      }
      return <Badge>{row.original.status}</Badge>
    }
  }
]
```

### 骨架屏工具函数

```tsx
import {
  SKELETON_ID_PREFIX,     // 骨架屏 ID 前缀
  isSkeletonRow,          // 判断是否骨架屏行
  createSkeletonData,     // 生成骨架屏占位数据
  TextSkeleton,           // 文本骨架屏
  BadgeSkeleton,          // Badge 骨架屏
  AvatarSkeleton,         // 头像骨架屏
  TableSkeleton           // 完整表格骨架屏
} from '@/components/ui/table-skeleton'
```

### 骨架屏样式规范

| 元素类型 | 骨架屏样式 |
|---------|-----------|
| 普通文本 | `<Skeleton className="h-4 w-[70%]" />` |
| 状态标签 | `<Skeleton className="h-5 w-16 rounded-full" />` |
| 头像 | `<Skeleton className="h-8 w-8 rounded-full" />` |
| 按钮 | `<Skeleton className="h-8 w-20 rounded" />` |

### 加载状态容器样式

```tsx
// 表格容器在加载时添加半透明效果
<div className={cn(
  "overflow-auto rounded-md border",
  isLoading && "opacity-60 pointer-events-none"
)}>
  <Table>...</Table>
</div>
```

## 时间处理规范

**重要：后端返回的时间是 UTC 时间，前端显示时必须转换为本地时间**

使用 `@/lib/utils/time` 中的工具函数：

```tsx
import { formatTime, formatDate, formatRelativeTime } from '@/lib/utils/time'

// 完整时间: "2025/12/16 15:44"
formatTime(lead.created_at)

// 仅日期: "2025/12/16"
formatDate(lead.created_at)

// 相对时间: "3天前"
formatRelativeTime(lead.last_followup_at)
```

## 目录结构

```
src/
├── components/ui/     # shadcn/ui 基础组件
├── features/          # 功能模块 (按业务划分)
│   └── crm/leads/     # 线索管理模块
│       ├── components/  # 组件
│       ├── hooks/       # 自定义 Hooks
│       ├── api.ts       # API 接口
│       └── types.ts     # 类型定义
├── lib/               # 工具函数
│   ├── utils.ts       # 通用工具
│   ├── style-utils.ts # 风格工具
│   └── status-styles.ts # 状态样式
├── context/           # React Context
└── routes/            # 路由配置
```

## 开发命令

```bash
npm run dev         # 开发服务器 (端口3457)
npm run build       # 构建生产版本
npx tsc --noEmit    # 类型检查
```

## 常用组件导入

```tsx
// shadcn/ui 组件
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// 图标
import { Phone, Edit, Plus, X, Star } from 'lucide-react'

// 工具
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
```
