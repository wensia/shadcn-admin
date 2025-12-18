# Leads页面功能测试和性能优化

## 功能测试清单

### 1. 数据展示测试

#### 1.1 表格显示
- [ ] 表格正确加载和显示数据
- [ ] 虚拟滚动正常工作(测试1000+条数据)
- [ ] 所有列正确显示对应字段
- [ ] Badge状态颜色正确显示
- [ ] 时间格式化正确
- [ ] 空数据处理正确(显示"-")

#### 1.2 分页功能
- [ ] 分页器正确显示总页数
- [ ] 上一页/下一页按钮功能正常
- [ ] 首页/末页按钮功能正常
- [ ] 页码按钮点击跳转正常
- [ ] 每页条数切换正常(10/20/50/100/200)
- [ ] 分页时保持筛选条件
- [ ] 边界情况:第1页禁用上一页,最后一页禁用下一页

### 2. 搜索和筛选测试

#### 2.1 快速搜索
- [ ] 搜索框输入即时触发查询
- [ ] 搜索姓名功能正常
- [ ] 搜索手机号功能正常
- [ ] 清空搜索框恢复全部数据
- [ ] 搜索时重置到第1页

#### 2.2 状态快捷筛选
- [ ] 状态下拉框显示所有状态
- [ ] 选择状态后正确筛选
- [ ] "全部状态"清除状态筛选
- [ ] 状态筛选时重置到第1页

#### 2.3 高级筛选
- [ ] 高级筛选Sheet正常打开/关闭
- [ ] 所有筛选字段正确加载(来源渠道、顾问、创建人等)
- [ ] 多条件组合筛选正常工作
- [ ] 时间范围筛选正常
- [ ] 应用筛选后数据正确
- [ ] 重置筛选功能正常
- [ ] 筛选条件计数Badge正确显示

#### 2.4 筛选条件标签栏
- [ ] 激活筛选条件显示为Badge
- [ ] 点击X移除单个筛选条件
- [ ] 清除全部按钮功能正常
- [ ] 无筛选时标签栏隐藏
- [ ] 标签显示内容正确

### 3. 数据操作测试

#### 3.1 新建线索
- [ ] 新建按钮打开Dialog
- [ ] 所有必填字段验证正常
- [ ] 手机号格式验证
- [ ] 手机号重复检查功能
- [ ] 来源渠道动态字段加载
- [ ] 地区级联选择正常
- [ ] 提交成功后刷新列表
- [ ] 提交成功显示Toast提示
- [ ] 取消按钮关闭Dialog

#### 3.2 编辑线索
- [ ] 点击行打开详情Sheet
- [ ] 详情Sheet显示完整信息
- [ ] 编辑按钮打开表单Dialog
- [ ] 表单预填充现有数据
- [ ] 修改后保存成功
- [ ] 保存后详情Sheet更新
- [ ] 保存后列表数据更新

#### 3.3 线索详情
- [ ] 详情Sheet正确加载数据
- [ ] 4个Tab正常切换(基本信息、跟进记录、信息变更、归属变更)
- [ ] 跟进记录分页加载
- [ ] 信息变更记录显示
- [ ] 归属变更记录显示
- [ ] 外呼按钮功能(如有实现)
- [ ] 新建跟进按钮功能(如有实现)
- [ ] 关闭Sheet功能正常

### 4. 批量操作测试

#### 4.1 行选择
- [ ] 复选框选择/取消选择正常
- [ ] 全选功能正常
- [ ] 选中数统计正确显示
- [ ] 选中后批量操作按钮显示

#### 4.2 批量分配
- [ ] 批量分配Dialog打开
- [ ] 顾问列表正确加载
- [ ] 选择顾问后提交成功
- [ ] 提交后刷新列表
- [ ] 提交后清空选择
- [ ] 取消按钮关闭Dialog

#### 4.3 批量释放
- [ ] 批量释放Dialog打开
- [ ] 释放理由选择正常
- [ ] 备注输入正常
- [ ] 提交成功后刷新列表
- [ ] 提交后清空选择

#### 4.4 批量修改状态
- [ ] 批量修改状态Dialog打开
- [ ] 状态列表正确显示
- [ ] 修改成功后刷新列表
- [ ] 提交后清空选择

#### 4.5 批量删除
- [ ] 批量删除确认Dialog打开
- [ ] 显示删除数量
- [ ] 确认删除后数据移除
- [ ] 提交后刷新列表
- [ ] 提交后清空选择

### 5. 其他功能测试

#### 5.1 刷新功能
- [ ] 刷新按钮重新加载数据
- [ ] 刷新后保持当前页和筛选条件
- [ ] 刷新成功显示Toast

#### 5.2 导出功能
- [ ] 导出按钮触发下载
- [ ] 导出文件格式正确(.xlsx)
- [ ] 导出数据包含当前筛选条件
- [ ] 导出成功显示Toast
- [ ] 导出失败显示错误提示

### 6. UI/UX测试

#### 6.1 响应式设计
- [ ] 桌面端(1920x1080)显示正常
- [ ] 笔记本(1366x768)显示正常
- [ ] 平板端显示适配
- [ ] 移动端显示适配

#### 6.2 加载状态
- [ ] 数据加载时显示loading
- [ ] 详情Sheet加载状态
- [ ] 按钮提交时显示loading状态
- [ ] 防止重复提交

#### 6.3 错误处理
- [ ] API错误显示Toast提示
- [ ] 网络错误提示友好
- [ ] 表单验证错误提示清晰

---

## 性能优化

### 已实施的优化

#### 1. 虚拟滚动 ✅
- 使用TanStack Virtual实现
- 估算行高:44px
- 过扫描数:10行
- 性能提升:支持1000+条数据流畅滚动

#### 2. 数据缓存 ✅
- 使用TanStack Query
- 自动缓存和重验证
- 减少不必要的API请求

#### 3. 组件优化 ✅
- useMemo缓存表格列定义
- 避免不必要的重新计算

### 待实施的优化

#### 1. 搜索防抖 🔄
**优先级:高**

当前问题:搜索框每次输入都触发API请求

优化方案:
```typescript
import { useDebouncedValue } from '@/hooks/use-debounced-value'

// 在leads-page.tsx中
const [searchValue, setSearchValue] = useState('')
const debouncedSearch = useDebouncedValue(searchValue, 500)

// 在useQuery中使用debouncedSearch而不是searchValue
const { data, isLoading } = useQuery({
  queryKey: ['leads', pagination, filters, debouncedSearch, statusFilter],
  // ...
})
```

预期效果:减少API请求,提升性能和用户体验

#### 2. React.memo优化 🔄
**优先级:中**

优化以下组件:
```typescript
// leads-table.tsx中的单元格组件
const StatusBadge = React.memo(({ status }: { status: LeadStatus }) => (
  <Badge variant={getStatusVariant(status)}>
    {leadStatusLabels[status]}
  </Badge>
))

// 减少不必要的重渲染
```

#### 3. 懒加载组件 🔄
**优先级:中**

当前:所有Dialog/Sheet组件都在首次渲染时加载

优化方案:
```typescript
import { lazy, Suspense } from 'react'

// 懒加载大型组件
const LeadDetailSheet = lazy(() => import('./components/lead-detail-sheet'))
const LeadFormDialog = lazy(() => import('./components/lead-form-dialog'))

// 使用Suspense包裹
<Suspense fallback={<LoadingSpinner />}>
  <LeadDetailSheet ... />
</Suspense>
```

预期效果:减少首次加载时间

#### 4. 分页数据预加载 🔄
**优先级:低**

优化方案:
```typescript
// 预加载下一页数据
useQuery({
  queryKey: ['leads', { ...params, page: page + 1 }],
  queryFn: () => leadsApi.getLeads({ ...params, page: page + 1 }),
  enabled: page < totalPages,
  staleTime: 30000 // 30秒内不重新请求
})
```

预期效果:用户翻页时即时显示数据

#### 5. 图片懒加载 🔄
**优先级:低**(如果有头像等图片)

使用Intersection Observer API实现图片懒加载

---

## 性能监控

### 关键指标

1. **首次内容渲染(FCP)**
   - 目标:< 1.5s
   - 监控工具:Chrome DevTools, Lighthouse

2. **最大内容渲染(LCP)**
   - 目标:< 2.5s
   - 优化:虚拟滚动、代码分割

3. **首次输入延迟(FID)**
   - 目标:< 100ms
   - 优化:防抖、节流

4. **累积布局偏移(CLS)**
   - 目标:< 0.1
   - 优化:固定容器高度

### 性能测试工具

1. **Chrome DevTools Performance**
   - 录制用户交互
   - 分析渲染性能
   - 查找性能瓶颈

2. **React DevTools Profiler**
   - 分析组件渲染时间
   - 查找不必要的重渲染
   - 优化组件结构

3. **Lighthouse**
   - 综合性能评分
   - 最佳实践建议
   - 可访问性检查

---

## 测试建议

### 1. 单元测试
使用Vitest + React Testing Library

```typescript
// leads-table.test.tsx
describe('LeadsTable', () => {
  it('should render table with data', () => {
    render(<LeadsTable data={mockData} ... />)
    expect(screen.getByText('儿童姓名')).toBeInTheDocument()
  })

  it('should handle row selection', () => {
    const onSelectionChange = vi.fn()
    render(<LeadsTable onSelectionChange={onSelectionChange} ... />)
    // 测试选择逻辑
  })
})
```

### 2. 集成测试
测试组件间交互

```typescript
// leads-page.test.tsx
describe('LeadsPage Integration', () => {
  it('should open detail sheet when clicking row', async () => {
    render(<LeadsPage />)
    const row = screen.getByText('张三')
    await userEvent.click(row)
    expect(screen.getByText('线索详情')).toBeVisible()
  })
})
```

### 3. E2E测试
使用Playwright

```typescript
// leads.spec.ts
test('create new lead', async ({ page }) => {
  await page.goto('/crm/leads')
  await page.click('text=新建线索')
  await page.fill('[name="child_name"]', '测试儿童')
  await page.click('text=保存')
  await expect(page.locator('text=创建成功')).toBeVisible()
})
```

---

## 代码质量检查

### ESLint规则
- [ ] 无unused variables
- [ ] 无console.log(生产环境)
- [ ] 正确的TypeScript类型
- [ ] 遵循React Hooks规则

### 类型安全
- [ ] 所有组件Props有完整类型定义
- [ ] API响应有类型定义
- [ ] 无any类型(除非必要)

### 代码风格
- [ ] 统一的命名规范
- [ ] 适当的注释
- [ ] 函数复杂度控制
- [ ] 文件长度合理(<500行)

---

## 后续优化建议

1. **添加搜索防抖**(立即实施)
2. **React.memo优化**(1周内)
3. **组件懒加载**(2周内)
4. **编写单元测试**(持续)
5. **E2E测试覆盖**(1个月内)
6. **性能监控集成**(长期)

---

*文档生成时间: 2025-12-18*
*状态: 待测试*
