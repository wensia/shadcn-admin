import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/tools/xiaoshengchu/components/ui/select'
import { useXiaoshengchuConfig } from '@/features/tools/xiaoshengchu/context'

interface DistrictSelectProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function DistrictSelect({ value, onChange }: DistrictSelectProps) {
  const { config } = useXiaoshengchuConfig()
  return (
    <Select
      value={value || ''}
      onValueChange={(v) => onChange(v || null)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="选择片区" />
      </SelectTrigger>
      <SelectContent>
        {config.districts.map((district) => (
          <SelectItem key={district.id} value={district.id}>
            {district.name}（{district.publicSchools.length + district.privateSchools.length}校）
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
