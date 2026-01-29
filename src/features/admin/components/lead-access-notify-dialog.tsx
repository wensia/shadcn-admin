/**
 * 线索访问通知配置弹窗
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { leadAccessStatsApi, dingtalkRobotsApi } from '../api'
import type { LeadAccessNotifyConfig, DingtalkRobot } from '../types'

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
      toast.error(`更新失败: ${error.message}`)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>通知设置</DialogTitle>
          <DialogDescription>
            配置线索访问使用率达到阈值时的钉钉通知
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 钉钉机器人选择 */}
            <div className="space-y-2">
              <Label htmlFor="robot">钉钉机器人</Label>
              <Select
                value={robotId || 'none'}
                onValueChange={(value) => setRobotId(value === 'none' ? null : value)}
              >
                <SelectTrigger id="robot">
                  <SelectValue placeholder="选择钉钉机器人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不选择</SelectItem>
                  {robots.map((robot: DingtalkRobot) => (
                    <SelectItem key={robot.id} value={robot.id}>
                      {robot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择用于发送通知的钉钉群机器人
              </p>
            </div>

            {/* 80% 阈值通知 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-80">80% 阈值通知</Label>
                <p className="text-xs text-muted-foreground">
                  当顾问访问线索使用率达到 80% 时发送通知
                </p>
              </div>
              <Switch
                id="notify-80"
                checked={notifyAt80}
                onCheckedChange={setNotifyAt80}
              />
            </div>

            {/* 100% 阈值通知 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-100">100% 阈值通知</Label>
                <p className="text-xs text-muted-foreground">
                  当顾问访问线索达到每日上限时发送通知
                </p>
              </div>
              <Switch
                id="notify-100"
                checked={notifyAt100}
                onCheckedChange={setNotifyAt100}
              />
            </div>

            {/* 启用通知 */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is-active" className="text-base">
                  启用通知
                </Label>
                <p className="text-xs text-muted-foreground">
                  开启后，当顾问访问使用率达到阈值时会自动发送钉钉通知
                </p>
              </div>
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* 配置说明 */}
            {config?.updated_at && (
              <p className="text-xs text-muted-foreground">
                上次更新：{config.updated_by_name || '系统'} 于{' '}
                {new Date(config.updated_at).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
