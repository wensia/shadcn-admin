/**
 * 组织架构树节点图标映射
 */
import {
  Map as MapIcon,
  MapPin,
  Building,
  Building2,
  Briefcase,
  Network,
  LayoutGrid,
} from 'lucide-react'
import type { OrgTreeNodeType } from '../../types'

export function OrgNodeIcon({
  type,
  className = 'h-4 w-4',
}: {
  type: OrgTreeNodeType
  className?: string
}) {
  switch (type) {
    case 'region':
      return <MapIcon className={className} />
    case 'district':
      return <MapPin className={className} />
    case 'area':
      return <Building className={className} />
    case 'area_office':
      return <LayoutGrid className={className} />
    case 'campus':
      return <Building2 className={className} />
    case 'campus_department':
    case 'area_department':
    case 'district_department':
      return <Briefcase className={className} />
    default:
      return <Network className={className} />
  }
}
