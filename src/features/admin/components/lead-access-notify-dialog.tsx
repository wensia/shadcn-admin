/**
 * 线索访问通知配置弹窗
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal, Button, Select, Switch, Typography } from '@douyinfe/semi-ui-19'
import { leadAccessStatsApi, dingtalkRobotsApi } from '../api'
import type { DingtalkRobot } from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

interface LeadAccessNotifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadAccessNotifyDialog({
  open,
  onOpenChange,
}: LeadAccessNotifyDialogProps) {
  const queryClient = useQueryClient()

  // 表单状态
  const [robotId, setRobotId] = useState<string | null>(null)
  const [notifyAt80, setNotifyAt80] = useState(true)
  const [notifyAt100, setNotifyAt100] = useState(true)
  const [isActive, setIsActive] = useState(false)

  // 获取当前配置
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['lead-access-notify-config'],
    queryFn: () => leadAccessStatsApi.getNotifyConfig(),
    enabled: open,
  })

  // 获取机器人列表
  const { data: robots = [], isLoading: robotsLoading } = useQuery({
    queryKey: ['dingtalk-robots-active'],
    queryFn: () => dingtalkRobotsApi.getActive(),
    enabled: open,
  })

  // 初始化表单
  useEffect(() => {
    if (config) {
      setRobotId(config.robot_id)
      setNotifyAt80(config.notify_at_80)
      setNotifyAt100(config.notify_at_100)
      setIsActive(config.is_active)
    }
  }, [config])

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: leadAccessStatsApi.updateNotifyConfig,
    onSuccess: () => {
      toast.success('通知配置已更新')
      queryClient.invalidateQueries({ queryKey: ['lead-access-notify-config'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 保存配置
  const handleSave = () => {
    updateMutation.mutate({
      robot_id: robotId,
      notify_at_80: notifyAt80,
      notify_at_100: notifyAt100,
      is_active: isActive,
    })
  }

  const isLoading = configLoading || robotsLoading

  const robotOptions = [
    { label: '不选择', value: 'none' },
    ...robots.map((robot: DingtalkRobot) => ({
      label: robot.name,
      value: robot.id,
    })),
  ]

  return (
    <Modal
      title="通知设置"
      visible={open}
      onCancel={() => onOpenChange(false)}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            theme="solid"
            type="primary"
            onClick={handleSave}
            disabled={isLoading}
            loading={updateMutation.isPending}
          >
            保存
          </Button>
        </div>
      }
      width={480}
    >
      <Text type="tertiary" size="small">
        配置线索访问使用率达到阈值时的钉钉通知
      </Text>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--semi-color-text-2)' }} />
        </div>
      ) : (
        <div className="space-y-6 py-4">
          {/* 钉钉机器人选择 */}
          <div className="space-y-2">
            <Text strong size="small">钉钉机器人</Text>
            <Select
              value={robotId || 'none'}
              onChange={(value) => setRobotId(value === 'none' ? null : value as string)}
              optionList={robotOptions}
              style={{ width: '100%' }}
              placeholder="选择钉钉机器人"
            />
            <Text type="tertiary" size="small">
              选择用于发送通知的钉钉群机器人
            </Text>
          </div>

          {/* 80% 阈值通知 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Text strong size="small">80% 阈值通知</Text>
              <div>
                <Text type="tertiary" size="small">
                  当顾问访问线索使用率达到 80% 时发送通知
                </Text>
              </div>
            </div>
            <Switch
              checked={notifyAt80}
              onChange={setNotifyAt80}
            />
          </div>

          {/* 100% 阈值通知 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Text strong size="small">100% 阈值通知</Text>
              <div>
                <Text type="tertiary" size="small">
                  当顾问访问线索达到每日上限时发送通知
                </Text>
              </div>
            </div>
            <Switch
              checked={notifyAt100}
              onChange={setNotifyAt100}
            />
          </div>

          {/* 启用通知 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Text strong>启用通知</Text>
              <div>
                <Text type="tertiary" size="small">
                  开启后，当顾问访问使用率达到阈值时会自动发送钉钉通知
                </Text>
              </div>
            </div>
            <Switch
              checked={isActive}
              onChange={setIsActive}
            />
          </div>

          {/* 配置说明 */}
          {config?.updated_at && (
            <Text type="tertiary" size="small">
              上次更新：{config.updated_by_name || '系统'} 于{' '}
              {new Date(config.updated_at).toLocaleString('zh-CN')}
            </Text>
          )}
        </div>
      )}
    </Modal>
  )
}
