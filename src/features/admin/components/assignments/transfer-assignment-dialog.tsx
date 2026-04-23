import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Button,
  Input,
  Modal,
  Select,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui-19'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'
import { adminApi } from '../../api'
import {
  ASSIGNMENT_ROLE_LABELS,
  SINGLETON_ROLES,
  type AssignmentItem,
  type AssignmentTransferRequest,
} from '../../types'
import { scopeLabel } from '../../lib/assignment-format'

const { Text } = Typography

export interface TransferAssignmentDialogProps {
  open: boolean
  onClose: () => void
  assignment: AssignmentItem | null
  onSuccess: () => void
}

export function TransferAssignmentDialog({
  open,
  onClose,
  assignment,
  onSuccess,
}: TransferAssignmentDialogProps) {
  const [mode, setMode] = useState<'transfer' | 'promote'>('transfer')
  const [newEmployeeId, setNewEmployeeId] = useState<string>('')
  const [newEmployeeName, setNewEmployeeName] = useState<string>('')
  const [newRank, setNewRank] = useState<number | undefined>(undefined)
  const [remark, setRemark] = useState<string>('')
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setMode('transfer')
      setNewEmployeeId('')
      setNewEmployeeName('')
      setNewRank(undefined)
      setRemark('')
      setEmployeeSelectorOpen(false)
    }
  }, [open])

  const isSingleton = assignment ? SINGLETON_ROLES.includes(assignment.role) : false

  const transferMutation = useMutation({
    mutationFn: (data: AssignmentTransferRequest) =>
      adminApi.transferAssignment(assignment?.id ?? '', data),
    onSuccess: () => {
      toast.success('交接成功')
      onSuccess()
      onClose()
    },
    onError: (error: Error) => showApiErrorToast(error, '交接失败'),
  })

  const handleSubmit = () => {
    const payload: AssignmentTransferRequest = { remark: remark || null }
    if (mode === 'transfer') {
      if (!newEmployeeId) {
        toast.warning('请选择新员工')
        return
      }
      payload.new_employee_id = newEmployeeId
    } else {
      if (newRank === undefined) {
        toast.warning('请选择新 rank')
        return
      }
      payload.new_rank = newRank
    }
    transferMutation.mutate(payload)
  }

  return (
    <>
      <Modal
        title={
          <span>
            交接/晋升：
            {assignment && (
              <Tag color="blue" className="ml-2">
                {ASSIGNMENT_ROLE_LABELS[assignment.role]}
              </Tag>
            )}
          </span>
        }
        visible={open}
        onCancel={onClose}
        onOk={handleSubmit}
        confirmLoading={transferMutation.isPending}
        width={520}
      >
        <div className="space-y-4">
          <div className="p-3 bg-[var(--semi-color-fill-0)] rounded-md">
            <Text type="tertiary" className="text-xs block">
              原任命
            </Text>
            <div className="mt-1">
              <Text strong>{assignment?.employee_name}</Text>
              {assignment && (
                <Text type="tertiary" className="ml-2 text-xs">
                  {scopeLabel(assignment)}
                </Text>
              )}
              {assignment && assignment.rank > 0 && (
                <Tag size="small" color="grey" className="ml-2">
                  副职 #{assignment.rank}
                </Tag>
              )}
            </div>
          </div>

          {!isSingleton && (
            <div>
              <Text strong className="block mb-2">
                操作类型
              </Text>
              <Select
                value={mode}
                onChange={(v) => setMode(v as typeof mode)}
                style={{ width: '100%' }}
              >
                <Select.Option value="transfer">交接给其他员工</Select.Option>
                <Select.Option value="promote">调整 rank（晋升/降级）</Select.Option>
              </Select>
            </div>
          )}

          {mode === 'transfer' ? (
            <div>
              <Text strong className="block mb-2">
                新员工
              </Text>
              <div className="flex gap-2">
                <Input value={newEmployeeName || '未选择'} readOnly style={{ flex: 1 }} />
                <Button onClick={() => setEmployeeSelectorOpen(true)}>选择员工</Button>
              </div>
            </div>
          ) : (
            <div>
              <Text strong className="block mb-2">
                新排序 (rank)
              </Text>
              <Select
                value={newRank}
                onChange={(v) => setNewRank(v as number)}
                placeholder="选择新 rank"
                style={{ width: '100%' }}
              >
                <Select.Option value={0}>正职 (0)</Select.Option>
                <Select.Option value={1}>副职 #1</Select.Option>
                <Select.Option value={2}>副职 #2</Select.Option>
                <Select.Option value={3}>副职 #3</Select.Option>
              </Select>
            </div>
          )}

          <div>
            <Text strong className="block mb-2">
              备注（可选）
            </Text>
            <TextArea
              value={remark}
              onChange={setRemark}
              placeholder="交接原因"
              rows={2}
              maxLength={500}
            />
          </div>
        </div>
      </Modal>

      <EmployeeSelectorDialog
        open={employeeSelectorOpen}
        onOpenChange={setEmployeeSelectorOpen}
        onSelect={(emp) => {
          setNewEmployeeId(emp.id)
          setNewEmployeeName(emp.name)
          setEmployeeSelectorOpen(false)
        }}
        title="选择新员工"
        excludeIds={assignment ? [assignment.employee_id] : []}
        filterByAdvisorPosition={false}
      />
    </>
  )
}
