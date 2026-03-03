import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { CoachWorkspace } from '../components/coach/coach-workspace'

export function YunkeAdvisorTrainingPage() {
  useDocumentTitle('课程顾问陪练')

  return (
    <Main fixed className='pt-0'>
      <CoachWorkspace />
    </Main>
  )
}
