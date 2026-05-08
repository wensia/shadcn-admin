export type HelpDocKind = 'guide' | 'changelog'

export type HelpAudience =
  | '全部员工'
  | '市场部'
  | '咨询部'
  | '教管部'
  | '主管'
  | '管理员'

export type HelpDocCategory =
  | '快速开始'
  | '市场部'
  | '咨询部'
  | '教管部'
  | '更新历史'

export interface HelpDocMeta {
  id: string
  title: string
  kind: HelpDocKind
  category: HelpDocCategory
  audiences: HelpAudience[]
  summary: string
  updatedAt: string
  order: number
  path: string
  relatedRoutes: string[]
}

export const helpDocs: HelpDocMeta[] = [
  {
    id: 'overview',
    title: '使用说明总览',
    kind: 'guide',
    category: '快速开始',
    audiences: ['全部员工'],
    summary: '了解 RMF CRM 的核心模块、常用入口和阅读顺序。',
    updatedAt: '2026-04-30',
    order: 10,
    path: '/src/content/help/guides/overview.md',
    relatedRoutes: ['/crm/workbench', '/crm/leads'],
  },
  {
    id: 'marketing-batch-import',
    title: '市场：批量导入线索',
    kind: 'guide',
    category: '市场部',
    audiences: ['市场部', '主管'],
    summary: '将市场线索按模板批量录入系统，并检查导入结果。',
    updatedAt: '2026-04-30',
    order: 20,
    path: '/src/content/help/guides/marketing-batch-import.md',
    relatedRoutes: ['/crm/batch-import', '/crm/lead-creation-logs'],
  },
  {
    id: 'marketing-assignment',
    title: '市场/主管：批量分配与创建分配任务',
    kind: 'guide',
    category: '市场部',
    audiences: ['市场部', '主管'],
    summary: '批量分配线索，或创建分配任务交给顾问领取和跟进。',
    updatedAt: '2026-04-30',
    order: 30,
    path: '/src/content/help/guides/marketing-assignment.md',
    relatedRoutes: ['/crm/leads', '/crm/leads/assignment-tasks'],
  },
  {
    id: 'consulting-followup',
    title: '咨询：快捷回访与线索标注',
    kind: 'guide',
    category: '咨询部',
    audiences: ['咨询部'],
    summary: '在咨询工作台完成回访、记录跟进结果并维护线索标签。',
    updatedAt: '2026-04-30',
    order: 40,
    path: '/src/content/help/guides/consulting-followup.md',
    relatedRoutes: ['/crm/workbench', '/crm/leads'],
  },
  {
    id: 'consulting-continuous-call',
    title: '咨询：连续外呼',
    kind: 'guide',
    category: '咨询部',
    audiences: ['咨询部'],
    summary: '按队列连续拨打线索电话，减少切换页面带来的操作成本。',
    updatedAt: '2026-04-30',
    order: 50,
    path: '/src/content/help/guides/consulting-continuous-call.md',
    relatedRoutes: ['/crm/continuous-call', '/crm/call-records'],
  },
  {
    id: 'lead-pool',
    title: '咨询：公海领取',
    kind: 'guide',
    category: '咨询部',
    audiences: ['咨询部', '主管'],
    summary: '从公海查看、筛选和领取可跟进线索。',
    updatedAt: '2026-04-30',
    order: 60,
    path: '/src/content/help/guides/lead-pool.md',
    relatedRoutes: ['/crm/leads/pool'],
  },
  {
    id: 'education-basics',
    title: '教管：学员、课包、排课、消课基础流程',
    kind: 'guide',
    category: '教管部',
    audiences: ['教管部'],
    summary: '教管日常从学员建档到课时消耗的基础操作链路。',
    updatedAt: '2026-04-30',
    order: 70,
    path: '/src/content/help/guides/education-basics.md',
    relatedRoutes: [
      '/crm/students',
      '/crm/packages',
      '/crm/lessons',
      '/crm/consumption',
    ],
  },
  {
    id: 'changelog-2026-04-30',
    title: '更新历史：2026-04-30',
    kind: 'changelog',
    category: '更新历史',
    audiences: ['全部员工'],
    summary: '帮助中心第一版上线，收录市场、咨询、教管常用流程。',
    updatedAt: '2026-04-30',
    order: 1000,
    path: '/src/content/help/changelog/2026-04-30.md',
    relatedRoutes: ['/help-center'],
  },
  {
    id: 'changelog-deploy-skill-2026-04-30',
    title: '更新历史：部署流程 Skill 化',
    kind: 'changelog',
    category: '更新历史',
    audiences: ['管理员'],
    summary: '生产部署流程从单纯脚本说明升级为项目 Skill 工作流。',
    updatedAt: '2026-04-30',
    order: 1010,
    path: '/src/content/help/changelog/deploy-skill-2026-04-30.md',
    relatedRoutes: ['/help-center'],
  },
]
