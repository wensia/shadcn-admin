import { EducationListPage } from './education-list-page'
import { educationPageConfigs } from './page-configs'

export function TeachersPage() {
  return <EducationListPage config={educationPageConfigs.teachers} />
}
