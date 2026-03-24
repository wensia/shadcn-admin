export type AspStageId = 'primary' | 'junior' | 'high-arts' | 'high-science'

export type AspMemoryTask = {
  id: string
  title: string
  instruction: string
  memorizeSeconds: number
  display: string
  expectedTokens?: string[]
  expectedAnswer?: string
  placeholder: string
  hint: string
}

export type AspScaleQuestion = {
  id: string
  prompt: string
  dimension: 'execution' | 'resilience'
  reverse?: boolean
}

export type AspPreferenceQuestion = {
  id: string
  prompt: string
  description: string
  options: Array<{
    id: string
    label: string
    traits: string[]
  }>
}

export type AspSubjectProfile = {
  id: string
  name: string
  topics: string[]
}

export type AspStageProfile = {
  id: AspStageId
  label: string
  badge: string
  summary: string
  subjects: AspSubjectProfile[]
}

export const ASP_MEMORY_TASKS: AspMemoryTask[] = [
  {
    id: 'digit-memory',
    title: '数字闪记',
    instruction: '根据题册首页的记忆题改写。数字会短暂出现，结束后按任意顺序回忆。',
    memorizeSeconds: 20,
    display: '18 56 44 97 21 78 60 9 32 29',
    expectedTokens: ['18', '56', '44', '97', '21', '78', '60', '9', '32', '29'],
    placeholder: '例如：18 44 21 32 ...',
    hint: '输入你记住的数字，空格或逗号分隔即可。',
  },
  {
    id: 'word-memory',
    title: '词语闪记',
    instruction: '根据 PDF 中学组词语记忆题改写。你可以不按顺序回忆，只看记住了多少。',
    memorizeSeconds: 35,
    display:
      '脂肪 / 江西人 / 纸张 / 经济 / 魅力 / 快乐 / 缺乏 / 网络 / 袜子 / 忧伤 / 蜡烛 / 剪刀 / 汽艇 / 粘土 / 社会主义 / 朋友 / 化妆舞会 / 受伤 / 奇怪 / 词典',
    expectedTokens: [
      '脂肪',
      '江西人',
      '纸张',
      '经济',
      '魅力',
      '快乐',
      '缺乏',
      '网络',
      '袜子',
      '忧伤',
      '蜡烛',
      '剪刀',
      '汽艇',
      '粘土',
      '社会主义',
      '朋友',
      '化妆舞会',
      '受伤',
      '奇怪',
      '词典',
    ],
    placeholder: '例如：经济 网络 词典 ...',
    hint: '输入你回忆出的词语，系统会按匹配数量给出原型分。',
  },
  {
    id: 'sequence',
    title: '规律判断',
    instruction: '题册中有“1、3、6、10、____”这一题，这里保留它作为思考样例。',
    memorizeSeconds: 0,
    display: '1，3，6，10，____',
    expectedAnswer: '15',
    placeholder: '填写下一项',
    hint: '这里按样例规则只接受 “15”。',
  },
]

export const ASP_SCALE_OPTIONS = [
  { value: 1, label: '非常不像我' },
  { value: 2, label: '比较不像' },
  { value: 3, label: '一般' },
  { value: 4, label: '比较像我' },
  { value: 5, label: '非常像我' },
] as const

export const ASP_SCALE_QUESTIONS: AspScaleQuestion[] = [
  {
    id: 'execution-1',
    prompt: '如果别人不督促我，我极少主动地学习。',
    dimension: 'execution',
    reverse: true,
  },
  {
    id: 'execution-2',
    prompt: '我会主动复习和巩固已经学过的知识。',
    dimension: 'execution',
  },
  {
    id: 'execution-3',
    prompt: '开始阅读或做题前，我通常有一个明确的目标和动机。',
    dimension: 'execution',
  },
  {
    id: 'execution-4',
    prompt: '我总能按时完成老师布置的学习任务。',
    dimension: 'execution',
  },
  {
    id: 'execution-5',
    prompt: '我经常把当天学到的知识和已有经验联系起来。',
    dimension: 'execution',
  },
  {
    id: 'resilience-1',
    prompt: '到临考前，我会明显烦躁不安。',
    dimension: 'resilience',
    reverse: true,
  },
  {
    id: 'resilience-2',
    prompt: '面对重大考试，我会紧张得一直睡不好觉。',
    dimension: 'resilience',
    reverse: true,
  },
  {
    id: 'resilience-3',
    prompt: '我能从考试失误中吸取教训，并总结经验。',
    dimension: 'resilience',
  },
  {
    id: 'resilience-4',
    prompt: '在重要测验中，我觉得自己能把能力发挥出来。',
    dimension: 'resilience',
  },
]

export const ASP_PREFERENCE_QUESTIONS: AspPreferenceQuestion[] = [
  {
    id: 'preference-1',
    prompt: '我表现最好时，通常在……',
    description: '改写自题册中的学习通道题。',
    options: [
      { id: 'listen', label: '听故事或讲解', traits: ['听觉输入'] },
      { id: 'read', label: '阅读书籍', traits: ['读写输入'] },
      { id: 'outdoor', label: '户外活动或实操', traits: ['动手体验'] },
    ],
  },
  {
    id: 'preference-2',
    prompt: '我最好的记忆方式是……',
    description: '用于估计主要学习通道。',
    options: [
      { id: 'repeat', label: '对自己反复地说', traits: ['听觉输入', '复述'] },
      { id: 'image', label: '在脑海里构思图像', traits: ['视觉组织'] },
      { id: 'practice', label: '动手做或演示一遍', traits: ['动手体验'] },
    ],
  },
  {
    id: 'preference-3',
    prompt: '当我想更快理解新内容时……',
    description: '改写自“我能较好地理解说明书”题。',
    options: [
      { id: 'teacher', label: '有人给我解释', traits: ['听觉输入', '社交互动'] },
      { id: 'self-read', label: '我自己看文字说明', traits: ['读写输入'] },
      { id: 'demo', label: '有人给我演示', traits: ['视觉组织', '动手体验'] },
    ],
  },
  {
    id: 'preference-4',
    prompt: '你在什么环境中学习最好？',
    description: '来自 PDF 中“学习环境偏好”部分。',
    options: [
      { id: 'quiet', label: '安静环境', traits: ['独立专注'] },
      { id: 'with-music', label: '有轻音乐或白噪音', traits: ['听觉输入'] },
      { id: 'with-people', label: '附近有人但不打扰', traits: ['社交互动'] },
    ],
  },
  {
    id: 'preference-5',
    prompt: '身体状态上，你更适合……',
    description: '改写自姿势与互动偏好题。',
    options: [
      { id: 'desk', label: '坐在书桌前', traits: ['结构化节奏'] },
      { id: 'move', label: '边走边想或边说', traits: ['动手体验'] },
      { id: 'solo-room', label: '独处在自己的空间', traits: ['独立专注'] },
    ],
  },
]

export const ASP_STAGE_PROFILES: AspStageProfile[] = [
  {
    id: 'primary',
    label: '小学版',
    badge: 'P',
    summary: '聚焦基础阅读、数感建立与英语听说读写启蒙。',
    subjects: [
      { id: 'chinese', name: '语文', topics: ['词语与句子', '现代文阅读', '文言启蒙', '纪实作文'] },
      { id: 'math', name: '数学', topics: ['数与数的运算', '图形与测量', '方程启蒙', '数据统计'] },
      { id: 'english', name: '英语', topics: ['听说', '词汇', '语法', '读写基础'] },
    ],
  },
  {
    id: 'junior',
    label: '初中版',
    badge: 'J',
    summary: '覆盖基础学科完整链路，强调知识点与题型适配。',
    subjects: [
      { id: 'chinese', name: '语文', topics: ['语言运用', '现代文阅读', '文言文阅读', '议论文写作'] },
      { id: 'math', name: '数学', topics: ['函数与方程', '几何与证明', '统计概率', '综合运算'] },
      { id: 'english', name: '英语', topics: ['听力', '完形填空', '阅读理解', '书面表达'] },
      { id: 'physics', name: '物理', topics: ['力与运动', '电与磁', '光现象', '内能与热学'] },
      { id: 'chemistry', name: '化学', topics: ['物质分类', '化学式与方程式', '溶液', '实验与计算'] },
    ],
  },
  {
    id: 'high-arts',
    label: '高中版（文科）',
    badge: 'A',
    summary: '面向语数英与政史地的题型适配、阅读理解和材料分析。',
    subjects: [
      { id: 'chinese', name: '语文', topics: ['语言运用', '现代文阅读', '古诗文阅读', '作文'] },
      { id: 'math', name: '数学', topics: ['选择与填空', '解析题', '函数', '立体几何'] },
      { id: 'english', name: '英语', topics: ['听力', '知识运用', '阅读理解', '书面表达'] },
      { id: 'politics', name: '政治', topics: ['经济生活', '政治生活', '文化生活', '哲学与时政'] },
      { id: 'history', name: '历史', topics: ['古代史', '近代史', '现代史', '世界体系与改革'] },
      { id: 'geography', name: '地理', topics: ['地球运动', '气候与洋流', '区域地理', '环境与资源'] },
    ],
  },
  {
    id: 'high-science',
    label: '高中版（理科）',
    badge: 'S',
    summary: '覆盖语数英与理综，强调知识网络、综合题与实验分析。',
    subjects: [
      { id: 'chinese', name: '语文', topics: ['语基', '现代文阅读', '古诗文阅读', '作文'] },
      { id: 'math', name: '数学', topics: ['选择与填空', '解答题', '数列与导数', '概率统计'] },
      { id: 'english', name: '英语', topics: ['听力', '知识运用', '阅读理解', '书面表达'] },
      { id: 'physics', name: '物理', topics: ['力学', '电磁学', '热学', '实验与探究'] },
      { id: 'chemistry', name: '化学', topics: ['反应原理', '有机化学', '实验', '化学计算'] },
      { id: 'biology', name: '生物', topics: ['细胞与代谢', '遗传与进化', '生命活动调节', '实验与探究'] },
    ],
  },
]

