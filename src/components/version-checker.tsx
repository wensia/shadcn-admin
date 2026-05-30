import { useCallback } from 'react'
import { Notification, Button } from '@douyinfe/semi-ui-19'
import { IconRefresh } from '@douyinfe/semi-icons'
import { useVersionCheck } from '@/hooks/use-version-check'

export function VersionChecker() {
  const handleNewVersion = useCallback(() => {
    Notification.info({
      title: '系统已更新',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span>检测到新版本，请刷新页面以获取最新功能。</span>
          <Button
            theme="solid"
            type="primary"
            icon={<IconRefresh />}
            onClick={() => window.location.reload()}
            title="立即刷新"
            aria-label="立即刷新"
          />
        </div>
      ),
      duration: 0,
      position: 'topRight',
    })
  }, [])

  useVersionCheck(handleNewVersion)

  return null
}
