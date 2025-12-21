import { useEffect } from 'react'

const APP_TITLE = 'RMF CRM'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${APP_TITLE}-${title}` : APP_TITLE
  }, [title])
}
