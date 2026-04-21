// 兼容桥：数据和算法已搬到后端。
// 此文件只 re-export 类型和 context 提供的辅助函数。
export type {
  School,
  SchoolType,
  SchoolColorType,
  District,
  Config,
  VolunteerAnalysis,
} from '../api'

export {
  useXiaoshengchuConfig,
  getSchoolsByDistrict,
  getSchoolColorType,
  getDistrictSchoolCount,
} from '../context'
