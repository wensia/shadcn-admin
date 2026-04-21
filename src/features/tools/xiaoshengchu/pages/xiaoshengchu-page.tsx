import { useState } from 'react'
import { Header } from '@/features/tools/xiaoshengchu/components/Header'
import { VolunteerForm } from '@/features/tools/xiaoshengchu/components/VolunteerForm'
import { AnalysisPanel } from '@/features/tools/xiaoshengchu/components/AnalysisPanel'
import { SchoolInfoDialog } from '@/features/tools/xiaoshengchu/components/SchoolInfoDialog'
import { Button } from '@/features/tools/xiaoshengchu/components/ui/button'
import { TooltipProvider } from '@/features/tools/xiaoshengchu/components/ui/tooltip'
import { useVolunteers } from '@/features/tools/xiaoshengchu/hooks/useVolunteers'
import { type School, type Config } from '@/features/tools/xiaoshengchu/api'
import { XiaoshengchuConfigProvider } from '@/features/tools/xiaoshengchu/context'
import { Printer, RotateCcw, Save } from 'lucide-react'

interface XiaoshengchuPageProps {
  config: Config
  accessTicket: string | null
  isAuthenticated: boolean
}

export function XiaoshengchuPage({ config, accessTicket, isAuthenticated }: XiaoshengchuPageProps) {
  const {
    districtId,
    volunteers,
    volunteerCount,
    filledCount,
    analysis,
    updateDistrict,
    updateVolunteer,
    clearVolunteers,
    resetAll,
    getSchoolPosition,
  } = useVolunteers({ config, accessTicket, isAuthenticated })

  const [dialogSchoolId, setDialogSchoolId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSchoolClick = (school: School) => {
    setDialogSchoolId(school.id)
    setDialogOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSave = () => {
    alert('志愿表已自动保存到本地浏览器')
  }

  return (
    <XiaoshengchuConfigProvider config={config} accessTicket={accessTicket} isAuthenticated={isAuthenticated}>
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Header districtId={districtId} onDistrictChange={updateDistrict} />

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <VolunteerForm
            districtId={districtId}
            volunteers={volunteers}
            volunteerCount={volunteerCount}
            onVolunteerChange={updateVolunteer}
            onClear={clearVolunteers}
            onSchoolClick={handleSchoolClick}
          />

          <AnalysisPanel analysis={analysis} filledCount={filledCount} />

          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" className="flex-1" onClick={handleSave} disabled={filledCount === 0}>
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
            <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={filledCount === 0}>
              <Printer className="mr-2 h-4 w-4" />
              打印
            </Button>
            <Button variant="outline" className="flex-1" onClick={resetAll}>
              <RotateCcw className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
        </main>

        <footer className="border-t py-6 no-print">
          <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground">
            <p>本工具仅供参考，实际录取以官方摇号结果为准</p>
            <p className="mt-1">数据来源：天津市河西区教育局公开信息</p>
          </div>
        </footer>

        <SchoolInfoDialog
          schoolId={dialogSchoolId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          volunteerPosition={dialogSchoolId ? getSchoolPosition(dialogSchoolId) : null}
        />
      </div>
    </TooltipProvider>
    </XiaoshengchuConfigProvider>
  )
}
