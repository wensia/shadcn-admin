import { useMemo } from 'react'
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
import { Button } from '@/features/tools/xiaoshengchu/components/ui/button'
import { type School } from '@/features/tools/xiaoshengchu/api'
import {
  useXiaoshengchuConfig,
  getSchoolsByDistrict,
  getSchoolColorType,
} from '@/features/tools/xiaoshengchu/context'
import { Trash2, Info } from 'lucide-react'

interface VolunteerFormProps {
  districtId: string | null
  volunteers: (string | null)[]
  volunteerCount: number
  onVolunteerChange: (index: number, schoolId: string | null) => void
  onClear: () => void
  onSchoolClick?: (school: School) => void
}

const colorLegend = [
  { color: 'bg-rose-500', label: '一志愿热门' },
  { color: 'bg-emerald-500', label: '二三志愿' },
  { color: 'bg-blue-500', label: '未招满' },
]

function SchoolColorDot({ school }: { school: School }) {
  const colorType = getSchoolColorType(school)
  if (colorType === 'hot') {
    return <span className="inline-block h-2 w-2 rounded-full bg-rose-500 shrink-0" title="一志愿热门" />
  }
  if (colorType === 'secondThird') {
    return <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="二三志愿录取" />
  }
  if (colorType === 'unfulfilled') {
    return <span className="inline-block h-2 w-2 rounded-full bg-blue-500 shrink-0" title="未招满" />
  }
  return null
}

export function VolunteerForm({
  districtId,
  volunteers,
  volunteerCount,
  onVolunteerChange,
  onClear,
  onSchoolClick,
}: VolunteerFormProps) {
  const { config } = useXiaoshengchuConfig()
  const districtSchools = useMemo(() => {
    if (!districtId) return { public: [], private: [] }
    return getSchoolsByDistrict(config, districtId)
  }, [config, districtId])

  const allSchools = useMemo(() => {
    return [...districtSchools.public, ...districtSchools.private]
  }, [districtSchools])

  const filledCount = volunteers.filter(v => v !== null).length

  if (!districtId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-base font-medium">
            请先选择片区
          </h3>
          <p className="text-sm text-muted-foreground">
            在页面顶部选择您所在的片区后，即可开始填报志愿
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              志愿填报
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              已填报 <span className="font-medium text-foreground">{filledCount}</span> / {volunteerCount} 个志愿
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={filledCount === 0}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            清空
          </Button>
        </div>
        {/* 颜色编码说明 */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {colorLegend.map(item => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          {Array.from({ length: volunteerCount }, (_, index) => {
            const selectedSchoolId = volunteers[index]
            const selectedSchool = selectedSchoolId ? config.schools[selectedSchoolId] : null
            const isSelected = (schoolId: string) => {
              const idx = volunteers.indexOf(schoolId)
              return idx >= 0 && idx !== index
            }
            const isDisabled = index > 0 && volunteers[index - 1] === null

            return (
              <div key={index} className="flex items-center gap-1.5">
                <span
                  className={`shrink-0 text-xs font-medium w-12 text-center py-1 rounded ${
                    selectedSchoolId
                      ? 'bg-primary text-primary-foreground'
                      : isDisabled
                      ? 'bg-muted text-muted-foreground/50'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  第{index + 1}志愿
                </span>
                <Select
                  value={selectedSchoolId || '__empty__'}
                  onValueChange={(v) => onVolunteerChange(index, v === '__empty__' ? null : v)}
                  disabled={isDisabled}
                >
                  <SelectTrigger className={`flex-1 min-w-0 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder={isDisabled ? '请先填写上一志愿' : '请选择学校'}>
                      {selectedSchool && (
                        <span className="flex items-center gap-1.5 overflow-hidden">
                          <SchoolColorDot school={selectedSchool} />
                          <span className="truncate">{selectedSchool.name}</span>
                          {selectedSchool.type === 'private' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">民办</Badge>
                          )}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">不填报</SelectItem>
                    <SelectSeparator />

                    <SelectGroup>
                      <SelectLabel>公办学校</SelectLabel>
                      {districtSchools.public.map((school) => (
                        <SelectItem
                          key={school.id}
                          value={school.id}
                          disabled={isSelected(school.id)}
                        >
                          <div className="flex items-center gap-2">
                            <SchoolColorDot school={school} />
                            <span>{school.name}</span>
                            <span className="text-[10px] text-muted-foreground">{school.level}</span>
                            {isSelected(school.id) && (
                              <span className="text-xs text-muted-foreground">
                                (已选为第{volunteers.indexOf(school.id) + 1}志愿)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>

                    <SelectSeparator />

                    <SelectGroup>
                      <SelectLabel>民办学校</SelectLabel>
                      {districtSchools.private.map((school) => (
                        <SelectItem
                          key={school.id}
                          value={school.id}
                          disabled={isSelected(school.id)}
                        >
                          <div className="flex items-center gap-2">
                            <SchoolColorDot school={school} />
                            <span>{school.name}</span>
                            <span className="text-[10px] text-muted-foreground">{school.level}</span>
                            {isSelected(school.id) && (
                              <span className="text-xs text-muted-foreground">
                                (已选为第{volunteers.indexOf(school.id) + 1}志愿)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {selectedSchool && onSchoolClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => onSchoolClick(selectedSchool)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* 学校快速预览 */}
        {allSchools.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">可选学校一览</h4>
            <div className="flex flex-wrap gap-1.5">
              {allSchools.map((school) => {
                const position = volunteers.indexOf(school.id)
                const isChosen = position >= 0

                return (
                  <button
                    key={school.id}
                    onClick={() => onSchoolClick?.(school)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors ${
                      isChosen
                        ? 'border-primary/30 bg-primary/5 text-foreground'
                        : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isChosen && (
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[10px] text-primary-foreground font-medium">
                        {position + 1}
                      </span>
                    )}
                    <SchoolColorDot school={school} />
                    <span>{school.name}</span>
                    {school.type === 'private' && (
                      <span className="text-[10px] text-muted-foreground">(民办)</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
