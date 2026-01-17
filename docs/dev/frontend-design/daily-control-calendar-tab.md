# 日控表 - 日历视图 Tab 设计方案

## 功能概述

为日控表页面添加一个"日历"Tab，以日历视图形式展示诺到、到访、缴费三种类型的记录，支持通过勾选筛选显示的数据类型。

## 参考实现

基于 `src/features/crm/workbench/components/calendar-tab/calendar-view.tsx` 的待回访日历视图进行改造。

## 设计详情

### 1. 布局结构

```
┌─────────────────────────────────────────────────────────────────┐
│  [Tab: 诺到] [Tab: 到访] [Tab: 缴费] [Tab: 日历]    [日期筛选器] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ 日历区域 (3/4 宽度) ────────────┐  ┌─ 详情列表 (1/4) ─────┐ │
│  │                                  │  │                      │ │
│  │  2025年 01月  [<] [>] [今天]     │  │  01月18日 周六       │ │
│  │                                  │  │  ──────────────────  │ │
│  │  ☑诺到 ☑到访 ☑缴费   (筛选器)    │  │                      │ │
│  │                                  │  │  [诺到] 张三 10:00   │ │
│  │  ┌────┬────┬────┬────┬────┐     │  │  体验课: 少儿编程    │ │
│  │  │ 一 │ 二 │ 三 │ 四 │... │     │  │  ──────────────────  │ │
│  │  ├────┼────┼────┼────┼────┤     │  │                      │ │
│  │  │ 1  │ 2  │ 3  │ 4  │... │     │  │  [到访] 李四 14:30   │ │
│  │  │    │ 🔵 │    │ 🟢 │    │     │  │  体验课: 美术        │ │
│  │  │    │ 2  │    │ 1  │    │     │  │  ──────────────────  │ │
│  │  ├────┼────┼────┼────┼────┤     │  │                      │ │
│  │  │    │    │    │    │    │     │  │  [缴费] 王五 ¥3000   │ │
│  │  │    │    │ 🟡 │    │    │     │  │  课程: 全年班        │ │
│  │  │    │    │ 1  │    │    │     │  │                      │ │
│  │  └────┴────┴────┴────┴────┘     │  │                      │ │
│  │                                  │  │                      │ │
│  └──────────────────────────────────┘  └──────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 数据类型与颜色标识

| 类型 | 颜色 | 说明 |
|------|------|------|
| 诺到 (scheduled) | 🔵 蓝色 `bg-blue-500` | 预约到访但未实际到访 |
| 到访 (visited) | 🟢 绿色 `bg-green-500` | 已实际到访 |
| 缴费 (payment) | 🟡 橙色/金色 `bg-amber-500` | 缴费记录 |

### 3. 组件结构

```
src/features/crm/daily-control/components/
├── calendar-tab/
│   ├── index.tsx              # 日历 Tab 主组件
│   ├── calendar-grid.tsx      # 日历网格组件
│   ├── event-filters.tsx      # 事件类型筛选器
│   ├── day-cell.tsx           # 日期单元格组件
│   └── event-detail-list.tsx  # 右侧事件详情列表
```

### 4. 核心接口定义

```typescript
// 日历事件类型
type CalendarEventType = 'scheduled' | 'visited' | 'payment'

// 统一的日历事件结构
interface CalendarEvent {
  id: string
  type: CalendarEventType
  date: string           // YYYY-MM-DD
  time?: string          // HH:mm
  // 线索信息
  lead_id: string
  child_name?: string
  parent_phone?: string
  // 类型特有字段
  trial_course?: string   // 诺到/到访的体验课程
  trial_teacher?: string  // 体验课讲师
  amount?: number         // 缴费金额
  course_name?: string    // 缴费课程名称
  status?: string         // 状态
  remark?: string
}

// 筛选状态
interface EventFilters {
  scheduled: boolean  // 显示诺到
  visited: boolean    // 显示到访
  payment: boolean    // 显示缴费
}
```

### 5. API 调用

复用现有 API，并行获取三种数据：

```typescript
// 获取诺到记录 (status=scheduled)
visitScheduleApi.getVisitSchedules({ status: 'scheduled', date_from, date_to })

// 获取到访记录 (status=visited)
visitScheduleApi.getVisitSchedules({ status: 'visited', date_from, date_to })

// 获取缴费记录
paymentApi.getPayments({ date_from, date_to })
```

### 6. 日期单元格显示规则

每个日期格子内显示：
1. **日期数字** - 今天用主色圆形背景标记
2. **事件计数徽章** - 分颜色显示各类型数量
3. **事件条目** - 最多显示 3 条，超出显示"还有 N 条"

```
┌─────────────────┐
│ 18              │  ← 日期
│ 🔵2 🟢1 🟡1     │  ← 各类型计数
│ ────────────────│
│ 10:00 张三      │  ← 诺到事件 (蓝色条)
│ 14:30 李四      │  ← 到访事件 (绿色条)
│ ¥3000 王五      │  ← 缴费事件 (橙色条)
└─────────────────┘
```

### 7. 右侧详情列表

选中某一天后，右侧显示该日期的所有事件详情：

- **诺到卡片**：学生姓名、预约时间、体验课程、讲师、状态
- **到访卡片**：学生姓名、到访时间、体验课程、状态
- **缴费卡片**：学生姓名、缴费金额、课程名称、支付方式

### 8. 筛选器交互

```tsx
<div className="flex items-center gap-4">
  <label className="flex items-center gap-2 cursor-pointer">
    <Checkbox checked={filters.scheduled} onCheckedChange={...} />
    <span className="flex items-center gap-1">
      <div className="w-3 h-3 rounded-full bg-blue-500" />
      诺到
    </span>
  </label>
  <label className="flex items-center gap-2 cursor-pointer">
    <Checkbox checked={filters.visited} onCheckedChange={...} />
    <span className="flex items-center gap-1">
      <div className="w-3 h-3 rounded-full bg-green-500" />
      到访
    </span>
  </label>
  <label className="flex items-center gap-2 cursor-pointer">
    <Checkbox checked={filters.payment} onCheckedChange={...} />
    <span className="flex items-center gap-1">
      <div className="w-3 h-3 rounded-full bg-amber-500" />
      缴费
    </span>
  </label>
</div>
```

### 9. 状态管理

```typescript
const [currentMonth, setCurrentMonth] = useState(new Date())
const [selectedDate, setSelectedDate] = useState(new Date())
const [filters, setFilters] = useState<EventFilters>({
  scheduled: true,
  visited: true,
  payment: true,
})
```

### 10. 性能优化

1. **数据缓存**：使用 React Query 缓存数据，避免切换 Tab 时重复请求
2. **按需加载**：只加载当前月份 ±1 月的数据
3. **useMemo 优化**：
   - 日历日期数组计算
   - 事件按日期分组
   - 筛选后的事件列表

### 11. 实现步骤

1. 创建 `CalendarTab` 组件文件结构
2. 实现筛选器组件 `EventFilters`
3. 实现日历网格 `CalendarGrid`，复用 calendar-view.tsx 的基础结构
4. 实现日期单元格 `DayCell`，支持多类型事件显示
5. 实现详情列表 `EventDetailList`
6. 在 `daily-control-page.tsx` 中添加日历 Tab
7. 集成 API 调用和数据处理

### 12. 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `daily-control-page.tsx` | 修改 | 添加日历 Tab |
| `components/calendar-tab/index.tsx` | 新建 | 日历 Tab 主组件 |
| `components/calendar-tab/event-filters.tsx` | 新建 | 事件筛选器 |
| `components/calendar-tab/calendar-grid.tsx` | 新建 | 日历网格 |
| `components/calendar-tab/day-cell.tsx` | 新建 | 日期单元格 |
| `components/calendar-tab/event-detail-list.tsx` | 新建 | 详情列表 |
