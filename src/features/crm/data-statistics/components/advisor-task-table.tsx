import type { AdvisorTaskRow } from '../api/advisor-task-api'
import { AdvisorTaskMatrix } from './advisor-task-matrix'

export interface AdvisorTaskTableProps {
  rows: AdvisorTaskRow[]
  loading?: boolean
  onViewDetail: (row: AdvisorTaskRow) => void
  onOpenReview: (row: AdvisorTaskRow) => void
}

export function AdvisorTaskTable(props: AdvisorTaskTableProps) {
  return <AdvisorTaskMatrix {...props} />
}
