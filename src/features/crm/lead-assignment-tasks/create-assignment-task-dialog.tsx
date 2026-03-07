import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useMutation } from '@tanstack/react-query'
import { IconUserAdd } from '@douyinfe/semi-icons'
import {
  Button,
  Input,
  Modal,
  Space,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui-19'
import { showApiErrorToast } from '@/lib/api/error-toast'
import {
  ApiClientError,
  isApiResponse,
  normalizeAxiosError,
} from '@/lib/api/response-handler'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'
import type { EmployeeListItem } from '@/features/crm/leads/api'
import type { LeadListItem } from '@/features/crm/leads/types'
import { leadAssignmentTasksApi } from './api'
import type { LeadAssignmentTaskConflictItem } from './types'

const { Text } = Typography

interface CreateAssignmentTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeads: LeadListItem[]
  onSuccess: (taskId: string) => void
}

function buildDefaultTaskName(
  selectedLeads: LeadListItem[],
  advisorName?: string | null
) {
  const dateText = format(new Date(), 'yyyy-MM-dd')
  const uniqueChannels = Array.from(
    new Set(
      selectedLeads
        .map((lead) => lead.source_channel_name?.trim())
        .filter((value): value is string => Boolean(value))
    )
  )
  const channelText = uniqueChannels.length === 1 ? uniqueChannels[0] : '所选'
  const ownerText = advisorName || '待定负责人'
  return `${dateText} 分配给${ownerText}的${selectedLeads.length}条${channelText}线索`
}

function extractConflictItems(
  error: unknown
): LeadAssignmentTaskConflictItem[] {
  const normalized = normalizeAxiosError(error)
  const payload = normalized.response?.data
  if (!payload || !isApiResponse(payload)) return []
  const data = payload.data
  if (!data || typeof data !== 'object' || !('conflicts' in data)) return []
  const conflicts = (data as { conflicts?: LeadAssignmentTaskConflictItem[] })
    .conflicts
  return Array.isArray(conflicts) ? conflicts : []
}

export function CreateAssignmentTaskDialog({
  open,
  onOpenChange,
  selectedLeads,
  onSuccess,
}: CreateAssignmentTaskDialogProps) {
  const [advisor, setAdvisor] = useState<EmployeeListItem | null>(null)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [remark, setRemark] = useState('')
  const [nameTouched, setNameTouched] = useState(false)

  const defaultTaskName = useMemo(
    () => buildDefaultTaskName(selectedLeads, advisor?.name),
    [selectedLeads, advisor?.name]
  )

  useEffect(() => {
    if (!open) return
    if (!nameTouched) {
      setTaskName(defaultTaskName)
    }
  }, [defaultTaskName, nameTouched, open])

  useEffect(() => {
    if (!open) {
      setAdvisor(null)
      setSelectorOpen(false)
      setTaskName('')
      setRemark('')
      setNameTouched(false)
    }
  }, [open])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!advisor) {
        throw new ApiClientError('请选择负责人')
      }
      const response = await leadAssignmentTasksApi.createTask({
        name: taskName.trim(),
        advisor_id: advisor.id,
        lead_ids: selectedLeads.map((lead) => lead.id),
        remark: remark.trim() || undefined,
      })
      return response.data
    },
    onSuccess: (data) => {
      if (!data?.id) return
      onSuccess(data.id)
      onOpenChange(false)
    },
    onError: (error) => {
      const conflicts = extractConflictItems(error)
      if (conflicts.length > 0) {
        const taskNames = Array.from(
          new Set(conflicts.map((item) => item.task_name))
        )
        Modal.error({
          title: '存在任务冲突',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text>共 {conflicts.length} 条线索已存在于未完成任务单中。</Text>
              <Text type='tertiary'>
                冲突任务单：{taskNames.slice(0, 3).join('、')}
                {taskNames.length > 3 ? ` 等 ${taskNames.length} 个` : ''}
              </Text>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                {conflicts.slice(0, 8).map((item) => (
                  <div
                    key={`${item.task_id}-${item.lead_id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '6px 0',
                      borderBottom: '1px solid var(--semi-color-border)',
                    }}
                  >
                    <span>
                      {item.child_name ||
                        item.parent_name ||
                        item.parent_phone ||
                        item.lead_id}
                    </span>
                    <Text type='tertiary'>{item.task_name}</Text>
                  </div>
                ))}
              </div>
            </div>
          ),
          okText: '知道了',
          cancelButtonProps: { style: { display: 'none' } },
        })
        return
      }
      showApiErrorToast(error, '创建分配任务失败')
    },
  })

  const selectedChannelTags = useMemo(() => {
    const uniqueChannels = Array.from(
      new Set(
        selectedLeads
          .map((lead) => lead.source_channel_name?.trim())
          .filter((value): value is string => Boolean(value))
      )
    )
    return uniqueChannels.slice(0, 4)
  }, [selectedLeads])

  const handleSubmit = () => {
    if (!advisor) {
      Modal.warning({
        title: '请选择负责人',
        content: '分配任务单必须指定一位负责人。',
      })
      return
    }
    if (!taskName.trim()) {
      Modal.warning({
        title: '任务名称不能为空',
        content: '请填写任务名称后再提交。',
      })
      return
    }
    createMutation.mutate()
  }

  return (
    <>
      <Modal
        title='创建分配任务'
        visible={open}
        onCancel={() => onOpenChange(false)}
        width={720}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              theme='solid'
              loading={createMutation.isPending}
              onClick={handleSubmit}
            >
              创建并分配
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 16,
              padding: 16,
              borderRadius: 12,
              background:
                'linear-gradient(135deg, rgba(22,119,255,0.08), rgba(22,119,255,0.02))',
              border: '1px solid rgba(22,119,255,0.12)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text strong style={{ fontSize: 15 }}>
                已选择 {selectedLeads.length} 条线索
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedChannelTags.length > 0 ? (
                  selectedChannelTags.map((channel) => (
                    <Tag key={channel} color='blue' shape='circle'>
                      {channel}
                    </Tag>
                  ))
                ) : (
                  <Text type='tertiary'>未识别到渠道信息</Text>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type='tertiary' style={{ fontSize: 12 }}>
                本次操作会同步修改线索负责人
              </Text>
            </div>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              负责人
            </Text>
            <Space>
              <Button
                icon={<IconUserAdd />}
                onClick={() => setSelectorOpen(true)}
              >
                {advisor ? `已选择：${advisor.name}` : '选择负责人'}
              </Button>
              {advisor && (
                <Tag color='green' shape='circle'>
                  {advisor.campus_name ||
                    advisor.department_name ||
                    advisor.username}
                </Tag>
              )}
            </Space>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              任务名称
            </Text>
            <Input
              value={taskName}
              onChange={(value) => {
                setTaskName(value)
                setNameTouched(true)
              }}
              placeholder='请输入任务名称'
            />
            <Text
              type='tertiary'
              style={{ display: 'block', marginTop: 6, fontSize: 12 }}
            >
              默认按日期、负责人、数量和渠道自动生成，可直接修改。
            </Text>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              备注
            </Text>
            <TextArea
              value={remark}
              onChange={(value: string) => setRemark(value)}
              placeholder='可选，补充这次分配动作的说明'
              rows={4}
              maxCount={500}
              showClear
            />
          </div>
        </div>
      </Modal>

      <EmployeeSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={(employee) => {
          setAdvisor(employee)
          if (!nameTouched) {
            setTaskName(buildDefaultTaskName(selectedLeads, employee.name))
          }
        }}
        title='选择任务负责人'
        description='任务单目前只支持单负责人执行'
        confirmText='选定负责人'
        filterByAdvisorPosition
      />
    </>
  )
}
