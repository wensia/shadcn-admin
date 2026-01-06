/**
 * Admin 管理后台 API
 * 从 frontend-vue/src/api/admin.ts 迁移
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  RegionItem,
  RegionCreate,
  RegionUpdate,
  DistrictItem,
  DistrictCreate,
  DistrictUpdate,
  AreaItem,
  AreaCreate,
  AreaUpdate,
  CampusItem,
  CampusCreate,
  CampusUpdate,
  SchoolItem,
  SchoolCreate,
  SchoolUpdate,
  SchoolBulkImportResult,
  DepartmentItem,
  DepartmentCreate,
  DepartmentUpdate,
  PositionItem,
  PositionCreate,
  PositionUpdate,
  EmployeeItem,
  EmployeeCreate,
  EmployeeUpdate,
  EmployeeYunkeUpdate,
  QuickCreateEmployeeData,
  QuickCreateEmployeeResult,
  EmployeeIdentityItem,
  EmployeeIdentityCreate,
  EmployeeIdentityUpdate,
  CampusDepartmentItem,
  CampusDepartmentCreate,
  CampusDepartmentUpdate,
  DepartmentManagerItem,
  DepartmentManagerCreate,
  OrganizationTreeNode,
  AdminStats,
  PaginatedResponse,
  ListQuery,
  SubordinateInfo,
  ManagementScope,
  EmployeeSubordinatesResponse,
  EmployeeHierarchyTreeResponse,
  YunkeLoginStatusResult,
  YunkeBatchLoginResult,
} from './types'

const BASE_URL = '/admin'

/**
 * Admin API 对象
 * 包含所有管理后台相关的 API 方法
 */
export const adminApi = {
  // ========================================================================
  // 大区管理
  // ========================================================================

  /** 获取大区列表 */
  async getRegions(params: ListQuery & { is_active?: boolean } = {}): Promise<ApiResponse<PaginatedResponse<RegionItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<RegionItem>>>(`${BASE_URL}/regions`, { params })
  },

  /** 创建大区 */
  async createRegion(data: RegionCreate): Promise<ApiResponse<RegionItem>> {
    return apiClient.post<ApiResponse<RegionItem>>(`${BASE_URL}/regions`, data)
  },

  /** 更新大区 */
  async updateRegion(id: string, data: RegionUpdate): Promise<ApiResponse<RegionItem>> {
    return apiClient.put<ApiResponse<RegionItem>>(`${BASE_URL}/regions/${id}`, data)
  },

  /** 删除大区 */
  async deleteRegion(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/regions/${id}`)
  },

  // ========================================================================
  // 地区管理
  // ========================================================================

  /** 获取地区列表 */
  async getDistricts(params: ListQuery & { region_id?: string } = {}): Promise<ApiResponse<PaginatedResponse<DistrictItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<DistrictItem>>>(`${BASE_URL}/districts`, { params })
  },

  /** 创建地区 */
  async createDistrict(data: DistrictCreate): Promise<ApiResponse<DistrictItem>> {
    return apiClient.post<ApiResponse<DistrictItem>>(`${BASE_URL}/districts`, data)
  },

  /** 更新地区 */
  async updateDistrict(id: string, data: DistrictUpdate): Promise<ApiResponse<DistrictItem>> {
    return apiClient.put<ApiResponse<DistrictItem>>(`${BASE_URL}/districts/${id}`, data)
  },

  /** 删除地区 */
  async deleteDistrict(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/districts/${id}`)
  },

  // ========================================================================
  // 区域管理
  // ========================================================================

  /** 获取区域列表 */
  async getAreas(params: ListQuery & { district_id?: string } = {}): Promise<ApiResponse<PaginatedResponse<AreaItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<AreaItem>>>(`${BASE_URL}/areas`, { params })
  },

  /** 创建区域 */
  async createArea(data: AreaCreate): Promise<ApiResponse<AreaItem>> {
    return apiClient.post<ApiResponse<AreaItem>>(`${BASE_URL}/areas`, data)
  },

  /** 更新区域 */
  async updateArea(id: string, data: AreaUpdate): Promise<ApiResponse<AreaItem>> {
    return apiClient.put<ApiResponse<AreaItem>>(`${BASE_URL}/areas/${id}`, data)
  },

  /** 删除区域 */
  async deleteArea(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/areas/${id}`)
  },

  // ========================================================================
  // 校区管理
  // ========================================================================

  /** 获取校区列表 */
  async getCampuses(params: ListQuery & { area_id?: string; is_area_office?: boolean } = {}): Promise<ApiResponse<PaginatedResponse<CampusItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<CampusItem>>>(`${BASE_URL}/campuses`, { params })
  },

  /** 创建校区 */
  async createCampus(data: CampusCreate): Promise<ApiResponse<CampusItem>> {
    return apiClient.post<ApiResponse<CampusItem>>(`${BASE_URL}/campuses`, data)
  },

  /** 更新校区 */
  async updateCampus(id: string, data: CampusUpdate): Promise<ApiResponse<CampusItem>> {
    return apiClient.put<ApiResponse<CampusItem>>(`${BASE_URL}/campuses/${id}`, data)
  },

  /** 删除校区 */
  async deleteCampus(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/campuses/${id}`)
  },

  // ========================================================================
  // 学校管理
  // ========================================================================

  /** 获取学校列表 */
  async getSchools(params: ListQuery & {
    province?: string
    city?: string
    district?: string
    grade_level?: string
  } = {}): Promise<ApiResponse<PaginatedResponse<SchoolItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<SchoolItem>>>(`${BASE_URL}/schools`, { params })
  },

  /** 创建学校 */
  async createSchool(data: SchoolCreate): Promise<ApiResponse<SchoolItem>> {
    return apiClient.post<ApiResponse<SchoolItem>>(`${BASE_URL}/schools`, data)
  },

  /** 更新学校 */
  async updateSchool(id: string, data: SchoolUpdate): Promise<ApiResponse<SchoolItem>> {
    return apiClient.put<ApiResponse<SchoolItem>>(`${BASE_URL}/schools/${id}`, data)
  },

  /** 批量导入学校 */
  async bulkImportSchools(data: { names: string[] }): Promise<ApiResponse<SchoolBulkImportResult>> {
    return apiClient.post<ApiResponse<SchoolBulkImportResult>>(`${BASE_URL}/schools/bulk-import`, data)
  },

  /** 删除学校 */
  async deleteSchool(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/schools/${id}`)
  },

  // ========================================================================
  // 部门管理
  // ========================================================================

  /** 获取部门列表 */
  async getDepartments(params: ListQuery = {}): Promise<ApiResponse<PaginatedResponse<DepartmentItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<DepartmentItem>>>(`${BASE_URL}/departments`, { params })
  },

  /** 获取部门简单列表（用于下拉选择） */
  async getDepartmentsSimple(): Promise<ApiResponse<DepartmentItem[]>> {
    return apiClient.get<ApiResponse<DepartmentItem[]>>('/organization/departments/simple')
  },

  /** 创建部门 */
  async createDepartment(data: DepartmentCreate): Promise<ApiResponse<DepartmentItem>> {
    return apiClient.post<ApiResponse<DepartmentItem>>(`${BASE_URL}/departments`, data)
  },

  /** 更新部门 */
  async updateDepartment(id: string, data: DepartmentUpdate): Promise<ApiResponse<DepartmentItem>> {
    return apiClient.put<ApiResponse<DepartmentItem>>(`${BASE_URL}/departments/${id}`, data)
  },

  /** 删除部门 */
  async deleteDepartment(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/departments/${id}`)
  },

  // ========================================================================
  // 职位管理
  // ========================================================================

  /** 获取职位列表 */
  async getPositions(params: ListQuery & { level?: number } = {}): Promise<ApiResponse<PaginatedResponse<PositionItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<PositionItem>>>(`${BASE_URL}/positions`, { params })
  },

  /** 创建职位 */
  async createPosition(data: PositionCreate): Promise<ApiResponse<PositionItem>> {
    return apiClient.post<ApiResponse<PositionItem>>(`${BASE_URL}/positions`, data)
  },

  /** 更新职位 */
  async updatePosition(id: string, data: PositionUpdate): Promise<ApiResponse<PositionItem>> {
    return apiClient.put<ApiResponse<PositionItem>>(`${BASE_URL}/positions/${id}`, data)
  },

  /** 删除职位 */
  async deletePosition(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/positions/${id}`)
  },

  // ========================================================================
  // 员工管理
  // ========================================================================

  /** 获取员工列表 */
  async getEmployees(params: ListQuery & {
    is_active?: boolean
    is_superuser?: boolean
    department_id?: string
    campus_id?: string
  } = {}): Promise<ApiResponse<PaginatedResponse<EmployeeItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<EmployeeItem>>>(`${BASE_URL}/employees`, { params })
  },

  /** 创建员工 */
  async createEmployee(data: EmployeeCreate): Promise<ApiResponse<EmployeeItem>> {
    return apiClient.post<ApiResponse<EmployeeItem>>(`${BASE_URL}/employees`, data)
  },

  /** 更新员工 */
  async updateEmployee(id: string, data: EmployeeUpdate): Promise<ApiResponse<EmployeeItem>> {
    return apiClient.put<ApiResponse<EmployeeItem>>(`${BASE_URL}/employees/${id}`, data)
  },

  /** 更新员工状态（在职/离职） */
  async updateEmployeeStatus(id: string, data: { is_active: boolean }): Promise<ApiResponse<{ id: string; is_active: boolean; updated_at?: string }>> {
    return apiClient.put<ApiResponse<{ id: string; is_active: boolean; updated_at?: string }>>(
      `${BASE_URL}/employees/${id}/status`,
      data
    )
  },

  /** 删除员工 */
  async deleteEmployee(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/employees/${id}`)
  },

  /** 更新员工的云客账号信息 */
  async updateEmployeeYunke(id: string, data: EmployeeYunkeUpdate): Promise<ApiResponse<{ id: string; yunke: unknown; updated_at: string }>> {
    return apiClient.put<ApiResponse<{ id: string; yunke: unknown; updated_at: string }>>(`${BASE_URL}/employees/${id}/yunke`, data)
  },

  /** 快速创建员工账号 */
  async quickCreateEmployee(data: QuickCreateEmployeeData): Promise<ApiResponse<QuickCreateEmployeeResult>> {
    return apiClient.post<ApiResponse<QuickCreateEmployeeResult>>('/employees/quick-create', data)
  },

  /** 重置员工密码 */
  async resetEmployeePassword(employeeId: string): Promise<ApiResponse<{
    employee_id: string
    username: string
    name: string
    new_password: string
    reset_at: string
  }>> {
    return apiClient.post<ApiResponse<{
      employee_id: string
      username: string
      name: string
      new_password: string
      reset_at: string
    }>>(`/employees/${employeeId}/reset-password`)
  },

  // ========================================================================
  // 员工身份管理
  // ========================================================================

  /** 获取员工身份列表 */
  async getEmployeeIdentities(params: ListQuery & {
    employee_id?: string
    employee_name?: string
    campus_id?: string
    department_id?: string
    is_primary?: boolean
    is_active?: boolean
  } = {}): Promise<ApiResponse<PaginatedResponse<EmployeeIdentityItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<EmployeeIdentityItem>>>(`${BASE_URL}/employee-identities`, { params })
  },

  /** 创建员工身份 */
  async createEmployeeIdentity(data: EmployeeIdentityCreate): Promise<ApiResponse<EmployeeIdentityItem>> {
    return apiClient.post<ApiResponse<EmployeeIdentityItem>>(`${BASE_URL}/employee-identities`, data)
  },

  /** 更新员工身份 */
  async updateEmployeeIdentity(id: string, data: EmployeeIdentityUpdate): Promise<ApiResponse<EmployeeIdentityItem>> {
    return apiClient.put<ApiResponse<EmployeeIdentityItem>>(`${BASE_URL}/employee-identities/${id}`, data)
  },

  /** 删除员工身份 */
  async deleteEmployeeIdentity(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/employee-identities/${id}`)
  },

  /** 批量更新员工身份 */
  async updateEmployeeIdentities(employeeId: string, identities: Array<{
    id?: string
    campus_id: string
    department_id: string
    position_id: string
    is_active: boolean
  }>): Promise<ApiResponse<void>> {
    return apiClient.put<ApiResponse<void>>(`${BASE_URL}/employees/${employeeId}/identities`, { identities })
  },

  // ========================================================================
  // 管理层级相关
  // ========================================================================

  /** 获取员工的直接下属 */
  async getDirectReports(employeeId: string, includeInactive = false): Promise<ApiResponse<EmployeeItem[]>> {
    return apiClient.get<ApiResponse<EmployeeItem[]>>(`${BASE_URL}/employees/${employeeId}/direct-reports`, {
      params: { include_inactive: includeInactive }
    })
  },

  /** 获取员工的所有下属（包括间接下属）- 完整信息 */
  async getEmployeeSubordinates(employeeId: string): Promise<ApiResponse<EmployeeSubordinatesResponse>> {
    return apiClient.get<ApiResponse<EmployeeSubordinatesResponse>>(`/organization/employees/${employeeId}/subordinates`)
  },

  /** 获取员工的所有下属ID列表（用于权限查询） */
  async getEmployeeSubordinateIds(employeeId: string): Promise<ApiResponse<{
    employee_id: string
    subordinate_ids: string[]
    count: number
  }>> {
    return apiClient.get<ApiResponse<{
      employee_id: string
      subordinate_ids: string[]
      count: number
    }>>(`/organization/employees/${employeeId}/subordinate-ids`)
  },

  /** 获取员工层级架构树（基于 reports_to 关系） */
  async getEmployeeHierarchyTree(): Promise<ApiResponse<EmployeeHierarchyTreeResponse>> {
    return apiClient.get<ApiResponse<EmployeeHierarchyTreeResponse>>('/organization/hierarchy/tree')
  },

  /** 获取当前用户的管理范围 */
  async getMyManagementScope(): Promise<ApiResponse<ManagementScope>> {
    return apiClient.get<ApiResponse<ManagementScope>>('/organization/employees/my-management-scope')
  },

  /** 获取员工的管理范围（旧接口，兼容） */
  async getManagementScope(employeeId: string): Promise<ApiResponse<ManagementScope>> {
    return apiClient.get<ApiResponse<ManagementScope>>(`${BASE_URL}/employees/${employeeId}/management-scope`)
  },

  /** 设置员工的直接上级 */
  async setEmployeeManager(employeeId: string, managerId: string | null): Promise<ApiResponse<EmployeeItem>> {
    return apiClient.put<ApiResponse<EmployeeItem>>(`${BASE_URL}/employees/${employeeId}/manager`, {
      manager_id: managerId
    })
  },

  /** 获取部门员工（包括管理者信息） */
  async getDepartmentEmployees(campusId: string, departmentId: string, includeInactive = false): Promise<ApiResponse<unknown>> {
    return apiClient.get<ApiResponse<unknown>>(`${BASE_URL}/departments/${campusId}/${departmentId}/employees`, {
      params: { include_inactive: includeInactive }
    })
  },

  /** 设置部门负责人 */
  async setDepartmentManager(campusId: string, departmentId: string, managerId: string | null, isDeputy = false): Promise<ApiResponse<unknown>> {
    return apiClient.put<ApiResponse<unknown>>(`${BASE_URL}/departments/${campusId}/${departmentId}/manager`, {
      manager_id: managerId,
      is_deputy: isDeputy
    })
  },

  // ========================================================================
  // 校区部门关联管理
  // ========================================================================

  /** 获取校区部门关联列表 */
  async getCampusDepartments(params: {
    campus_id?: string
    department_id?: string
    page?: number
    size?: number
  } = {}): Promise<ApiResponse<PaginatedResponse<CampusDepartmentItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<CampusDepartmentItem>>>(`${BASE_URL}/campus-departments`, { params })
  },

  /** 创建校区部门关联 */
  async createCampusDepartment(data: CampusDepartmentCreate): Promise<ApiResponse<CampusDepartmentItem>> {
    return apiClient.post<ApiResponse<CampusDepartmentItem>>(`${BASE_URL}/campus-departments`, data)
  },

  /** 更新校区部门关联 */
  async updateCampusDepartment(id: string, data: CampusDepartmentUpdate): Promise<ApiResponse<CampusDepartmentItem>> {
    return apiClient.put<ApiResponse<CampusDepartmentItem>>(`${BASE_URL}/campus-departments/${id}`, data)
  },

  /** 删除校区部门关联 */
  async deleteCampusDepartment(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${BASE_URL}/campus-departments/${id}`)
  },

  /** 批量创建校区部门关联 */
  async batchCreateCampusDepartments(data: {
    campus_id: string
    department_ids: string[]
  }): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(`${BASE_URL}/campus-departments/batch`, data)
  },

  // ========================================================================
  // 校区部门负责人管理
  // ========================================================================

  /** 获取校区部门负责人列表 */
  async getCampusDepartmentManagers(campusDepartmentId: string): Promise<ApiResponse<DepartmentManagerItem[]>> {
    return apiClient.get<ApiResponse<DepartmentManagerItem[]>>(
      `/organization/campus-departments/${campusDepartmentId}/managers`
    )
  },

  /** 添加校区部门负责人 */
  async addCampusDepartmentManager(
    campusDepartmentId: string,
    data: DepartmentManagerCreate
  ): Promise<ApiResponse<DepartmentManagerItem>> {
    return apiClient.post<ApiResponse<DepartmentManagerItem>>(
      `/organization/campus-departments/${campusDepartmentId}/managers`,
      data
    )
  },

  /** 移除校区部门负责人 */
  async removeCampusDepartmentManager(
    campusDepartmentId: string,
    managerId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(
      `/organization/campus-departments/${campusDepartmentId}/managers/${managerId}`
    )
  },

  // ========================================================================
  // 组织架构树和统计
  // ========================================================================

  /** 获取完整组织架构树 */
  async getOrganizationTree(): Promise<ApiResponse<OrganizationTreeNode[]>> {
    return apiClient.get<ApiResponse<OrganizationTreeNode[]>>(`${BASE_URL}/organization-tree`)
  },

  /** 获取系统统计信息 */
  async getStats(): Promise<ApiResponse<AdminStats>> {
    return apiClient.get<ApiResponse<AdminStats>>(`${BASE_URL}/stats`)
  },

  // ========================================================================
  // 组织架构快速选择API（用于快速创建员工）
  // ========================================================================

  /** 获取校区简单列表（用于快速选择） */
  async getCampusesSimple(): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    return apiClient.get<ApiResponse<Array<{ id: string; name: string }>>>('/organization/campuses/simple')
  },

  /** 获取校区部门简单列表（用于快速选择） */
  async getCampusDepartmentsSimple(campusId: string): Promise<ApiResponse<Array<{
    id: string
    name: string
    campus_department_id: string
  }>>> {
    return apiClient.get<ApiResponse<Array<{
      id: string
      name: string
      campus_department_id: string
    }>>>(`/organization/campuses/${campusId}/departments/simple`)
  },

  /** 获取校区部门职位简单列表（用于快速选择） */
  async getCampusDepartmentPositionsSimple(campusDepartmentId: string): Promise<ApiResponse<Array<{
    id: string
    name: string
    level: number
    level_display: string
  }>>> {
    return apiClient.get<ApiResponse<Array<{
      id: string
      name: string
      level: number
      level_display: string
    }>>>(`/organization/campus-departments/${campusDepartmentId}/positions/simple`)
  },

  // ========================================================================
  // 批量操作
  // ========================================================================

  /** 批量更新状态 */
  async batchUpdateStatus(entity: string, ids: string[], isActive: boolean): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(`${BASE_URL}/${entity}/batch-status`, {
      ids,
      is_active: isActive
    })
  },

  /** 批量删除 */
  async batchDelete(entity: string, ids: string[]): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(`${BASE_URL}/${entity}/batch-delete`, { ids })
  },

  // ========================================================================
  // 云客登录状态检查
  // ========================================================================

  /** 批量检查云客登录状态 */
  async checkYunkeLoginStatus(): Promise<ApiResponse<YunkeLoginStatusResult>> {
    return apiClient.get<ApiResponse<YunkeLoginStatusResult>>(`${BASE_URL}/yunke/check-login-status`)
  },

  /** 批量更新云客登录状态 */
  async batchUpdateYunkeLogin(): Promise<ApiResponse<YunkeBatchLoginResult>> {
    return apiClient.post<ApiResponse<YunkeBatchLoginResult>>(`${BASE_URL}/yunke/batch-login-update`)
  },
}

export default adminApi

// ============================================================================
// 来源渠道 API
// ============================================================================

import type {
  SourceChannel,
  DingtalkRobot,
  DingtalkRobotCreate,
  DingtalkRobotUpdate,
  DingtalkRobotTest,
  WebhookHook,
  WebhookHookCreate,
  WebhookHookUpdate,
  WebhookTriggerResponse,
  Course,
  CourseFormData,
  AdvisorAccessStatistics,
  AccessStatisticsSummary,
  AccessLog,
  UserAccessLimit,
  AccessStatsFilters,
  AccessLogFilters,
  BatchUpdateLimit,
  YunkeAdminStatus,
  YunkeAdminLoginResponse,
  YunkeSubAccount,
  YunkeAvailableEmployee,
  YunkePasswordResetResponse,
  YunkeBatchLoginResult,
  YunkeLoginStatusResult,
  EmployeeApiKeyInfo,
  ApiKeyCreate,
  ApiKeyCreateResponse,
  ApiKeyScopesUpdate,
} from './types'

export const sourceChannelApi = {
  /** 获取启用的来源渠道 */
  async getActiveChannels(category?: string): Promise<SourceChannel[]> {
    const params = category ? { category } : {}
    const response = await apiClient.get<ApiResponse<SourceChannel[]>>('/source-channels/active', { params })
    return response.data || []
  },

  /** 获取渠道详情 */
  async getChannelById(channelId: string): Promise<SourceChannel | undefined> {
    const response = await apiClient.get<ApiResponse<SourceChannel>>(`/source-channels/${channelId}`)
    return response.data
  },

  /** 获取分页的渠道列表 */
  async getChannelsPaginated(params?: {
    page?: number
    size?: number
    search?: string
    category?: string
    is_active?: boolean
    order_by?: string
    order_desc?: boolean
  }): Promise<{ items: SourceChannel[]; total: number; page: number; size: number } | undefined> {
    const response = await apiClient.get<ApiResponse<{
      items: SourceChannel[]
      total: number
      page: number
      size: number
    }>>('/source-channels', { params })
    return response.data
  },

  /** 创建来源渠道 */
  async createChannel(data: Partial<SourceChannel>): Promise<SourceChannel | undefined> {
    const response = await apiClient.post<ApiResponse<SourceChannel>>('/source-channels', data)
    return response.data
  },

  /** 更新来源渠道 */
  async updateChannel(id: string, data: Partial<SourceChannel>): Promise<SourceChannel | undefined> {
    const response = await apiClient.put<ApiResponse<SourceChannel>>(`/source-channels/${id}`, data)
    return response.data
  },

  /** 删除来源渠道 */
  async deleteChannel(id: string): Promise<void> {
    await apiClient.delete(`/source-channels/${id}`)
  },
}

// ============================================================================
// 钉钉机器人 API
// ============================================================================

export const dingtalkRobotsApi = {
  /** 获取钉钉机器人列表 */
  async list(params: {
    page?: number
    size?: number
    search?: string
    is_active?: boolean
    order_by?: 'name' | 'created_at' | 'updated_at' | 'sort_order'
    order_desc?: boolean
  } = {}): Promise<{ items: DingtalkRobot[]; total: number; page: number; size: number }> {
    return apiClient.get<{ items: DingtalkRobot[]; total: number; page: number; size: number }>('/dingtalk-robots', { params })
  },

  /** 获取所有启用的机器人 */
  async getActive(): Promise<DingtalkRobot[]> {
    return apiClient.get<DingtalkRobot[]>('/dingtalk-robots/active')
  },

  /** 创建钉钉机器人 */
  async create(data: DingtalkRobotCreate): Promise<DingtalkRobot> {
    return apiClient.post<DingtalkRobot>('/dingtalk-robots', data)
  },

  /** 获取钉钉机器人详情 */
  async get(id: string): Promise<DingtalkRobot> {
    return apiClient.get<DingtalkRobot>(`/dingtalk-robots/${id}`)
  },

  /** 更新钉钉机器人 */
  async update(id: string, data: DingtalkRobotUpdate): Promise<DingtalkRobot> {
    return apiClient.put<DingtalkRobot>(`/dingtalk-robots/${id}`, data)
  },

  /** 删除钉钉机器人 */
  async delete(id: string): Promise<boolean> {
    return apiClient.delete<boolean>(`/dingtalk-robots/${id}`)
  },

  /** 测试钉钉机器人 */
  async test(data: DingtalkRobotTest): Promise<boolean> {
    return apiClient.post<boolean>('/dingtalk-robots/test', data)
  },
}

// ============================================================================
// Webhook 钩子 API
// ============================================================================

export const webhookHooksApi = {
  /** 创建钩子 */
  async create(data: WebhookHookCreate): Promise<WebhookHook> {
    return apiClient.post<WebhookHook>('/webhook-hooks', data)
  },

  /** 更新钩子 */
  async update(id: string, data: WebhookHookUpdate): Promise<WebhookHook> {
    return apiClient.put<WebhookHook>(`/webhook-hooks/${id}`, data)
  },

  /** 获取钩子详情 */
  async get(id: string): Promise<WebhookHook> {
    return apiClient.get<WebhookHook>(`/webhook-hooks/${id}`)
  },

  /** 获取钩子列表 */
  async list(params?: { is_active?: boolean; search?: string }): Promise<{ items: WebhookHook[]; total: number }> {
    return apiClient.get<{ items: WebhookHook[]; total: number }>('/webhook-hooks', { params })
  },

  /** 删除钩子 */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/webhook-hooks/${id}`)
  },

  /** 测试钩子 */
  async test(id: string, data?: { test_data?: Record<string, unknown> }): Promise<WebhookTriggerResponse> {
    return apiClient.post<WebhookTriggerResponse>(
      `/webhook-hooks/${id}/test`,
      data || { test_data: {} }
    )
  },
}

// ============================================================================
// 课程 API
// ============================================================================

export const coursesApi = {
  /** 获取课程列表 */
  async getCourses(): Promise<Course[]> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Course>>>('/courses')
    return response.data?.items || []
  },

  /** 获取单个课程详情 */
  async getCourse(id: string): Promise<Course | undefined> {
    const response = await apiClient.get<ApiResponse<Course>>(`/courses/${id}`)
    return response.data
  },

  /** 创建课程 */
  async createCourse(data: CourseFormData): Promise<Course | undefined> {
    const response = await apiClient.post<ApiResponse<Course>>('/courses', data)
    if (!response.success) {
      throw new Error(response.message || '创建失败')
    }
    return response.data
  },

  /** 更新课程 */
  async updateCourse(id: string, data: CourseFormData): Promise<Course | undefined> {
    const response = await apiClient.put<ApiResponse<Course>>(`/courses/${id}`, data)
    if (!response.success) {
      throw new Error(response.message || '更新失败')
    }
    return response.data
  },

  /** 删除课程 */
  async deleteCourse(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/courses/${id}`)
    if (!response.success) {
      throw new Error(response.message || '删除失败')
    }
  },

  /** 批量启用课程 */
  async batchActivateCourses(ids: string[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/courses/batch-activate', { ids })
    if (!response.success) {
      throw new Error(response.message || '批量启用失败')
    }
  },

  /** 批量停用课程 */
  async batchDeactivateCourses(ids: string[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/courses/batch-deactivate', { ids })
    if (!response.success) {
      throw new Error(response.message || '批量停用失败')
    }
  },

  /** 批量删除课程 */
  async batchDeleteCourses(ids: string[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/courses/batch-delete', { ids })
    if (!response.success) {
      throw new Error(response.message || '批量删除失败')
    }
  },

  /** 复制课程 */
  async copyCourse(id: string): Promise<Course | undefined> {
    const response = await apiClient.post<ApiResponse<Course>>(`/courses/${id}/copy`)
    if (!response.success) {
      throw new Error(response.message || '复制失败')
    }
    return response.data
  },

  /** 初始化预设课程 */
  async initializePresetCourses(): Promise<Course[]> {
    const response = await apiClient.post<ApiResponse<Course[]>>('/courses/initialize-presets')
    if (!response.success) {
      throw new Error(response.message || '初始化预设失败')
    }
    return response.data || []
  },
}

// ============================================================================
// 线索访问统计 API
// ============================================================================

export const leadAccessStatsApi = {
  /** 获取顾问线索访问统计 */
  async getAdvisorStatistics(filters?: AccessStatsFilters): Promise<{
    statistics: AdvisorAccessStatistics[]
    summary: AccessStatisticsSummary
  }> {
    const params = new URLSearchParams()
    if (filters?.time_range) params.append('time_range', filters.time_range)
    if (filters?.campus_id) params.append('campus_id', filters.campus_id)
    if (filters?.area_id) params.append('area_id', filters.area_id)
    if (filters?.district_id) params.append('district_id', filters.district_id)
    if (filters?.region_id) params.append('region_id', filters.region_id)

    const url = params.toString()
      ? `/lead-access-stats/advisor-statistics?${params.toString()}`
      : '/lead-access-stats/advisor-statistics'

    const response = await apiClient.get<ApiResponse<{
      statistics: AdvisorAccessStatistics[]
      summary: AccessStatisticsSummary
    }>>(url)
    return response.data
  },

  /** 批量更新访问限制 */
  async batchUpdateAccessLimits(updates: BatchUpdateLimit[]): Promise<{ update_count: number }> {
    const response = await apiClient.put<ApiResponse<{ update_count: number }>>('/lead-access-stats/access-limits', updates)
    return response.data
  },

  /** 获取用户访问限制 */
  async getUserAccessLimit(userId: string): Promise<UserAccessLimit> {
    const response = await apiClient.get<ApiResponse<UserAccessLimit>>(`/lead-access-stats/user/${userId}/limit`)
    return response.data
  },

  /** 设置用户访问限制 */
  async setUserAccessLimit(userId: string, dailyLimit: number): Promise<UserAccessLimit> {
    const response = await apiClient.put<ApiResponse<UserAccessLimit>>(`/lead-access-stats/user/${userId}/limit`, dailyLimit)
    return response.data
  },

  /** 获取访问日志 */
  async getAccessLogs(filters?: AccessLogFilters): Promise<{
    items: AccessLog[]
    total: number
    page: number
    size: number
  }> {
    const params = new URLSearchParams()
    if (filters?.user_id) params.append('user_id', filters.user_id)
    if (filters?.lead_id) params.append('lead_id', filters.lead_id)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.campus_id) params.append('campus_id', filters.campus_id)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.size) params.append('size', filters.size.toString())

    const url = params.toString()
      ? `/lead-access-stats/access-logs?${params.toString()}`
      : '/lead-access-stats/access-logs'

    const response = await apiClient.get<ApiResponse<{
      items: AccessLog[]
      total: number
      page: number
      size: number
    }>>(url)
    return response.data
  },
}

// ============================================================================
// 云客管理员 API
// ============================================================================

export const yunkeAdminApi = {
  /** 云客管理员登录 */
  async login(data?: { phone?: string; password?: string }): Promise<YunkeAdminLoginResponse> {
    return apiClient.post<YunkeAdminLoginResponse>('/yunke/admin/login', data)
  },

  /** 获取云客管理员登录状态 */
  async getStatus(): Promise<YunkeAdminStatus> {
    return apiClient.get<YunkeAdminStatus>('/yunke/admin/status')
  },

  /** 云客管理员登出 */
  async logout(): Promise<{ cookies_cleared: boolean }> {
    return apiClient.post<{ cookies_cleared: boolean }>('/yunke/admin/logout')
  },

  /** 获取云客子账号列表 */
  async getSubAccounts(params?: {
    page?: number
    page_size?: number
    real_name?: string
    auth_status?: string
  }): Promise<{
    users: YunkeSubAccount[]
    total: number
    page: number
    page_size: number
  }> {
    return apiClient.post<{
      users: YunkeSubAccount[]
      total: number
      page: number
      page_size: number
    }>('/yunke/admin/sub-accounts', params)
  },

  /** 获取可绑定员工列表 */
  async getAvailableEmployees(): Promise<YunkeAvailableEmployee[]> {
    const response = await apiClient.get<ApiResponse<YunkeAvailableEmployee[]>>('/yunke/admin/available-employees')
    return response.data || []
  },

  /** 绑定员工 */
  async bindEmployee(data: {
    yunke_phone: string
    yunke_user_id: string
    employee_id: string
  }): Promise<{ success: boolean; message?: string }> {
    return apiClient.post<{ success: boolean; message?: string }>('/yunke/admin/bind-employee', data)
  },

  /** 解绑员工 */
  async unbindEmployee(data: { employee_id: string }): Promise<{ success: boolean; message?: string }> {
    return apiClient.post<{ success: boolean; message?: string }>('/yunke/admin/unbind-employee', data)
  },

  /** 重置密码 */
  async resetPassword(data: {
    yunke_user_id: string
    phone: string
  }): Promise<YunkePasswordResetResponse> {
    return apiClient.post<YunkePasswordResetResponse>('/yunke/auth/reset-password', data)
  },

  /** 自动同步绑定 */
  async autoSyncBindings(): Promise<{
    matched: number
    total: number
    details: Array<{
      yunke_name: string
      employee_name: string
      employee_username: string
    }>
  }> {
    return apiClient.post<{
      matched: number
      total: number
      details: Array<{
        yunke_name: string
        employee_name: string
        employee_username: string
      }>
    }>('/yunke/admin/auto-sync-bindings')
  },

  /** 检查所有登录状态 */
  async checkAllLoginStatus(): Promise<YunkeLoginStatusResult> {
    return apiClient.get<YunkeLoginStatusResult>('/yunke/admin/check-login-status')
  },

  /** 批量更新登录 */
  async batchUpdateLogin(): Promise<YunkeBatchLoginResult> {
    return apiClient.post<YunkeBatchLoginResult>('/yunke/admin/batch-update-login')
  },
}

// ============================================================================
// API 密钥管理 API
// ============================================================================

export const apiKeysApi = {
  /** 获取员工 API 密钥列表 */
  async list(params?: {
    page?: number
    size?: number
    search?: string
    has_api_key?: boolean
  }): Promise<{
    items: EmployeeApiKeyInfo[]
    total: number
    page: number
    size: number
  }> {
    return apiClient.get<{
      items: EmployeeApiKeyInfo[]
      total: number
      page: number
      size: number
    }>('/api-keys/employees', { params })
  },

  /** 获取指定员工的 API 密钥信息 */
  async get(employeeId: string): Promise<EmployeeApiKeyInfo> {
    return apiClient.get<EmployeeApiKeyInfo>(`/api-keys/employees/${employeeId}`)
  },

  /** 为员工创建 API 密钥 */
  async create(employeeId: string, data: ApiKeyCreate): Promise<ApiKeyCreateResponse> {
    return apiClient.post<ApiKeyCreateResponse>(`/api-keys/employees/${employeeId}`, data)
  },

  /** 重新生成员工的 API 密钥 */
  async regenerate(employeeId: string, name?: string): Promise<ApiKeyCreateResponse> {
    return apiClient.post<ApiKeyCreateResponse>(`/api-keys/employees/${employeeId}/regenerate`, { name })
  },

  /** 删除员工的 API 密钥 */
  async delete(employeeId: string): Promise<void> {
    return apiClient.delete(`/api-keys/employees/${employeeId}`)
  },

  /** 更新员工的 API 密钥权限范围 */
  async updateScopes(employeeId: string, data: ApiKeyScopesUpdate): Promise<EmployeeApiKeyInfo> {
    return apiClient.put<EmployeeApiKeyInfo>(`/api-keys/employees/${employeeId}/scopes`, data)
  },
}
