# Leads页面 Mira风格应用总结

本文档总结了Leads页面中Mira风格的应用情况。

## Mira风格核心原则

- **密集型设计**: 优化高信息密度界面
- **紧凑间距**: 减少不必要的留白
- **小字号**: 使用text-xs作为主要字体
- **适用场景**: 数据表格、企业软件

## 各组件应用情况

### 1. leads-page.tsx (主页面)

✅ **间距优化**
- 页面容器: `p-4` (16px)
- 页面标题下间距: `mb-4`
- 筛选标签栏: `gap-1.5`, `pb-3`

✅ **字体优化**
- 页面标题: `text-xl` (20px, 从text-3xl优化)
- 副标题: `text-xs` (12px)
- 筛选标签文字: `text-xs`

✅ **视觉元素**
- 筛选Badge: `h-6`, `px-2`, `text-xs`
- 清除按钮: `h-6`, `px-2`, `text-xs`

---

### 2. leads-toolbar.tsx (工具栏)

✅ **布局密度**
- 工具栏容器: `space-y-3`, `pb-3` (双行布局,紧凑间距)
- 组件间距: `gap-1.5`

✅ **搜索和筛选**
- 搜索框: `h-8`, `pl-8`, `text-xs`
- 状态筛选: `h-8`, `w-[140px]`, `text-xs`
- 搜索图标: `h-3.5 w-3.5`

✅ **按钮优化**
- 所有按钮: `h-8`, `text-xs`
- 图标: `h-3.5 w-3.5`
- 图标间距: `mr-1.5`
- 刷新按钮: `h-8 w-8 p-0` (仅图标)

✅ **下拉菜单**
- DropdownMenuItem: `text-xs`

---

### 3. leads-table.tsx (数据表格)

✅ **表格结构**
- 表格容器: `rounded-sm border`
- 行高: `estimateSize: 44` (虚拟滚动,紧凑行高)
- 单元格内边距: `py-1.5 px-2`

✅ **字体系统**
- 表头: `text-xs font-semibold`, `h-9`
- 单元格内容: `text-xs`
- 所有文本: `text-xs`

✅ **Badge组件**
- 状态Badge: `h-5 px-1.5 text-xs`
- 意向等级Badge: `h-5 px-1.5 text-xs`

✅ **分页器**
- 使用SimplePagination组件
- 按钮高度: `h-7`
- 图标大小: `h-3.5 w-3.5`
- 间距: `gap-0.5`, `gap-1.5`

---

### 4. lead-detail-sheet.tsx (详情抽屉)

✅ **Sheet结构**
- 宽度: `sm:max-w-2xl` (中等宽度,Mira风格)
- Header: `px-4 py-3`, `text-base`, `text-xs`

✅ **标签页**
- TabsList: `h-9 p-0 px-4`
- TabsTrigger: `h-8 text-xs`

✅ **内容区域**
- ScrollArea: `h-[calc(100vh-180px)]`
- 内容容器: `p-4`
- 节标题: `text-sm font-semibold` (合理的层级区分)
- 字段标签: `text-xs text-muted-foreground`
- 字段值: `text-xs`

✅ **Badge和按钮**
- Badge: `h-5 px-1.5 text-xs`
- 按钮: `h-7 text-xs`
- 图标: `h-3.5 w-3.5`

---

### 5. lead-form-dialog.tsx (创建/编辑表单)

✅ **Dialog结构**
- 宽度: `sm:max-w-3xl`
- Header: `px-4 py-3 border-b`
- 标题: `text-base`
- 描述: `text-xs`

✅ **表单字段**
- 输入框: `h-8 text-xs`
- 标签: `text-xs font-semibold`
- Select: `h-8 text-xs`
- Textarea: `text-xs`
- 节标题: `text-sm font-semibold` (合理的层级区分)

✅ **布局间距**
- ScrollArea: `h-[calc(100vh-240px)]`
- 表单容器: `p-4 space-y-4`
- 表单分组: `space-y-3`
- 字段间距: `space-y-2`

✅ **Footer**
- 按钮: `h-8 text-xs`
- 间距: `px-4 py-3 border-t gap-2`

---

### 6. filter-sheet.tsx (高级筛选)

✅ **Sheet结构**
- 宽度: `w-full sm:max-w-md`
- Header: `px-4 py-3 border-b`
- 标题: `text-base`
- 描述: `text-xs`

✅ **筛选字段**
- 标签: `text-xs font-semibold`
- Select: `h-8 text-xs`
- Input: `h-8 text-xs`
- Badge: `h-5 text-xs`

✅ **布局优化**
- ScrollArea: `h-[calc(100vh-130px)]`
- 内容区: `p-4 space-y-4`
- 字段容器: `space-y-2`

✅ **Footer**
- 按钮: `h-8 text-xs flex-1`
- 间距: `px-4 py-3 border-t gap-2`

---

### 7. batch-dialogs.tsx (批量操作)

✅ **Dialog结构**
- 宽度: `sm:max-w-md p-0`
- Header: `px-4 py-3 border-b`, `text-base`, `text-xs`

✅ **表单元素**
- 标签: `text-xs font-semibold`
- Select: `h-8 text-xs`
- Textarea: `text-xs resize-none`
- 内容区: `p-4 space-y-3`

✅ **Footer**
- 按钮: `h-8 text-xs`
- 间距: `px-4 py-3 border-t gap-2`

---

### 8. simple-pagination.tsx (分页组件)

✅ **整体设计**
- 记录统计: `text-xs text-muted-foreground`
- 组件间距: `gap-1.5`

✅ **每页条数选择器**
- Select: `h-7 w-[65px] text-xs`
- 文字: `text-xs`

✅ **页码控件**
- 按钮: `h-7 w-7 p-0 text-xs`
- 图标: `h-3.5 w-3.5`
- 按钮间距: `gap-0.5`
- 省略号: `px-1.5 text-xs`

✅ **响应式设计**
- 移动端简化显示
- 隐藏首页/末页按钮
- 页码信息简化

---

## Mira风格设计规范总结

### 间距系统
| 用途 | 类名 | 像素值 |
|------|------|--------|
| 页面外边距 | `p-4` | 16px |
| 组件间距(小) | `gap-1.5` | 6px |
| 组件间距(中) | `gap-2` | 8px |
| 组件间距(大) | `gap-3` | 12px |
| 卡片内边距 | `p-3`, `p-4` | 12px, 16px |
| 表格单元格 | `py-1.5 px-2` | 6px 8px |
| Header/Footer | `px-4 py-3` | 16px 12px |

### 字体系统
| 用途 | 类名 | 像素值 |
|------|------|--------|
| 页面主标题 | `text-xl` | 20px |
| 节标题 | `text-sm` | 14px |
| 普通文本 | `text-xs` | 12px |
| 辅助文本 | `text-xs text-muted-foreground` | 12px |

### 高度系统
| 元素 | 类名 | 像素值 |
|------|------|--------|
| 小按钮 | `h-6` | 24px |
| 紧凑按钮/输入框 | `h-7` | 28px |
| 标准按钮/输入框 | `h-8` | 32px |
| 表头/Tab | `h-9` | 36px |
| 小Badge | `h-5` | 20px |
| 标准Badge | `h-6` | 24px |

### 圆角系统
| 用途 | 类名 | 像素值 |
|------|------|--------|
| 表格容器 | `rounded-sm` | 2px |
| 按钮/输入框 | shadcn默认 | 通常4-6px |
| 卡片 | `rounded-sm` | 2px |

### 图标系统
| 用途 | 类名 | 像素值 |
|------|------|--------|
| 小图标 | `h-3 w-3` | 12px |
| 标准图标 | `h-3.5 w-3.5` | 14px |
| 较大图标 | `h-4 w-4` | 16px |

---

## 优化成果

### 信息密度提升
- 表格行高从默认52px优化为44px,提升15%显示容量
- 紧凑间距设计,单屏可显示更多数据
- 小字体应用,视觉信息密度提升

### 视觉一致性
- 所有组件应用统一的Mira风格规范
- 间距、字体、高度系统化管理
- 圆角、图标尺寸保持一致

### 用户体验
- 保持良好的可读性和可用性
- 合理的层级区分(标题vs正文)
- 响应式设计,移动端友好

---

## 实施完成度

✅ **Phase 1**: 核心组件 (100%)
- 线索详情Sheet
- 创建/编辑Dialog
- 高级筛选Sheet
- 批量操作Dialogs

✅ **Phase 2**: 交互优化 (100%)
- 搜索和状态筛选
- 筛选条件标签栏
- SimplePagination分页器

✅ **Phase 3**: Mira风格深化 (100%)
- 全局间距优化
- 字体系统统一
- 圆角规范应用
- 视觉一致性检查

---

## 后续建议

1. **性能优化**
   - 搜索框添加防抖(debounce)
   - 优化虚拟滚动性能
   - 考虑使用React.memo减少重渲染

2. **功能增强**
   - 添加键盘快捷键支持
   - 优化加载状态显示
   - 考虑添加数据导入功能

3. **可访问性**
   - 确保所有交互元素有适当的aria标签
   - 键盘导航优化
   - 颜色对比度检查

4. **测试覆盖**
   - 单元测试
   - 集成测试
   - E2E测试

---

*文档生成时间: 2025-12-18*
*Mira风格应用: 完成*
