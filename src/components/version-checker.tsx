import { useCallback } from 'react'
import { Notification, Button } from '@douyinfe/semi-ui-19'
import { useVersionCheck } from '@/hooks/use-version-check'

export function VersionChecker() {
  const handleNewVersion = useCallback(() => {
    Notification.info({
      title: '系统已更新',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span>检测到新版本，请刷新页面以获取最新功能。</span>
          <Button theme="solid" type="primary" onClick={() => window.location.reload()}>
            立即刷新
          </Button>
        </div>
      ),
      duration: 0,
      position: 'topRight',
    })
  }, [])

  useVersionCheck(handleNewVersion)

  return null
}
