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
    instruction: '数字会短暂出现，结束后按任意顺序回忆。',
    memorizeSeconds: 20,
    display: '18 56 44 97 21 78 60 9 32 29',
    expectedTokens: ['18', '56', '44', '97', '21', '78', '60', '9', '32', '29'],
    placeholder: '输入数字后回车或点击添加',
    hint: '输入你记住的数字，空格或逗号分隔即可。',
  },
  {
    id: 'word-memory',
    title: '词语闪记',
    instruction: '词语会短暂出现，你可以不按顺序回忆，只看记住了多少。',
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
    placeholder: '输入词语后回车或点击添加',
    hint: '输入你回忆出的词语，系统会按匹配数量给出原型分。',
  },
  {
    id: 'sequence',
    title: '规律判断',
    instruction: '观察数列规律，填写下一个数字。',
    memorizeSeconds: 0,
    display: '1，3，6，10，___',
    expectedAnswer: '15',
    placeholder: '填写下一项',
    hint: '请填写正确答案。',
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
    description: '学习通道偏好',
    options: [
      { id: 'listen', label: '听故事或讲解', traits: ['听觉输入'] },
      { id: 'read', label: '阅读书籍', traits: ['读写输入'] },
      { id: 'outdoor', label: '户外活动或实操', traits: ['动手体验'] },
    ],
  },
  {
    id: 'preference-2',
    prompt: '我最好的记忆方式是……',
    description: '记忆方式偏好',
    options: [
      { id: 'repeat', label: '对自己反复地说', traits: ['听觉输入', '复述'] },
      { id: 'image', label: '在脑海里构思图像', traits: ['视觉组织'] },
      { id: 'practice', label: '动手做或演示一遍', traits: ['动手体验'] },
    ],
  },
  {
    id: 'preference-3',
    prompt: '当我想更快理解新内容时……',
    description: '理解方式偏好',
    options: [
      { id: 'teacher', label: '有人给我解释', traits: ['听觉输入', '社交互动'] },
      { id: 'self-read', label: '我自己看文字说明', traits: ['读写输入'] },
      { id: 'demo', label: '有人给我演示', traits: ['视觉组织', '动手体验'] },
    ],
  },
  {
    id: 'preference-4',
    prompt: '你在什么环境中学习最好？',
    description: '学习环境偏好',
    options: [
      { id: 'quiet', label: '安静环境', traits: ['独立专注'] },
      { id: 'with-music', label: '有轻音乐或白噪音', traits: ['听觉输入'] },
      { id: 'with-people', label: '附近有人但不打扰', traits: ['社交互动'] },
    ],
  },
  {
    id: 'preference-5',
    prompt: '身体状态上，你更适合……',
    description: '身体状态偏好',
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

// ═══════════════════════════════════════════════════════════════
// Part 2: Cognitive Tasks (第二部分：思维测试)
// ═══════════════════════════════════════════════════════════════

/** 数字广度测试 */
export type AspDigitSpanGroup = {
  id: string
  title: string
  instruction: string
  reverse: boolean
  sequences: Array<{ id: string; digits: string; expected: string }>
}

export const ASP_DIGIT_SPAN: AspDigitSpanGroup[] = [
  {
    id: 'digit-span-forward',
    title: '数字广度（正向）',
    instruction: '数字会逐个闪现，结束后请按原始顺序写出。',
    reverse: false,
    sequences: [
      { id: 'f1', digits: '665186', expected: '665186' },
      { id: 'f2', digits: '563311', expected: '563311' },
      { id: 'f3', digits: '721443', expected: '721443' },
    ],
  },
  {
    id: 'digit-span-reverse',
    title: '数字广度（倒序）',
    instruction: '数字会逐个闪现，结束后请将数字倒序写出。',
    reverse: true,
    sequences: [
      { id: 'r1', digits: '498023', expected: '320894' },
      { id: 'r2', digits: '946519', expected: '915649' },
      { id: 'r3', digits: '799422', expected: '224997' },
    ],
  },
]

/** 造句词语 */
export const ASP_SENTENCE_WORDS = ['墨水', '天空', '抽象', '基础'] as const

/** 日字加一笔 */
export const ASP_WORD_TRANSFORM = {
  baseChar: '日',
  timeLimit: 60,
  validAnswers: ['目', '白', '田', '旧', '旦', '由', '甲', '申', '电', '且', '旨', '百'],
} as const

// ═══════════════════════════════════════════════════════════════
// Part 4.1: Learning Style (学习风格偏好)
// ═══════════════════════════════════════════════════════════════

export type AspStyleQuestion = {
  id: string
  prompt: string
  options: Array<{ id: string; label: string }>
}

export const ASP_STYLE_DIMENSIONS: Record<string, string> = {
  A: '体验型',
  B: '组织型',
  C: '探究型',
  D: '社交型',
  E: '思考型',
}

export const ASP_STYLE_QUESTIONS: AspStyleQuestion[] = [
  {
    id: 'style-1',
    prompt: '我______',
    options: [
      { id: 'A', label: '喜欢开玩笑' },
      { id: 'B', label: '喜欢井井有条' },
      { id: 'C', label: '喜欢提问题' },
      { id: 'D', label: '喜欢帮助别人' },
      { id: 'E', label: '喜欢思考问题' },
    ],
  },
  {
    id: 'style-2',
    prompt: '当______的时候，学习是最好的',
    options: [
      { id: 'A', label: '它是令人兴奋' },
      { id: 'B', label: '按部就班的进行' },
      { id: 'C', label: '它涉及发现新事物' },
      { id: 'D', label: '与其他人在一起学' },
      { id: 'E', label: '它是出自自己的想法' },
    ],
  },
  {
    id: 'style-3',
    prompt: '作业应该是______',
    options: [
      { id: 'A', label: '短的' },
      { id: 'B', label: '按时完成的' },
      { id: 'C', label: '有趣的' },
      { id: 'D', label: '按小组完成' },
      { id: 'E', label: '重要的（对我）' },
    ],
  },
  {
    id: 'style-4',
    prompt: '我喜欢______',
    options: [
      { id: 'A', label: '玩游戏' },
      { id: 'B', label: '记笔记' },
      { id: 'C', label: '做实验' },
      { id: 'D', label: '小组活动' },
      { id: 'E', label: '琢磨和思考' },
    ],
  },
  {
    id: 'style-5',
    prompt: '在课堂或讨论会上，我______',
    options: [
      { id: 'A', label: '喜欢动' },
      { id: 'B', label: '喜欢安静听讲' },
      { id: 'C', label: '喜欢独自琢磨' },
      { id: 'D', label: '喜欢与人交流' },
      { id: 'E', label: '喜欢观察或思考' },
    ],
  },
  {
    id: 'style-6',
    prompt: '我喜欢______',
    options: [
      { id: 'A', label: '说干就马上干' },
      { id: 'B', label: '按计划做事' },
      { id: 'C', label: '无论何时想做就做' },
      { id: 'D', label: '为大家做事' },
      { id: 'E', label: '做正确的事' },
    ],
  },
  {
    id: 'style-7',
    prompt: '计划时间表______',
    options: [
      { id: 'A', label: '限制自由' },
      { id: 'B', label: '保持秩序' },
      { id: 'C', label: '浪费时间' },
      { id: 'D', label: '如果合理就好' },
      { id: 'E', label: '没有意义' },
    ],
  },
  {
    id: 'style-8',
    prompt: '我喜欢______',
    options: [
      { id: 'A', label: '拆东西' },
      { id: 'B', label: '自始至终做事' },
      { id: 'C', label: '把事情搞清楚' },
      { id: 'D', label: '与人们交谈' },
      { id: 'E', label: '运用我的想象力' },
    ],
  },
  {
    id: 'style-9',
    prompt: '我考虑______',
    options: [
      { id: 'A', label: '正在做的事情' },
      { id: 'B', label: '预先计划' },
      { id: 'C', label: '我的计划' },
      { id: 'D', label: '人与人之间的关系' },
      { id: 'E', label: '概念' },
    ],
  },
  {
    id: 'style-10',
    prompt: '我感觉最好，当______的时候',
    options: [
      { id: 'A', label: '是出自本能' },
      { id: 'B', label: '我组织计划' },
      { id: 'C', label: '我发明新东西' },
      { id: 'D', label: '我对人有帮助' },
      { id: 'E', label: '我思考和创作' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════
// Part 4.3: Sensory Preference (感官偏好)
// ═══════════════════════════════════════════════════════════════

export type AspSensoryQuestion = {
  id: string
  prompt: string
  options: Array<{ id: string; label: string; channel: 'auditory' | 'visual' | 'kinesthetic' }>
}

export const ASP_SENSORY_QUESTIONS: AspSensoryQuestion[] = [
  {
    id: 'sense-1',
    prompt: '我喜欢______',
    options: [
      { id: 'A', label: '听故事', channel: 'auditory' },
      { id: 'B', label: '看电影', channel: 'visual' },
      { id: 'C', label: '户外活动', channel: 'kinesthetic' },
    ],
  },
  {
    id: 'sense-2',
    prompt: '我喜欢______',
    options: [
      { id: 'A', label: '听音乐', channel: 'auditory' },
      { id: 'B', label: '阅读书籍', channel: 'visual' },
      { id: 'C', label: '走路或跑步', channel: 'kinesthetic' },
    ],
  },
  {
    id: 'sense-3',
    prompt: '我喜欢______',
    options: [
      { id: 'A', label: '收听音乐', channel: 'auditory' },
      { id: 'B', label: '看电视', channel: 'visual' },
      { id: 'C', label: '玩游戏', channel: 'kinesthetic' },
    ],
  },
  {
    id: 'sense-4',
    prompt: '我最好的记忆方式______',
    options: [
      { id: 'A', label: '对自己反复地说', channel: 'auditory' },
      { id: 'B', label: '在脑海里构思图像', channel: 'visual' },
      { id: 'C', label: '动手做', channel: 'kinesthetic' },
    ],
  },
  {
    id: 'sense-5',
    prompt: '我能较好的理解说明书，当______',
    options: [
      { id: 'A', label: '有人对我解释时', channel: 'auditory' },
      { id: 'B', label: '我自己看着说明书或图片时', channel: 'visual' },
      { id: 'C', label: '有人给我演示时', channel: 'kinesthetic' },
    ],
  },
  {
    id: 'sense-6',
    prompt: '当我思考时______',
    options: [
      { id: 'A', label: '我自言自语', channel: 'auditory' },
      { id: 'B', label: '我在脑海里过电影', channel: 'visual' },
      { id: 'C', label: '我需要来回走动', channel: 'kinesthetic' },
    ],
  },
  {
    id: 'sense-7',
    prompt: '通常______',
    options: [
      { id: 'A', label: '我记住人们说的话', channel: 'auditory' },
      { id: 'B', label: '我留心事物的外观、色彩和图案', channel: 'visual' },
      { id: 'C', label: '我经常摆弄桌上的物品或口袋里的东西', channel: 'kinesthetic' },
    ],
  },
  {
    id: 'sense-8',
    prompt: '我习惯于______',
    options: [
      { id: 'A', label: '听', channel: 'auditory' },
      { id: 'B', label: '看', channel: 'visual' },
      { id: 'C', label: '做', channel: 'kinesthetic' },
    ],
  },
]

