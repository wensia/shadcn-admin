import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/features/tools/xiaoshengchu/components/ui/dialog'
import { Badge } from '@/features/tools/xiaoshengchu/components/ui/badge'
import { type School } from '@/features/tools/xiaoshengchu/api'
import { useXiaoshengchuConfig, getSchoolColorType } from '@/features/tools/xiaoshengchu/context'
import {
  Building2,
  TrendingUp,
  MapPin,
  BookOpen,
  Star,
  UtensilsCrossed,
  GraduationCap,
  School as SchoolIcon,
} from 'lucide-react'

interface SchoolInfoDialogProps {
  schoolId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  volunteerPosition?: number | null
}

export function SchoolInfoDialog({ schoolId, open, onOpenChange, volunteerPosition }: SchoolInfoDialogProps) {
  const { config } = useXiaoshengchuConfig()
  const school: School | undefined = schoolId ? config.schools[schoolId] : undefined
  if (!school) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-6">
            <div>
              <DialogTitle className="text-xl">
                {school.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {school.description}
              </DialogDescription>
            </div>
            {volunteerPosition && (
              <Badge variant="default" className="text-sm shrink-0">
                第{volunteerPosition}志愿
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* 标签 */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={school.type === 'public' ? 'secondary' : 'outline'}>
              {school.type === 'public' ? '公办' : '民办'}
            </Badge>
            <Badge variant="warning">{school.level}</Badge>
            <ColorTypeBadge schoolName={school.name} />
          </div>

          {/* 关键信息网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="地址"
              value={school.address}
            />
            <InfoItem
              icon={<Building2 className="h-4 w-4" />}
              label="学段"
              value={school.hasHighSchool ? '初中+高中' : '仅初中'}
            />
            <InfoItem
              icon={<UtensilsCrossed className="h-4 w-4" />}
              label="食堂"
              value="有"
            />
            <InfoItem
              icon={<SchoolIcon className="h-4 w-4" />}
              label="2025招生"
              value={school.enrollment2025 ? `${school.enrollment2025}人` : '暂无数据'}
            />
          </div>

          {/* 学校特点 */}
          <div>
            <SectionHeader icon={<Star className="h-4 w-4" />} title="学校特点" />
            <div className="flex flex-wrap gap-1.5">
              {school.features.map((feature, index) => (
                <Badge key={index} variant="outline">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* 两列布局：历史 + 录取趋势 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <SectionHeader icon={<BookOpen className="h-4 w-4" />} title="学校历史" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {school.history}
              </p>
            </div>
            <div>
              <SectionHeader icon={<TrendingUp className="h-4 w-4" />} title="录取趋势" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {school.admissionTrend}
              </p>
            </div>
          </div>

          {/* 升学率 */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <SectionHeader icon={<GraduationCap className="h-4 w-4" />} title="升学数据" />
            <p className="text-sm text-muted-foreground">{school.enrollmentRate}</p>
            <p className="text-sm text-muted-foreground">{school.highSchoolEnrollmentRate}</p>
          </div>

          {/* 底部信息行 */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* 录取概率参考 */}
            <div className="rounded-lg border border-dashed p-3">
              <p className="text-xs font-medium mb-2">录取概率参考</p>
              <AdmissionRateDisplay school={school} />
            </div>

            {/* 食堂信息 */}
            <div className="rounded-lg border border-dashed p-3">
              <p className="text-xs font-medium mb-2">食堂信息</p>
              <p className="text-sm text-muted-foreground">{school.canteen}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
      <span className="text-muted-foreground">{icon}</span>
      {title}
    </div>
  )
}

function ColorTypeBadge({ schoolName }: { schoolName: string }) {
  const { config } = useXiaoshengchuConfig()
  const school = Object.values(config.schools).find((s) => s.name === schoolName)
  const colorType = school ? getSchoolColorType(school) : 'normal'
  if (colorType === 'hot') {
    return <Badge variant="destructive">一志愿热门</Badge>
  }
  if (colorType === 'secondThird') {
    return <Badge variant="success">二三志愿录取</Badge>
  }
  if (colorType === 'unfulfilled') {
    return <Badge className="bg-blue-500/10 text-blue-700 border-transparent">未招满</Badge>
  }
  return null
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium truncate" title={value}>{value}</div>
    </div>
  )
}

function AdmissionRateDisplay({ school }: { school: School }) {
  const rate = school.admissionRate as number | { first: number; other: number } | null | undefined
  if (rate === null || rate === undefined) return <p className="text-xs text-muted-foreground">暂无数据</p>

  if (typeof rate === 'number') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${rate * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums">{Math.round(rate * 100)}%</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">第一志愿录取率</span>
        <span className="font-medium tabular-nums">{Math.round(rate.first * 100)}%</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">非第一志愿录取率</span>
        <span className="font-medium tabular-nums">{rate.other * 100}%{school.type === 'private' ? '（民办仅第一志愿有效）' : ''}</span>
      </div>
    </div>
  )
}
