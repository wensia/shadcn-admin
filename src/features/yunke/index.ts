/**
 * 云客模块公共导出
 */

// API
export { yunkeApi } from './api'

// 类型
export type {
  YunkeAdminStatus,
  YunkeAdminLoginResponse,
  YunkeSubAccount,
  YunkeAvailableEmployee,
  YunkePasswordResetResponse,
  YunkeBatchLoginResult,
  YunkeLoginStatusResult,
  YunkeAutoSyncResult,
  YunkeCallRecord,
  YunkeDashboardStats,
} from './types'

// 页面组件
export {
  YunkeDashboardPage,
  YunkeAccountsPage,
  YunkeLoginStatusPage,
  YunkeCallRecordsPage,
} from './pages'
