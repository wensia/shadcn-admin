import { EducationListPage } from './education-list-page'
import { educationPageConfigs } from './page-configs'

export function LessonsPage() {
  return <EducationListPage config={educationPageConfigs.lessons} />
}
