import type { DISCQuestion } from '../types'

export const DISC_QUESTIONS: DISCQuestion[] = [
  // ═══ 工作风格 (1-6) ═══
  {
    id: 1,
    category: '工作风格',
    scenario: '你接到一项全新的工作任务，之前没有任何经验可以参考',
    options: [
      { label: '先收集相关资料，制定详细的执行计划再动手', dimension: 'C' },
      { label: '立刻行动，边做边调整，快速试错', dimension: 'D' },
      { label: '找有经验的同事请教，参考他们的做法稳步推进', dimension: 'S' },
      { label: '召集相关同事一起头脑风暴，集思广益', dimension: 'I' },
    ],
  },
  {
    id: 2,
    category: '工作风格',
    scenario: '你的日程表上同时堆积了多项任务，而且截止时间都很紧',
    options: [
      { label: '按照紧急程度排序，一件一件有条不紊地完成', dimension: 'S' },
      { label: '果断砍掉或推迟次要任务，集中精力攻克最关键的几项', dimension: 'D' },
      { label: '列出每项任务的具体步骤和时间分配，严格按计划执行', dimension: 'C' },
      { label: '主动协调资源，看看哪些任务可以分配给别人或寻求支援', dimension: 'I' },
    ],
  },
  {
    id: 3,
    category: '工作风格',
    scenario: '公司要引入一套新的工作流程或工具，你的第一反应是什么',
    options: [
      { label: '很感兴趣，主动学习并向同事推荐这个新工具', dimension: 'I' },
      { label: '仔细研究新流程的细节，评估它是否真的比旧流程更好', dimension: 'C' },
      { label: '只要能提高效率就支持，快速上手直接用起来', dimension: 'D' },
      { label: '先观察别人的使用情况，等确认稳定后再逐步切换', dimension: 'S' },
    ],
  },
  {
    id: 4,
    category: '工作风格',
    scenario: '你在工作中发现了一个可以提升效率的改进机会，但需要改变现有做法',
    options: [
      { label: '先做小范围试验，用数据验证效果后再推广', dimension: 'C' },
      { label: '直接推动变革，用结果说话', dimension: 'D' },
      { label: '跟相关同事沟通，争取大家的理解和支持后再推进', dimension: 'I' },
      { label: '先确保改进不会影响现有工作的稳定运转，再循序渐进地调整', dimension: 'S' },
    ],
  },
  {
    id: 5,
    category: '工作风格',
    scenario: '上级交代了一项任务，但只说了大概方向，没有给出具体要求',
    options: [
      { label: '自己先理清思路，列出具体的执行方案再向上级确认', dimension: 'C' },
      { label: '按照自己的理解直接开始做，有问题再随时调整', dimension: 'D' },
      { label: '主动找上级和相关同事沟通，明确各方期望后再行动', dimension: 'I' },
      { label: '参考以往类似任务的做法，按照既有经验稳妥地推进', dimension: 'S' },
    ],
  },
  {
    id: 6,
    category: '工作风格',
    scenario: '你需要在两个方案之间做出选择：一个风险较高但回报大，另一个风险低但回报平稳',
    options: [
      { label: '选择高回报方案，愿意承担风险去争取更大的成果', dimension: 'D' },
      { label: '综合分析两个方案的利弊，选择数据支持更充分的那个', dimension: 'C' },
      { label: '选择稳妥方案，确保不出大的差错', dimension: 'S' },
      { label: '和团队讨论各自的看法，争取达成共识后再决定', dimension: 'I' },
    ],
  },
  // ═══ 人际沟通 (7-12) ═══
  {
    id: 7,
    category: '人际沟通',
    scenario: '你和同事在某个方案上观点不同，双方都觉得自己的方案更好',
    options: [
      { label: '清晰地阐述自己的理由，尝试说服对方接受', dimension: 'D' },
      { label: '认真倾听对方的观点，寻找双方都能接受的折中方案', dimension: 'S' },
      { label: '提议用客观标准（数据、案例）来评估两个方案的优劣', dimension: 'C' },
      { label: '把讨论气氛引导得更轻松，找到双方的共同点再化解分歧', dimension: 'I' },
    ],
  },
  {
    id: 8,
    category: '人际沟通',
    scenario: '一位新同事刚加入团队，看起来有些不太适应',
    options: [
      { label: '主动上前打招呼，热情地介绍团队情况和大家', dimension: 'I' },
      { label: '默默关注，在对方需要时提供力所能及的帮助', dimension: 'S' },
      { label: '直接告诉对方团队的规则和工作要求，帮助其快速进入状态', dimension: 'D' },
      { label: '整理一份有用的资料或文档发给对方，方便其自行了解', dimension: 'C' },
    ],
  },
  {
    id: 9,
    category: '人际沟通',
    scenario: '你需要向不太熟悉的部门同事寻求协助，完成一项跨部门的工作',
    options: [
      { label: '写一封条理清晰的邮件，说明背景、需求和时间节点', dimension: 'C' },
      { label: '直接找到对方，简明扼要地说清楚需要什么、什么时候要', dimension: 'D' },
      { label: '先聊聊近况拉近距离，再自然地提出合作请求', dimension: 'I' },
      { label: '通过共同认识的同事引荐，在对方方便的时候再沟通', dimension: 'S' },
    ],
  },
  {
    id: 10,
    category: '人际沟通',
    scenario: '在一次会议中，你发现讨论的方向偏离了主题，效率很低',
    options: [
      { label: '等讨论告一段落后，委婉地建议回到主题', dimension: 'S' },
      { label: '直接指出问题，建议大家聚焦核心议题', dimension: 'D' },
      { label: '用幽默或引导性的方式把话题自然地拉回来', dimension: 'I' },
      { label: '在笔记中记录偏题的要点，会后单独整理分享，并将会议拉回正轨', dimension: 'C' },
    ],
  },
  {
    id: 11,
    category: '人际沟通',
    scenario: '你的上级对你的某项工作提出了批评，而你觉得自己做得并没有问题',
    options: [
      { label: '先接受批评，回去后仔细复盘，确认是否真的存在问题', dimension: 'C' },
      { label: '冷静地表达自己的看法，用事实和依据说明情况', dimension: 'D' },
      { label: '先表示理解上级的关切，然后找合适的机会再做沟通', dimension: 'S' },
      { label: '主动和上级聊聊，在轻松的氛围中坦诚地交换意见', dimension: 'I' },
    ],
  },
  {
    id: 12,
    category: '人际沟通',
    scenario: '你需要给一群不太了解你工作的人做一次汇报',
    options: [
      { label: '准备详实的数据和图表，确保内容严谨、经得起质疑', dimension: 'C' },
      { label: '设计生动的案例和故事，让大家更容易理解和记住', dimension: 'I' },
      { label: '聚焦核心结论和行动建议，简洁有力，不说废话', dimension: 'D' },
      { label: '提前了解听众的关注点，针对性地准备他们最关心的内容', dimension: 'S' },
    ],
  },
  // ═══ 团队协作 (13-18) ═══
  {
    id: 13,
    category: '团队协作',
    scenario: '团队需要选出一个人来负责一个重要项目',
    options: [
      { label: '如果自己合适就主动请缨，相信自己能带好这个项目', dimension: 'D' },
      { label: '积极推荐最合适的人选，帮助团队做出好的决定', dimension: 'I' },
      { label: '分析项目需求，列出负责人应具备的能力标准再做决定', dimension: 'C' },
      { label: '支持团队的决定，如果被选中会尽力做好', dimension: 'S' },
    ],
  },
  {
    id: 14,
    category: '团队协作',
    scenario: '在一个团队项目中，某位成员的工作进度明显落后，影响了整体进展',
    options: [
      { label: '了解对方遇到的困难，看看自己能不能帮忙分担一些', dimension: 'S' },
      { label: '直接跟对方谈，明确告知进度要求和影响', dimension: 'D' },
      { label: '检查任务分配是否合理，重新评估计划和资源分配', dimension: 'C' },
      { label: '私下和对方聊聊情况，一起想办法，鼓励对方加把劲', dimension: 'I' },
    ],
  },
  {
    id: 15,
    category: '团队协作',
    scenario: '团队在讨论一个方案时，你有一个不太成熟的想法',
    options: [
      { label: '大方地说出来，好的想法需要碰撞才能成熟', dimension: 'I' },
      { label: '先自己完善一下思路，整理清楚再提出来', dimension: 'C' },
      { label: '看看有没有合适的时机再分享，不想打断当前的讨论', dimension: 'S' },
      { label: '直接提出来，让团队快速判断是否值得深入探讨', dimension: 'D' },
    ],
  },
  {
    id: 16,
    category: '团队协作',
    scenario: '你在团队中最常扮演的角色是',
    options: [
      { label: '执行者——认真把分配给自己的任务做到位', dimension: 'S' },
      { label: '决策者——在关键时刻拍板定方向', dimension: 'D' },
      { label: '协调者——活跃气氛，促进成员之间的沟通', dimension: 'I' },
      { label: '质检者——把关细节，确保成果的质量和准确性', dimension: 'C' },
    ],
  },
  {
    id: 17,
    category: '团队协作',
    scenario: '团队成功完成了一个重要项目，你觉得最值得庆祝的是什么',
    options: [
      { label: '我们攻克了难关，拿下了一个有挑战性的目标', dimension: 'D' },
      { label: '大家合作得很愉快，团队的凝聚力更强了', dimension: 'I' },
      { label: '项目的每个环节都执行到位，成果质量经得起检验', dimension: 'C' },
      { label: '团队配合默契，整个过程平稳顺利没出大问题', dimension: 'S' },
    ],
  },
  {
    id: 18,
    category: '团队协作',
    scenario: '团队中两位同事发生了冲突，气氛变得紧张',
    options: [
      { label: '分别找两人聊聊，了解各自的想法，尝试从中调和', dimension: 'I' },
      { label: '先让大家冷静一下，避免矛盾进一步升级', dimension: 'S' },
      { label: '客观分析冲突的原因，找出问题的根源和解决方案', dimension: 'C' },
      { label: '直接召集双方坐下来把问题摊开说清楚，尽快解决', dimension: 'D' },
    ],
  },
  // ═══ 压力应对 (19-24) ═══
  {
    id: 19,
    category: '压力应对',
    scenario: '你负责的一个项目突然遇到了重大变故（如预算被砍、关键人员离开）',
    options: [
      { label: '快速评估影响，立刻制定应对方案', dimension: 'D' },
      { label: '保持冷静，按现有节奏继续推进，逐步消化变化', dimension: 'S' },
      { label: '详细分析变化带来的所有影响，重新修订项目计划', dimension: 'C' },
      { label: '及时和团队沟通情况，稳定大家的情绪，一起想对策', dimension: 'I' },
    ],
  },
  {
    id: 20,
    category: '压力应对',
    scenario: '你连续加班了一周，感到身心疲惫',
    options: [
      { label: '和朋友或同事聚聚，聊聊天放松一下', dimension: 'I' },
      { label: '回顾一下工作安排，看看有没有可以优化的地方减少不必要的加班', dimension: 'C' },
      { label: '咬牙坚持，把手头的事做完再说', dimension: 'D' },
      { label: '给自己安排一段安静的休息时间，恢复精力', dimension: 'S' },
    ],
  },
  {
    id: 21,
    category: '压力应对',
    scenario: '你交付的一项工作被客户（或上级）退回，要求大幅修改',
    options: [
      { label: '仔细分析退回的具体原因和每一条修改意见，逐项改进', dimension: 'C' },
      { label: '有些沮丧，但会按照要求认真修改，争取下次通过', dimension: 'S' },
      { label: '主动联系对方沟通，确认清楚期望，消除误解后再修改', dimension: 'I' },
      { label: '把它当作一次学习机会，快速修改，用更好的结果证明自己', dimension: 'D' },
    ],
  },
  {
    id: 22,
    category: '压力应对',
    scenario: '你正在处理一项紧急工作，这时又有人找你帮忙处理另一件急事',
    options: [
      { label: '先问清楚情况，如果对方确实更紧急就先帮忙', dimension: 'S' },
      { label: '快速判断优先级，如果手头的事更重要，直接婉拒', dimension: 'D' },
      { label: '帮对方想想有没有其他人可以帮忙，同时不耽误自己的工作', dimension: 'I' },
      { label: '评估两件事各自的截止时间和影响，制定最优的处理顺序', dimension: 'C' },
    ],
  },
  {
    id: 23,
    category: '压力应对',
    scenario: '你所在的公司正在经历一次大的组织调整（如部门合并、业务转型）',
    options: [
      { label: '有些担忧，但会做好自己的本职工作，静观其变', dimension: 'S' },
      { label: '把它看作新的机会，主动了解变化，寻找对自己有利的位置', dimension: 'D' },
      { label: '跟同事多交流，了解大家的想法，互相打气', dimension: 'I' },
      { label: '详细了解调整方案，分析对自己岗位和职业发展的具体影响', dimension: 'C' },
    ],
  },
  {
    id: 24,
    category: '压力应对',
    scenario: '你参加一个能力评估或竞争性选拔，对手实力都很强',
    options: [
      { label: '认真准备每一个环节的细节，做到万无一失', dimension: 'C' },
      { label: '充满斗志，全力以赴，享受竞争的过程', dimension: 'D' },
      { label: '跟其他参与者交流学习，不管结果如何都当作一次成长', dimension: 'I' },
      { label: '做好充分准备，保持平常心，结果顺其自然', dimension: 'S' },
    ],
  },
]
