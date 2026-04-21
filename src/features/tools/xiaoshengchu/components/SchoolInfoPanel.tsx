import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/features/tools/xiaoshengchu/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/tools/xiaoshengchu/components/ui/card'
import { Badge } from '@/features/tools/xiaoshengchu/components/ui/badge'
import { type School } from '@/features/tools/xiaoshengchu/api'
import {
  useXiaoshengchuConfig,
  getSchoolsByDistrict,
  getSchoolColorType,
} from '@/features/tools/xiaoshengchu/context'
import {
  Building2,
  TrendingUp,
  MapPin,
  BookOpen,
  Star,
  UtensilsCrossed,
  GraduationCap,
  School as SchoolIcon,
  Search,
} from 'lucide-react'

interface SchoolInfoPanelProps {
  districtId: string | null
  selectedSchoolId: string | null
  onSchoolSelect: (schoolId: string | null) => void
  getSchoolPosition?: (schoolId: string) => number | null
}

export function SchoolInfoPanel({ districtId, selectedSchoolId, onSchoolSelect, getSchoolPosition }: SchoolInfoPanelProps) {
  const { config } = useXiaoshengchuConfig()
  const schools = districtId ? getSchoolsByDistrict(config, districtId) : { public: [], private: [] }
  const allSchools = [...schools.public, ...schools.private]
  const selectedSchool = allSchools.find(s => s.id === selectedSchoolId) || null

  if (!districtId) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" />
          <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">学校信息查询</span>
        </CardTitle>
        <div className="mt-2">
          <Select
            value={selectedSchoolId || ''}
            onValueChange={(v) => onSchoolSelect(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择学校查看详细信息" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>公办学校</SelectLabel>
                {schools.public.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}（{school.level}）
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>民办学校</SelectLabel>
                {schools.private.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}（{school.level}）
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      {selectedSchool && (
        <CardContent className="space-y-4">
          {/* 学校名称和标签 */}
          <div>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                {selectedSchool.name}
              </h3>
              {getSchoolPosition && getSchoolPosition(selectedSchool.id) && (
                <Badge variant="default" className="text-sm">
                  第{getSchoolPosition(selectedSchool.id)}志愿
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant={selectedSchool.type === 'public' ? 'secondary' : 'outline'}>
                {selectedSchool.type === 'public' ? '公办' : '民办'}
              </Badge>
              <Badge variant="warning">{selectedSchool.level}</Badge>
              <ColorTypeBadge schoolName={selectedSchool.name} />
            </div>
          </div>

          {/* 学校简介 */}
          <div className="text-sm text-muted-foreground leading-relaxed">
            {selectedSchool.description}
          </div>

          {/* 关键信息网格 */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="地址"
              value={selectedSchool.address}
            />
            <InfoItem
              icon={<Building2 className="h-4 w-4" />}
              label="学段"
              value={selectedSchool.hasHighSchool ? '初中+高中' : '仅初中'}
            />
            <InfoItem
              icon={<UtensilsCrossed className="h-4 w-4" />}
              label="食堂"
              value="有"
            />
            <InfoItem
              icon={<SchoolIcon className="h-4 w-4" />}
              label="2025招生"
              value={selectedSchool.enrollment2025 ? `${selectedSchool.enrollment2025}人` : '暂无数据'}
            />
          </div>

          {/* 学校特点 */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-amber-700">学校特点</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedSchool.features.map((feature, index) => (
                <Badge key={index} variant="outline" className="border-primary/20 bg-orange-50/50">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* 学校历史 */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-primary">学校历史</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedSchool.history}
            </p>
          </div>

          {/* 录取趋势 */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700">录取趋势</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedSchool.admissionTrend}
            </p>
          </div>

          {/* 升学率 */}
          <div className="rounded-xl bg-gradient-to-br from-orange-50/80 to-amber-50/50 p-3 border border-primary/10 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-primary">升学数据</span>
            </div>
            <p className="text-sm text-muted-foreground">{selectedSchool.enrollmentRate}</p>
            <p className="text-sm text-muted-foreground">{selectedSchool.highSchoolEnrollmentRate}</p>
          </div>

          {/* 录取概率参考 */}
          <div className="rounded-xl border border-dashed border-primary/20 bg-orange-50/30 p-3">
            <p className="text-xs font-medium mb-1">录取概率参考</p>
            <AdmissionRateDisplay school={selectedSchool} />
          </div>

          {/* 食堂信息 */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">食堂：</span>{selectedSchool.canteen}
          </div>
        </CardContent>
      )}
    </Card>
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
    return <Badge className="bg-blue-500 text-white border-transparent">未招满</Badge>
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
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  )
}

function AdmissionRateDisplay({ school }: { school: School }) {
  const rate = school.admissionRate as number | { first: number; other: number } | null | undefined
  if (rate === null || rate === undefined) return <p className="text-xs text-muted-foreground">暂无数据</p>

  if (typeof rate === 'number') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400"
            style={{ width: `${rate * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium">{Math.round(rate * 100)}%</span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>第一志愿录取率</span>
        <span className="font-medium">{Math.round(rate.first * 100)}%</span>
      </div>
      <div className="flex items-center justify-between text-xs text-rose-500">
        <span>非第一志愿录取率</span>
        <span className="font-medium">{rate.other * 100}%{school.type === 'private' ? '（民办仅第一志愿有效）' : ''}</span>
      </div>
    </div>
  )
}
