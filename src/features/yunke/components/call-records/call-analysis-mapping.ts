export type CallAnalysisTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

type LabelMap = Record<string, string>

const stageLabels: LabelMap = {
  S00_INVALID: '无效通话',
  S01_FIRST_CONTACT: '首访建联',
  S02_FIRST_DIAGNOSIS: '首访学情诊断',
  S03_LEAD_REACTIVATION: '沉默线索唤醒',
  S04_GENERAL_FOLLOW_UP: '常规跟进',
  S05_APPOINTMENT_INVITATION: '邀约到店/测评/试听/咨询',
  S06_APPOINTMENT_CONFIRMATION: '预约确认/到访提醒/改约',
  S07_AFTER_TEST_OR_TRIAL_FEEDBACK: '测评/试听/体验后反馈',
  S08_PLAN_AND_QUOTATION: '方案沟通/报价',
  S09_CLOSING_OR_PRESSURE: '压单/成交促进',
  S10_PAYMENT_COLLECTION: '缴费/催缴',
  S11_PRE_CLASS_SERVICE: '开课前服务/排课确认',
  S12_IN_CLASS_SERVICE: '课中服务/学习反馈',
  S13_RENEWAL_EXPANSION_REFERRAL: '续费/扩科/转介绍',
  S14_COMPLAINT_REFUND_RETENTION: '投诉/退费/挽回',
  S15_LOST_OR_DO_NOT_CONTACT: '流失/拒绝/勿扰',
}

const dealStatusLabels: LabelMap = {
  NEW_LEAD_UNQUALIFIED: '新线索未有效了解需求',
  QUALIFIED_NEED_FOUND: '已识别需求未预约',
  APPOINTMENT_PROPOSED: '已提出邀约未确认',
  APPOINTMENT_CONFIRMED: '已确认到访/测评/试听',
  ATTENDED_PENDING_FEEDBACK: '已到访/测评/试听待反馈',
  PLAN_PROPOSED: '已给出课程方案',
  DECISION_PENDING: '客户考虑中',
  PAYMENT_PENDING: '待付款',
  PARTIAL_PAYMENT: '已付定金/部分款',
  DEAL_CLOSED: '已成交',
  IN_SERVICE: '已在读服务中',
  RENEWAL_OPPORTUNITY: '存在续费/扩科机会',
  LOST: '已流失',
  DO_NOT_CONTACT: '明确勿扰',
  COMPLAINT_OR_REFUND: '投诉/退费处理中',
  UNKNOWN: '未知',
}

const intentLabels: LabelMap = {
  A_STRONG: '强意向',
  B_MEDIUM: '中意向',
  C_WEAK: '弱意向',
  D_LOW: '低意向',
  X_INVALID: '无效',
}

const refusalTypeLabels: LabelMap = {
  EXPLICIT_DO_NOT_CONTACT: '明确勿扰',
  STRONG_REFUSAL_WITHOUT_OPT_OUT: '强拒绝但未明确勿扰',
  SOFT_REFUSAL_OR_DELAY: '软拒绝/暂缓',
  NO_ANSWER_OR_SILENT: '未接通/沉默/失联',
  NONE: '无拒绝',
  UNKNOWN: '未知',
}

const nextStepQualityLabels: LabelMap = {
  CLEAR_CONFIRMED: '明确且客户确认',
  CLEAR_PROPOSED: '顾问提出明确动作',
  VAGUE: '下一步模糊',
  NONE: '没有下一步',
  UNKNOWN: '未知',
}

const requiredLevelLabels: LabelMap = {
  MUST: '必做',
  SHOULD: '建议',
}

const riskLevelLabels: LabelMap = {
  CRITICAL: '严重风险',
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
  NONE: '无风险',
}

const pressureLevelLabels: LabelMap = {
  NONE: '无',
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
}

const riskCodeLabels: LabelMap = {
  GUARANTEE_RESULT: '保证效果/升学/提分',
  MINOR_DIRECT_MARKETING: '直接向未成年人营销',
  FALSE_ENDORSEMENT: '虚假背书/冒充官方',
  PRIVACY_SOURCE_DISPUTE: '信息来源/隐私争议处理不当',
  EXPLICIT_DO_NOT_CONTACT_IGNORED: '明确勿扰后继续营销',
  EXCESSIVE_FOLLOWUP_WITHOUT_BOUNDARY: '无边界高频跟进',
  HIGH_PRESSURE_SALES: '强压成交/过度制造紧迫',
  FALSE_SCARCITY: '虚假稀缺/不明名额压力',
  ANXIETY_MARKETING: '焦虑营销/羞辱客户',
  PRICE_REFUND_AMBIGUITY: '价格/优惠/退费/合同表达不清',
  MISLEADING_PRODUCT: '课程产品误导',
  POOR_SERVICE_HANDLING: '投诉/退费处理不当',
  OVER_PROMISING_TEACHER: '过度承诺老师能力',
  DATA_ACCURACY_RISK: 'CRM 信息记录或转述不准确',
}

const actionLabels: LabelMap = {
  INTRODUCE_IDENTITY: '说明机构/顾问身份',
  EXPLAIN_CALL_REASON: '说明来电原因',
  EXPLAIN_LEAD_SOURCE: '说明信息来源',
  CHECK_CONVENIENCE: '确认是否方便沟通',
  CONFIRM_ANSWERER_ROLE: '确认接听人身份',
  TRANSFER_TO_PARENT: '转接家长/监护人',
  CONFIRM_PARENT_PERMISSION: '确认监护人同意沟通',
  HANDLE_SOURCE_QUESTION: '回应信息来源疑问',
  COLLECT_GRADE: '确认年级',
  COLLECT_SCHOOL_STAGE: '确认学校阶段',
  COLLECT_SCHOOL_NAME: '确认学校名称',
  COLLECT_SUBJECT: '确认关注科目',
  COLLECT_SCORE: '确认当前成绩/水平',
  COLLECT_TARGET_SCORE: '确认目标成绩',
  COLLECT_EXAM_NODE: '确认考试节点',
  COLLECT_PAIN_POINT: '确认具体薄弱点',
  COLLECT_LEARNING_HABIT: '了解学习习惯',
  COLLECT_HOMEWORK_STATUS: '了解作业情况',
  COLLECT_PHONE_USAGE: '了解手机影响',
  COLLECT_CHILD_ATTITUDE: '了解孩子意愿',
  COLLECT_PARENT_EXPECTATION: '了解家长期望',
  COLLECT_EXISTING_TRAINING: '了解是否已报课',
  COLLECT_DECISION_MAKER: '确认决策人',
  COLLECT_TIME_AVAILABILITY: '确认时间安排',
  COLLECT_BUDGET_SENSITIVITY: '识别预算/价格敏感度',
  ADD_WECHAT: '添加微信',
  PROPOSE_ADD_WECHAT: '提出添加微信',
  CONFIRM_WECHAT_EXISTING: '确认已有微信',
  SEND_INFO_BY_WECHAT: '微信发送资料',
  SET_NEXT_CALLBACK_TIME: '约定下次回访时间',
  CREATE_FOLLOWUP_TASK: '创建跟进任务',
  CHECK_SUSTAINABLE_TOUCHPOINT: '确认可持续触达方式',
  EXPLAIN_TEST_VALUE: '说明测评价值',
  EXPLAIN_TRIAL_VALUE: '说明试听价值',
  EXPLAIN_VISIT_VALUE: '说明到校咨询价值',
  PROPOSE_APPOINTMENT: '提出邀约',
  CONFIRM_APPOINTMENT_TIME: '确认预约时间',
  CONFIRM_APPOINTMENT_LOCATION: '确认预约地点/线上方式',
  CONFIRM_ATTENDEE: '确认参与人',
  SEND_LOCATION: '发送校区位置',
  REMIND_VISIT: '提醒到访',
  RESCHEDULE_APPOINTMENT: '改约',
  CONFIRM_APPOINTMENT_STATUS: '确认是否能到访',
  EXPLAIN_VISIT_PROCESS: '说明到访流程',
  CONFIRM_MATERIALS_TO_BRING: '说明需携带资料',
  REPORT_TEST_RESULT: '反馈测评结果',
  REPORT_TRIAL_RESULT: '反馈试听结果',
  EXPLAIN_SPECIFIC_WEAKNESS: '指出具体薄弱点',
  EXPLAIN_WEAKNESS_REASON: '解释问题原因',
  EXPLAIN_COURSE_PLAN: '说明课程方案',
  EXPLAIN_PLAN_REASON: '说明方案匹配原因',
  EXPLAIN_CLASS_TYPE: '说明课型',
  EXPLAIN_FREQUENCY: '说明上课频次',
  EXPLAIN_CLASS_HOURS: '说明课时/周期',
  EXPLAIN_PRICE: '说明价格',
  EXPLAIN_DISCOUNT: '说明优惠',
  EXPLAIN_CONTRACT: '说明合同',
  EXPLAIN_REFUND_RULE: '说明退费规则',
  IDENTIFY_FINAL_OBJECTION: '识别最终异议',
  HANDLE_OBJECTION: '处理异议',
  CONFIRM_DECISION_TIME: '确认决策时间',
  CONFIRM_DECISION_MAKER_PRESENT: '确认决策人在场/参与',
  AVOID_GUARANTEE_PROMISE: '避免保证效果',
  AVOID_ANXIETY_PRESSURE: '避免焦虑营销/强压',
  CONFIRM_PAYMENT_AMOUNT: '确认付款金额',
  CONFIRM_PAYMENT_TYPE: '确认付款类型',
  CONFIRM_PAYMENT_DEADLINE: '确认付款截止时间',
  CONFIRM_PAYMENT_METHOD: '确认付款方式',
  SEND_PAYMENT_LINK: '发送付款链接',
  CONFIRM_PAYMENT_STATUS: '确认付款状态',
  EXPLAIN_AFTER_PAYMENT_ARRANGEMENT: '说明付款后安排',
  CONFIRM_INVOICE_NEED: '确认发票需求',
  CONFIRM_RECEIPT_OR_CONTRACT: '确认收据/合同',
  CONFIRM_CLASS_TIME: '确认上课时间',
  CONFIRM_TEACHER: '确认老师',
  CONFIRM_CLASS_LOCATION: '确认上课地点/线上入口',
  CONFIRM_MATERIALS: '确认教材资料',
  CREATE_SERVICE_GROUP: '建立服务群',
  CONFIRM_SERVICE_OWNER: '确认服务负责人',
  SET_FIRST_CLASS_FEEDBACK: '设置首课反馈',
  GIVE_CLASS_FEEDBACK: '反馈课堂表现',
  GIVE_HOMEWORK_FEEDBACK: '反馈作业情况',
  GIVE_PROGRESS_FEEDBACK: '反馈阶段进步',
  GIVE_PARENT_SUPPORT_ADVICE: '给家长配合建议',
  COLLECT_PARENT_FEEDBACK: '收集家长反馈',
  SET_NEXT_FEEDBACK_TIME: '设置下次反馈时间',
  IDENTIFY_RENEWAL_OPPORTUNITY: '识别续费机会',
  IDENTIFY_EXPANSION_OPPORTUNITY: '识别扩科机会',
  REVIEW_LEARNING_PROGRESS: '回顾学习进度',
  EXPLAIN_REMAINING_HOURS: '说明剩余课时',
  EXPLAIN_NEXT_STAGE_PLAN: '说明下一阶段规划',
  EXPLAIN_RENEWAL_REASON: '说明续费原因',
  EXPLAIN_EXPANSION_REASON: '说明扩科原因',
  ASK_REFERRAL: '提出转介绍',
  CONFIRM_RENEWAL_INTENT: '确认续费意向',
  CONFIRM_EXPANSION_INTENT: '确认扩科意向',
  SOOTHE_CUSTOMER: '安抚客户',
  REPEAT_CUSTOMER_ISSUE: '复述客户问题/上次重点',
  RECORD_COMPLAINT_FACTS: '记录投诉事实',
  ASSIGN_HANDLER: '明确处理负责人',
  CONFIRM_RESOLUTION_DEADLINE: '明确处理时限',
  PROPOSE_REMEDY: '提出补救方案',
  ESCALATE_COMPLAINT: '升级投诉',
  FOLLOW_REFUND_PROCESS: '跟进退费流程',
  CONFIRM_LOST_REASON: '确认流失原因',
  MARK_DO_NOT_CONTACT: '标记勿扰',
  STOP_CONTACT: '停止联系',
  DO_NOT_CONTINUE_HARD_SELL: '不继续强推',
  RECORD_LOST_REASON: '记录流失原因',
  CONFIRM_CURRENT_STATUS: '确认当前状态',
}

const tagLabels: LabelMap = {
  IDENTITY_CONFIRMATION: '身份确认',
  SOURCE_EXPLANATION: '信息来源解释',
  CONVENIENCE_CHECK: '确认是否方便沟通',
  PARENT_TRANSFER: '转接家长/监护人',
  LEARNING_DIAGNOSIS: '学情了解',
  NEED_DISCOVERY: '需求挖掘',
  PAIN_POINT_ANALYSIS: '痛点分析',
  INVITE_TEST: '邀约测评',
  INVITE_TRIAL: '邀约试听',
  INVITE_VISIT: '邀约到校',
  APPOINTMENT_CONFIRM: '预约确认',
  RESCHEDULE: '改约',
  NO_SHOW_PREVENTION: '防爽约提醒',
  TEST_FEEDBACK: '测评反馈',
  TRIAL_FEEDBACK: '试听反馈',
  COURSE_PLAN_EXPLAIN: '课程方案讲解',
  PRICE_EXPLAIN: '价格说明',
  DISCOUNT_EXPLAIN: '优惠说明',
  REFUND_RULE_EXPLAIN: '退费规则说明',
  OBJECTION_HANDLING: '异议处理',
  CLOSING_PUSH: '成交推进',
  DEPOSIT_COLLECTION: '催定金',
  BALANCE_COLLECTION: '催尾款',
  PAYMENT_CONFIRM: '付款确认',
  CONTRACT_CONFIRM: '合同确认',
  INVOICE_CONFIRM: '发票确认',
  SCHEDULE_CONFIRM: '排课确认',
  CLASS_FEEDBACK: '课后反馈',
  HOMEWORK_FEEDBACK: '作业反馈',
  RENEWAL_PUSH: '续费推进',
  SUBJECT_EXPANSION: '扩科推进',
  REFERRAL_REQUEST: '转介绍',
  COMPLAINT_SOOTHING: '投诉安抚',
  REFUND_COMMUNICATION: '退费沟通',
  RETENTION_ATTEMPT: '流失挽回',
  DO_NOT_CONTACT_HANDLING: '勿扰处理',
  GRADE_PRIMARY: '小学',
  GRADE_PRIMARY_5: '五年级',
  GRADE_PRIMARY_6: '六年级',
  XIAOSHENGCHU: '小升初',
  GRADE_JUNIOR_1: '初一',
  GRADE_JUNIOR_2: '初二',
  GRADE_JUNIOR_3: '初三',
  ZHONGKAO: '中考',
  GRADE_SENIOR_1: '高一',
  GRADE_SENIOR_2: '高二',
  GRADE_SENIOR_3: '高三',
  GAOKAO: '高考',
  BASIC_WEAK: '基础薄弱',
  SCORE_DECLINE: '成绩下滑',
  SCORE_FLUCTUATION: '成绩波动',
  LEARNING_HABIT_POOR: '学习习惯差',
  HOMEWORK_DELAY: '作业拖拉',
  LOW_INITIATIVE: '学习主动性弱',
  PHONE_DISTRACTION: '手机影响',
  CLASS_ABSORB_WEAK: '课堂吸收差',
  TEST_ANXIETY: '考试焦虑',
  CARELESSNESS: '粗心',
  LACK_OF_METHOD: '学习方法问题',
  MEMORY_WEAK: '记忆困难',
  ATTENTION_WEAK: '注意力不集中',
  PARENT_ANXIOUS: '家长焦虑',
  PARENT_RATIONAL: '家长理性观望',
  PARENT_PRICE_SENSITIVE: '家长价格敏感',
  PARENT_TIME_CONFLICT: '家长时间冲突',
  PARENT_DISTANCE_CONCERN: '家长距离顾虑',
  PARENT_NEEDS_DISCUSSION: '需要和家人商量',
  CHILD_RESISTANT: '孩子抗拒',
  CHILD_COOPERATIVE: '孩子配合',
  CHILD_UNCLEAR_ATTITUDE: '孩子态度未知',
  ALREADY_IN_TRAINING: '已报其他机构',
  NO_TRAINING_HISTORY: '无补习经历',
  TRAINING_RESULT_UNSATISFIED: '对过往补习不满意',
  MOTHER_DECISION_MAKER: '母亲主决策',
  FATHER_DECISION_MAKER: '父亲主决策',
  BOTH_PARENTS_DECISION: '父母共同决策',
  GRANDPARENT_INVOLVED: '老人参与决策',
  STUDENT_INFLUENCES_DECISION: '孩子影响决策',
  DECISION_MAKER_UNKNOWN: '决策人未知',
  SUBJECT_CHINESE: '语文',
  SUBJECT_MATH: '数学',
  SUBJECT_ENGLISH: '英语',
  SUBJECT_PHYSICS: '物理',
  SUBJECT_CHEMISTRY: '化学',
  SUBJECT_BIOLOGY: '生物',
  SUBJECT_HISTORY: '历史',
  SUBJECT_GEOGRAPHY: '地理',
  SUBJECT_POLITICS: '道法/政治',
  SUBJECT_SCIENCE: '科学',
  SUBJECT_ALL: '全科',
  ENGLISH_VOCAB_WEAK: '英语单词薄弱',
  ENGLISH_LISTENING_WEAK: '英语听力薄弱',
  ENGLISH_READING_WEAK: '英语阅读薄弱',
  ENGLISH_WRITING_WEAK: '英语写作薄弱',
  ENGLISH_GRAMMAR_WEAK: '英语语法薄弱',
  ENGLISH_SPEAKING_WEAK: '英语口语薄弱',
  MATH_CALCULATION_WEAK: '数学计算薄弱',
  MATH_APPLICATION_WEAK: '数学应用题薄弱',
  MATH_GEOMETRY_WEAK: '数学几何薄弱',
  MATH_ALGEBRA_WEAK: '数学代数薄弱',
  MATH_PROBLEM_SOLVING_WEAK: '数学压轴/综合题薄弱',
  CHINESE_READING_WEAK: '语文阅读理解薄弱',
  CHINESE_WRITING_WEAK: '语文作文薄弱',
  CHINESE_CLASSICAL_WEAK: '语文文言文薄弱',
  CHINESE_FOUNDATION_WEAK: '语文基础知识薄弱',
  NO_TIME: '没时间',
  CHILD_UNWILLING: '孩子不愿意',
  PRICE_EXPENSIVE: '价格贵',
  DISTANCE_FAR: '距离远',
  ALREADY_ENROLLED: '已经报课',
  WAIT_FOR_SCORE: '等成绩出来',
  NEED_FAMILY_DISCUSSION: '要和家人商量',
  CONSIDER_FIRST: '先考虑一下',
  NO_TRUST_EFFECT: '不相信效果',
  TEACHER_QUALITY_CONCERN: '担心老师质量',
  CHILD_CANNOT_PERSIST: '担心孩子坚持不了',
  NO_OFFLINE_CLASS: '不想线下',
  NO_ONLINE_CLASS: '不想线上',
  DO_NOT_WANT_CALL: '不想接电话',
  SOURCE_DISSATISFACTION: '对信息来源不满',
  NO_NEED: '暂时不需要',
  SCHEDULE_CONFLICT: '时间安排冲突',
  BUDGET_LIMITED: '预算有限',
  REFUND_CONCERN: '担心退费',
  CONTRACT_CONCERN: '担心合同',
  FATHER_OR_MOTHER_NOT_AGREE: '另一位家长不同意',
  CHILD_TOO_TIRED: '孩子太累',
  TRAFFIC_OR_LOCATION: '交通/位置不便',
  WECHAT_ADDED: '已加微信',
  WECHAT_NOT_ADDED: '未加微信',
  WECHAT_PROPOSED: '已提出加微信',
  TEST_PROPOSED: '已提出测评',
  TEST_CONFIRMED: '已约测评',
  TRIAL_PROPOSED: '已提出试听',
  TRIAL_CONFIRMED: '已约试听',
  VISIT_PROPOSED: '已邀约到校',
  VISIT_CONFIRMED: '已约到校',
  APPOINTMENT_PENDING_CONFIRM: '预约待确认',
  APPOINTMENT_RESCHEDULED: '已改约',
  NO_SHOW_RISK: '爽约风险',
  NO_SHOW_OCCURRED: '已爽约',
  PLAN_EXPLAINED: '已讲方案',
  PRICE_QUOTED: '已报价',
  MATERIAL_SENT_OR_PROMISED: '已发/承诺发资料',
  PAYMENT_LINK_SENT: '已发付款链接',
  DEPOSIT_PAID: '已收定金',
  BALANCE_PENDING: '待付尾款',
  FULL_PAYMENT_PAID: '已全款',
  FOLLOW_UP_NEEDED: '需要继续跟进',
  LOST_RISK: '流失风险',
  LOST_CONFIRMED: '流失确认',
  DO_NOT_CONTACT_CONFIRMED: '明确勿扰',
  SERVICE_ISSUE_PENDING: '服务问题待处理',
  REFUND_PENDING: '退费待处理',
  WECHAT_FOLLOW_UP: '微信跟进',
  SEND_TEST_INFO: '发送测评资料',
  SEND_COURSE_PLAN: '发送课程方案',
  SEND_PRICE_PLAN: '发送价格方案',
  SEND_CAMPUS_LOCATION: '发送校区位置',
  CONFIRM_VISIT_TIME: '确认到访时间',
  VISIT_REMINDER: '提醒到访',
  SECOND_CALL_FOLLOW_UP: '二次电话回访',
  CONTACT_PARENT: '联系家长',
  CONTACT_OTHER_DECISION_MAKER: '联系另一位决策人',
  ARRANGE_TEST: '安排测评',
  ARRANGE_TRIAL: '安排试听',
  ARRANGE_TEACHER_COMMUNICATION: '安排老师沟通',
  CONFIRM_PAYMENT: '确认付款',
  CONFIRM_CONTRACT: '确认合同',
  ARRANGE_CLASS_SCHEDULE: '安排排课',
  CREATE_SERVICE_FEEDBACK_TASK: '创建服务反馈任务',
  NO_ACTION: '暂无动作',
}

const crmPriorityLabels: LabelMap = {
  P0_立即处理: 'P0 立即处理',
  P1_今日跟进: 'P1 今日跟进',
  P2_本周跟进: 'P2 本周跟进',
  P3_低优先级: 'P3 低优先级',
  P4_停止联系: 'P4 停止联系',
}

const genericLabels: LabelMap = {
  ...stageLabels,
  ...dealStatusLabels,
  ...intentLabels,
  ...refusalTypeLabels,
  ...nextStepQualityLabels,
  ...riskCodeLabels,
  ...actionLabels,
  ...tagLabels,
  ...crmPriorityLabels,
  CRITICAL: '严重风险',
}

const riskLevelTones: Record<string, CallAnalysisTone> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'warning',
  NONE: 'success',
}

const ambiguousGenericCodes = new Set(['NONE', 'LOW', 'MEDIUM', 'HIGH'])

export class CallAnalysisMappingModel {
  static normalize(value: unknown): string {
    return String(value ?? '').trim().toUpperCase()
  }

  static label(value: unknown, fallback = '未知'): string {
    if (value === null || value === undefined || value === '') return fallback
    if (typeof value !== 'string') return String(value)
    const key = this.normalize(value)
    if (ambiguousGenericCodes.has(key)) return value
    return genericLabels[key] || value
  }

  static codeLabel(value: unknown, fallback = '未知'): string {
    if (value === null || value === undefined || value === '') return fallback
    const key = this.normalize(value)
    return genericLabels[key] || riskLevelLabels[key] || requiredLevelLabels[key] || String(value)
  }

  static riskLevelLabel(value: unknown, fallback = '未知'): string {
    if (value === null || value === undefined || value === '') return fallback
    const key = this.normalize(value)
    return riskLevelLabels[key] || String(value)
  }

  static refusalTypeLabel(value: unknown, fallback = '未知'): string {
    if (value === null || value === undefined || value === '') return fallback
    const key = this.normalize(value)
    return refusalTypeLabels[key] || String(value)
  }

  static nextStepQualityLabel(value: unknown, fallback = '未知'): string {
    if (value === null || value === undefined || value === '') return fallback
    const key = this.normalize(value)
    return nextStepQualityLabels[key] || String(value)
  }

  static requiredLevelLabel(value: unknown, fallback = '未知'): string {
    if (value === null || value === undefined || value === '') return fallback
    const key = this.normalize(value)
    return requiredLevelLabels[key] || String(value)
  }

  static pressureLevelLabel(value: unknown, fallback = '未知'): string {
    if (value === null || value === undefined || value === '') return fallback
    const key = this.normalize(value)
    return pressureLevelLabels[key] || String(value)
  }

  static riskTone(value: unknown): CallAnalysisTone {
    const key = this.normalize(value || 'NONE')
    return riskLevelTones[key] || 'neutral'
  }
}
