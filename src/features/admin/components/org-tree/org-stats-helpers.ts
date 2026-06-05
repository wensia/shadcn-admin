/**
 * 组织架构树的统计与定位工具函数
 *
 * 从 org-tree-stats.tsx 抽离出来以满足 Vite Fast Refresh 的
 * "组件文件不应导出非组件" 约束。
 */
import type { OrganizationTreeNode } from '../../types'

export interface OrgStats {
  region_count: number
  district_count: number
  area_count: number
  campus_count: number
  area_office_count: number
  department_count: number
  employee_count: number
  leader_count: number
  missing_leader_count: number
}

export function getVisibleMissingSingletonRoles(node: OrganizationTreeNode): string[] {
  const missing = node.missing_singleton_roles ?? []
  if (missing.length === 0) return []

  // 空人数节点不提示未任命，避免空部门、空校区及其上级产生噪声告警。
  const employeeCount = node.employee_count ?? 0
  return employeeCount > 0 ? missing : []
}

export function hasVisibleMissingSingletonRoles(node: OrganizationTreeNode): boolean {
  return getVisibleMissingSingletonRoles(node).length > 0
}

function walk(
  nodes: OrganizationTreeNode[],
  acc: OrgStats,
  seenCampusIds: Set<string>,
): void {
  for (const n of nodes) {
    switch (n.type) {
      case 'region':
        acc.region_count += 1
        break
      case 'district':
        acc.district_count += 1
        break
      case 'area':
        acc.area_count += 1
        break
      case 'area_office':
        acc.area_office_count += 1
        if (n.employee_count && !seenCampusIds.has(n.id)) {
          acc.employee_count += n.employee_count
          seenCampusIds.add(n.id)
        }
        break
      case 'campus':
        acc.campus_count += 1
        if (n.employee_count && !seenCampusIds.has(n.id)) {
          acc.employee_count += n.employee_count
          seenCampusIds.add(n.id)
        }
        break
      case 'campus_department':
      case 'area_department':
      case 'district_department':
        acc.department_count += 1
        break
    }
    acc.leader_count += n.leaders?.length ?? 0
    acc.missing_leader_count += getVisibleMissingSingletonRoles(n).length
    if (n.children?.length) {
      walk(n.children, acc, seenCampusIds)
    }
  }
}

export function computeOrgStats(tree: OrganizationTreeNode[]): OrgStats {
  const acc: OrgStats = {
    region_count: 0,
    district_count: 0,
    area_count: 0,
    campus_count: 0,
    area_office_count: 0,
    department_count: 0,
    employee_count: 0,
    leader_count: 0,
    missing_leader_count: 0,
  }
  walk(tree, acc, new Set())
  return acc
}

/**
 * 定位第一个还有未任命岗位的节点（DFS 顺序，与树渲染顺序一致）。
 */
export function findFirstMissingNode(
  nodes: OrganizationTreeNode[],
): OrganizationTreeNode | null {
  for (const n of nodes) {
    if (hasVisibleMissingSingletonRoles(n)) return n
    if (n.children?.length) {
      const r = findFirstMissingNode(n.children)
      if (r) return r
    }
  }
  return null
}

/**
 * 给定目标节点 id，返回其所有祖先节点 id（不含自身）。
 * 用于跳转到深层节点时展开必要分支。
 */
export function findAncestorIds(
  nodes: OrganizationTreeNode[],
  targetId: string,
): string[] {
  function search(list: OrganizationTreeNode[], path: string[]): string[] | null {
    for (const n of list) {
      if (n.id === targetId) return path
      if (n.children?.length) {
        const r = search(n.children, [...path, n.id])
        if (r) return r
      }
    }
    return null
  }
  return search(nodes, []) ?? []
}
