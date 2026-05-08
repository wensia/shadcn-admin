import { EducationListPage } from './education-list-page'
import { educationPageConfigs } from './page-configs'

export function StudentsPage() {
  return <EducationListPage config={educationPageConfigs.students} />
}
