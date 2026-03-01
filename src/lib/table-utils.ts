/**
 * 表格工具函数
 * 骨架屏占位数据生成、判断等通用工具
 */

import { Skeleton } from '@douyinfe/semi-ui-19'
import { createElement } from 'react'

/**
 * 骨架屏 ID 前缀
 * 用于标识骨架屏占位数据
 */
export const SKELETON_ID_PREFIX = '__skeleton__'

/**
 * 判断是否是骨架屏行
 */
export function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

/**
 * 生成骨架屏占位数据
 * @param count 生成的行数
 * @param factory 可选的工厂函数，用于生成符合表格类型的占位数据
 */
export function createSkeletonData<T extends { id: string }>(
  count: number,
  factory?: (index: number) => Omit<T, 'id'>
): T[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    ...(factory ? factory(i) : {})
  })) as T[]
}

/**
 * 通用骨架屏单元格组件
 * 用于表格加载状态时显示占位内容
 */
export function SemiSkeletonCell({ width = '70%' }: { width?: string | number }) {
  return createElement(Skeleton.Paragraph, {
    rows: 1,
    style: { width, height: 16 },
    loading: true,
  })
}
