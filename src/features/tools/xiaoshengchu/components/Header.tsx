import { GraduationCap } from 'lucide-react'
import { DistrictSelect } from './DistrictSelect'

interface HeaderProps {
  districtId: string | null
  onDistrictChange: (districtId: string | null) => void
}

export function Header({ districtId, onDistrictChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm no-print">
      <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              天津河西区小升初志愿模拟器
            </h1>
            <p className="text-[11px] text-muted-foreground">
              河西区 · 2025年
            </p>
          </div>
        </div>

        <DistrictSelect
          value={districtId}
          onChange={onDistrictChange}
        />
      </div>
    </header>
  )
}
