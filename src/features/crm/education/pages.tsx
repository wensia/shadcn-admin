import { EducationListPage } from './education-list-page'
import type { EducationFieldConfig, EducationOption, EducationPageConfig } from './types'

const activeStatusOptions: EducationOption[] = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
]

const studentStatusOptions: EducationOption[] = [
  { label: '在读', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '结业', value: 'graduated' },
  { label: '已退费', value: 'refunded' },
]

const classStatusOptions: EducationOption[] = [
  { label: '计划中', value: 'planned' },
  { label: '开课中', value: 'active' },
  { label: '已结班', value: 'finished' },
  { label: '已取消', value: 'cancelled' },
]

const lessonStatusOptions: EducationOption[] = [
  { label: '已排课', value: 'scheduled' },
  { label: '已消课', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const attendanceStatusOptions: EducationOption[] = [
  { label: '到课', value: 'attended' },
  { label: '请假', value: 'leave' },
  { label: '缺勤', value: 'absent' },
  { label: '取消', value: 'cancelled' },
]

const balanceStatusOptions: EducationOption[] = [
  { label: '可用', value: 'active' },
  { label: '冻结', value: 'frozen' },
  { label: '已耗尽', value: 'exhausted' },
  { label: '已退费', value: 'refunded' },
]

const settlementStatusOptions: EducationOption[] = [
  { label: '已生成', value: 'generated' },
  { label: '已确认', value: 'confirmed' },
  { label: '已支付', value: 'paid' },
  { label: '已取消', value: 'cancelled' },
]

const teachingModeOptions: EducationOption[] = [
  { label: '一对一', value: 'one_on_one' },
  { label: '小班', value: 'small_group' },
  { label: '班课', value: 'class_group' },
]

const baseSystemFields: EducationFieldConfig[] = [
  { key: 'created_at', title: '创建时间', kind: 'date', datetime: true, width: 180, hiddenInForm: true },
  { key: 'updated_at', title: '更新时间', kind: 'date', datetime: true, width: 180, hiddenInForm: true },
]

const educationPageConfigs = {
  students: {
    domain: 'students',
    title: '学员管理',
    documentTitle: '学员管理',
    emptyText: '暂无学员',
    primaryField: 'name',
    searchPlaceholder: '搜索姓名、手机号、学校',
    createText: '新建学员',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    statusOptions: studentStatusOptions,
    fields: [
      { key: 'name', title: '学员姓名', required: true, primary: true, width: 140 },
      { key: 'primary_phone', title: '主联系电话', width: 150 },
      { key: 'grade', title: '年级', width: 100 },
      { key: 'school_name', title: '学校', width: 180 },
      { key: 'gender', title: '性别', width: 90 },
      { key: 'birthday', title: '生日', kind: 'date', width: 130 },
      { key: 'campus_id', title: '校区ID', width: 220, ellipsis: true },
      { key: 'status', title: '状态', kind: 'select', options: studentStatusOptions, width: 100 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  parents: {
    domain: 'parents',
    title: '家长管理',
    documentTitle: '家长管理',
    emptyText: '暂无家长',
    primaryField: 'phone',
    searchPlaceholder: '搜索家长姓名、手机号、微信',
    createText: '新建家长',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    fields: [
      { key: 'name', title: '家长姓名', primary: true, width: 140 },
      { key: 'phone', title: '手机号', required: true, width: 150 },
      { key: 'wechat', title: '微信', width: 150 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  teachers: {
    domain: 'teachers',
    title: '老师管理',
    documentTitle: '老师管理',
    emptyText: '暂无老师',
    primaryField: 'display_name',
    searchPlaceholder: '搜索老师姓名、手机号',
    createText: '新建老师',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    statusOptions: activeStatusOptions,
    fields: [
      { key: 'display_name', title: '老师姓名', required: true, primary: true, width: 140 },
      { key: 'phone', title: '手机号', width: 150 },
      { key: 'employee_id', title: '员工ID', width: 220, ellipsis: true },
      { key: 'campus_id', title: '校区ID', width: 220, ellipsis: true },
      { key: 'default_hourly_rate', title: '默认课时费', kind: 'number', money: true, width: 130 },
      { key: 'status', title: '状态', kind: 'select', options: activeStatusOptions, width: 100 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  courses: {
    domain: 'course-products',
    title: '课程产品',
    documentTitle: '课程产品',
    emptyText: '暂无课程产品',
    primaryField: 'name',
    searchPlaceholder: '搜索课程名称、科目',
    createText: '新建课程',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    fields: [
      { key: 'name', title: '课程名称', required: true, primary: true, width: 180 },
      { key: 'subject', title: '科目', width: 110 },
      { key: 'teaching_mode', title: '教学形态', kind: 'select', options: teachingModeOptions, width: 120 },
      { key: 'default_hours', title: '默认课时', kind: 'number', width: 120 },
      { key: 'default_unit_price', title: '默认单价', kind: 'number', money: true, width: 130 },
      { key: 'default_teacher_fee_rate', title: '默认课时费', kind: 'number', money: true, width: 130 },
      { key: 'source_course_id', title: 'CRM课程ID', width: 220, ellipsis: true },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  packages: {
    domain: 'packages',
    title: '课程课包',
    documentTitle: '课程课包',
    emptyText: '暂无课包',
    primaryField: 'name',
    searchPlaceholder: '搜索课包名称',
    createText: '新建课包',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    fields: [
      { key: 'name', title: '课包名称', required: true, primary: true, width: 180 },
      { key: 'course_product_id', title: '课程产品ID', required: true, width: 220, ellipsis: true },
      { key: 'total_hours', title: '总课时', kind: 'number', width: 110 },
      { key: 'gifted_hours', title: '赠送课时', kind: 'number', width: 110 },
      { key: 'list_price', title: '标价', kind: 'number', money: true, width: 130 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  classes: {
    domain: 'classes',
    title: '班级管理',
    documentTitle: '班级管理',
    emptyText: '暂无班级',
    primaryField: 'name',
    searchPlaceholder: '搜索班级名称',
    createText: '新建班级',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    statusOptions: classStatusOptions,
    fields: [
      { key: 'name', title: '班级名称', required: true, primary: true, width: 180 },
      { key: 'course_product_id', title: '课程产品ID', required: true, width: 220, ellipsis: true },
      { key: 'teacher_id', title: '默认老师ID', width: 220, ellipsis: true },
      { key: 'campus_id', title: '校区ID', width: 220, ellipsis: true },
      { key: 'teaching_mode', title: '教学形态', kind: 'select', options: teachingModeOptions, width: 120 },
      { key: 'status', title: '状态', kind: 'select', options: classStatusOptions, width: 110 },
      { key: 'start_date', title: '开班日期', kind: 'date', width: 130 },
      { key: 'end_date', title: '结班日期', kind: 'date', width: 130 },
      { key: 'capacity', title: '容量', kind: 'number', width: 90 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  lessons: {
    domain: 'lessons',
    title: '排课管理',
    documentTitle: '排课管理',
    emptyText: '暂无排课',
    primaryField: 'topic',
    searchPlaceholder: '搜索主题、教室',
    createText: '新增排课',
    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    statusOptions: lessonStatusOptions,
    fields: [
      { key: 'topic', title: '课次主题', primary: true, width: 180 },
      { key: 'class_group_id', title: '班级ID', required: true, width: 220, ellipsis: true },
      { key: 'course_product_id', title: '课程产品ID', required: true, width: 220, ellipsis: true },
      { key: 'teacher_id', title: '老师ID', required: true, width: 220, ellipsis: true },
      { key: 'start_at', title: '开始时间', kind: 'date', datetime: true, required: true, width: 180 },
      { key: 'end_at', title: '结束时间', kind: 'date', datetime: true, required: true, width: 180 },
      { key: 'planned_hours', title: '计划课时', kind: 'number', width: 110 },
      { key: 'room', title: '教室', width: 120 },
      { key: 'status', title: '状态', kind: 'select', options: lessonStatusOptions, width: 110 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  consumption: {
    domain: 'consumption',
    title: '消课管理',
    documentTitle: '消课管理',
    emptyText: '暂无消课记录',
    primaryField: 'lesson_id',
    searchPlaceholder: '搜索点名记录',
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    statusOptions: attendanceStatusOptions,
    fields: [
      { key: 'lesson_id', title: '课次ID', primary: true, width: 220, ellipsis: true },
      { key: 'student_id', title: '学员ID', width: 220, ellipsis: true },
      { key: 'balance_account_id', title: '课时账户ID', width: 220, ellipsis: true },
      { key: 'status', title: '考勤状态', kind: 'select', options: attendanceStatusOptions, width: 110 },
      { key: 'consumed_hours', title: '实扣课时', kind: 'number', width: 110 },
      { key: 'confirmed_at', title: '确认时间', kind: 'date', datetime: true, width: 180 },
      { key: 'reversed_at', title: '撤销时间', kind: 'date', datetime: true, width: 180 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
  balances: {
    domain: 'balances',
    title: '课时余额',
    documentTitle: '课时余额',
    emptyText: '暂无课时账户',
    primaryField: 'account_name',
    searchPlaceholder: '搜索账户名称',
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    statusOptions: balanceStatusOptions,
    fields: [
      { key: 'account_name', title: '账户名称', primary: true, width: 180 },
      { key: 'student_id', title: '学员ID', width: 220, ellipsis: true },
      { key: 'course_product_id', title: '课程产品ID', width: 220, ellipsis: true },
      { key: 'total_hours', title: '总课时', kind: 'number', width: 110 },
      { key: 'remaining_hours', title: '剩余课时', kind: 'number', width: 110 },
      { key: 'gifted_hours', title: '赠送课时', kind: 'number', width: 110 },
      { key: 'paid_amount', title: '实收金额', kind: 'number', money: true, width: 130 },
      { key: 'status', title: '状态', kind: 'select', options: balanceStatusOptions, width: 110 },
      { key: 'activated_at', title: '激活时间', kind: 'date', datetime: true, width: 180 },
      ...baseSystemFields,
    ],
  },
  finance: {
    domain: 'finance',
    title: '收费管理',
    documentTitle: '收费管理',
    emptyText: '暂无课时流水',
    primaryField: 'transaction_type',
    searchPlaceholder: '搜索流水原因',
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    fields: [
      { key: 'transaction_type', title: '流水类型', primary: true, width: 120 },
      { key: 'direction', title: '方向', width: 90 },
      { key: 'student_id', title: '学员ID', width: 220, ellipsis: true },
      { key: 'balance_account_id', title: '账户ID', width: 220, ellipsis: true },
      { key: 'hours_delta', title: '课时变化', kind: 'number', width: 110 },
      { key: 'amount_delta', title: '金额变化', kind: 'number', money: true, width: 130 },
      { key: 'balance_before', title: '变动前', kind: 'number', width: 100 },
      { key: 'balance_after', title: '变动后', kind: 'number', width: 100 },
      { key: 'reason', title: '原因', width: 220 },
      ...baseSystemFields,
    ],
  },
  teacherSettlements: {
    domain: 'teacher-settlements',
    title: '老师结算',
    documentTitle: '老师结算',
    emptyText: '暂无结算单',
    primaryField: 'settlement_month',
    searchPlaceholder: '搜索结算月份',
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    statusOptions: settlementStatusOptions,
    fields: [
      { key: 'settlement_month', title: '结算月份', primary: true, width: 120 },
      { key: 'teacher_id', title: '老师ID', width: 220, ellipsis: true },
      { key: 'total_hours', title: '总课时', kind: 'number', width: 110 },
      { key: 'total_amount', title: '总金额', kind: 'number', money: true, width: 130 },
      { key: 'status', title: '状态', kind: 'select', options: settlementStatusOptions, width: 110 },
      { key: 'generated_at', title: '生成时间', kind: 'date', datetime: true, width: 180 },
      { key: 'confirmed_at', title: '确认时间', kind: 'date', datetime: true, width: 180 },
      { key: 'paid_at', title: '支付时间', kind: 'date', datetime: true, width: 180 },
      { key: 'remark', title: '备注', kind: 'textarea', width: 220 },
      ...baseSystemFields,
    ],
  },
} satisfies Record<string, EducationPageConfig>

export function StudentsPage() {
  return <EducationListPage config={educationPageConfigs.students} />
}

export function ParentsPage() {
  return <EducationListPage config={educationPageConfigs.parents} />
}

export function TeachersPage() {
  return <EducationListPage config={educationPageConfigs.teachers} />
}

export function CourseProductsPage() {
  return <EducationListPage config={educationPageConfigs.courses} />
}

export function CoursePackagesPage() {
  return <EducationListPage config={educationPageConfigs.packages} />
}

export function ClassGroupsPage() {
  return <EducationListPage config={educationPageConfigs.classes} />
}

export function LessonsPage() {
  return <EducationListPage config={educationPageConfigs.lessons} />
}

export function ConsumptionPage() {
  return <EducationListPage config={educationPageConfigs.consumption} />
}

export function BalancesPage() {
  return <EducationListPage config={educationPageConfigs.balances} />
}

export function EducationFinancePage() {
  return <EducationListPage config={educationPageConfigs.finance} />
}

export function TeacherSettlementsPage() {
  return <EducationListPage config={educationPageConfigs.teacherSettlements} />
}
