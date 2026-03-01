/**
 * 订单审批弹窗组件
 * Semi Design 重构版
 * 支持领导审批和财务确认
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Tag,
  Typography,
  TextArea,
  Toast,
  Descriptions,
} from '@douyinfe/semi-ui-19'
import { IconTick, IconClose } from '@douyinfe/semi-icons'
import {
  User,
  DollarSign,
  Clock,
  FileText,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { orderApi } from '../api'
import type { Order, OrderListItem } from '../types'
import { formatTime } from '@/lib/utils/time'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

// 审批类型
type ApprovalType = 'leader' | 'finance'

interface ApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | OrderListItem | null
  approvalType: ApprovalType
  onSuccess?: () => void
}

// 审批状态颜色映射
const approvalStatusColorMap: Record<string, string> = {
  pending: 'grey',
  leader_pending: 'blue',
  leader_rejected: 'red',
  finance_pending: 'violet',
  finance_rejected: 'red',
  approved: 'green',
  cancelled: 'grey'
}

export function ApprovalDialog({
  open,
  onOpenChange,
  order,
  approvalType,
  onSuccess
}: ApprovalDialogProps) {
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')

  const title = approvalType === 'leader' ? '领导审批' : '财务确认'
  const approveLabel = approvalType === 'leader' ? '审批通过' : '确认通过'
  const rejectLabel = approvalType === 'leader' ? '审批驳回' : '确认驳回'

  // 领导审批
  const leaderApproveMutation = useMutation({
    mutationFn: ({ orderId, action }: { orderId: string; action: 'approve' | 'reject' }) =>
      orderApi.leaderApprove(orderId, { action, comment: comment || undefined }),
    onSuccess: (_, { action }) => {
      Toast.success(action === 'approve' ? '审批通过成功' : '审批驳回成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['pending-leader-approvals'] })
      onOpenChange(false)
      setComment('')
      onSuccess?.()
    },
    onError: (error: any) => {
      showApiErrorToast(error, '操作失败')
    }
  })

  // 财务确认
  const financeApproveMutation = useMutation({
    mutationFn: ({ orderId, action }: { orderId: string; action: 'approve' | 'reject' }) =>
      orderApi.financeApprove(orderId, { action, comment: comment || undefined }),
    onSuccess: (_, { action }) => {
      Toast.success(action === 'approve' ? '确认通过成功' : '确认驳回成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['pending-finance-approvals'] })
      onOpenChange(false)
      setComment('')
      onSuccess?.()
    },
    onError: (error: any) => {
      showApiErrorToast(error, '操作失败')
    }
  })

  const handleApprove = () => {
    if (!order) return
    if (approvalType === 'leader') {
      leaderApproveMutation.mutate({ orderId: order.id, action: 'approve' })
    } else {
      financeApproveMutation.mutate({ orderId: order.id, action: 'approve' })
    }
  }

  const handleReject = () => {
    if (!order) return
    if (!comment.trim()) {
      Toast.error('驳回时必须填写审批意见')
      return
    }
    if (approvalType === 'leader') {
      leaderApproveMutation.mutate({ orderId: order.id, action: 'reject' })
    } else {
      financeApproveMutation.mutate({ orderId: order.id, action: 'reject' })
    }
  }

  const isLoading = leaderApproveMutation.isPending || financeApproveMutation.isPending

  if (!order) return null

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {approvalType === 'leader' ? (
            <User size={20} style={{ color: 'var(--semi-color-primary)' }} />
          ) : (
            <DollarSign size={20} style={{ color: '#7c3aed' }} />
          )}
          {title}
        </div>
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)} disabled={isLoading}>
            取消
          </Button>
          <Button
            type="danger"
            icon={<IconClose />}
            loading={isLoading}
            onClick={handleReject}
          >
            {rejectLabel}
          </Button>
          <Button
            theme="solid"
            style={{ backgroundColor: 'var(--semi-color-success)', borderColor: 'var(--semi-color-success)' }}
            icon={<IconTick />}
            loading={isLoading}
            onClick={handleApprove}
          >
            {approveLabel}
          </Button>
        </div>
      }
    >
      <Text type="tertiary" style={{ display: 'block', marginBottom: 16 }}>
        请审核以下订单信息，并决定是否通过
      </Text>

      {/* 订单摘要 */}
      <div style={{
        borderRadius: 8, padding: 16,
        background: 'var(--semi-color-fill-0)',
        border: '1px solid var(--semi-color-border)',
        marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Text type="tertiary" style={{ fontSize: 13, display: 'block' }}>订单编号</Text>
            <Text style={{ fontFamily: 'monospace', fontWeight: 500 }}>{order.order_no}</Text>
          </div>
          <div>
            <Text type="tertiary" style={{ fontSize: 13, display: 'block' }}>学员姓名</Text>
            <Text strong>{order.child_name || '-'}</Text>
          </div>
          <div>
            <Text type="tertiary" style={{ fontSize: 13, display: 'block' }}>订单金额</Text>
            <Text strong style={{ color: 'var(--semi-color-success)' }}>
              ¥{order.actual_amount.toLocaleString()}
            </Text>
          </div>
          <div>
            <Text type="tertiary" style={{ fontSize: 13, display: 'block' }}>当前状态</Text>
            <Tag color={approvalStatusColorMap[order.approval_status] || 'grey'} shape="circle">
              {order.approval_status_display}
            </Tag>
          </div>
          <div>
            <Text type="tertiary" style={{ fontSize: 13, display: 'block' }}>支付状态</Text>
            <Text>{order.payment_status_display}</Text>
          </div>
          <div>
            <Text type="tertiary" style={{ fontSize: 13, display: 'block' }}>创建时间</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} style={{ color: 'var(--semi-color-text-2)' }} />
              <Text type="tertiary">{formatTime(order.created_at)}</Text>
            </div>
          </div>
        </div>
      </div>

      {/* 审批意见 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <FileText size={14} />
          <Text strong style={{ fontSize: 14 }}>审批意见</Text>
          <Text type="tertiary" style={{ fontSize: 12 }}>（驳回时必填）</Text>
        </div>
        <TextArea
          value={comment}
          onChange={(val) => setComment(val)}
          placeholder="请输入审批意见..."
          rows={3}
          autosize={false}
        />
      </div>
    </Modal>
  )
}

// 提交审批确认弹窗
interface SubmitApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | OrderListItem | null
  onSuccess?: () => void
}

export function SubmitApprovalDialog({
  open,
  onOpenChange,
  order,
  onSuccess
}: SubmitApprovalDialogProps) {
  const queryClient = useQueryClient()

  const submitMutation = useMutation({
    mutationFn: (orderId: string) => orderApi.submitForApproval(orderId),
    onSuccess: () => {
      Toast.success('提交审批成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      showApiErrorToast(error, '提交失败')
    }
  })

  const handleSubmit = () => {
    if (!order) return
    submitMutation.mutate(order.id)
  }

  if (!order) return null

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={20} style={{ color: 'var(--semi-color-warning)' }} />
          确认提交审批
        </div>
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={460}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)} disabled={submitMutation.isPending}>
            取消
          </Button>
          <Button
            theme="solid"
            icon={<IconTick />}
            loading={submitMutation.isPending}
            onClick={handleSubmit}
          >
            确认提交
          </Button>
        </div>
      }
    >
      <Text type="tertiary" style={{ display: 'block', marginBottom: 16 }}>
        提交后订单将进入审批流程，请确认订单信息无误
      </Text>

      <div style={{
        borderRadius: 8, padding: 16,
        background: 'var(--semi-color-fill-0)',
        border: '1px solid var(--semi-color-border)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div>
            <Text type="tertiary">订单编号：</Text>
            <Text style={{ fontFamily: 'monospace' }}>{order.order_no}</Text>
          </div>
          <div>
            <Text type="tertiary">学员：</Text>
            <Text>{order.child_name || '-'}</Text>
          </div>
          <div>
            <Text type="tertiary">金额：</Text>
            <Text strong style={{ color: 'var(--semi-color-success)' }}>
              ¥{order.actual_amount.toLocaleString()}
            </Text>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// 取消订单确认弹窗
interface CancelOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | OrderListItem | null
  onSuccess?: () => void
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess
}: CancelOrderDialogProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => orderApi.cancelOrder(orderId, { reason: reason || undefined }),
    onSuccess: () => {
      Toast.success('订单已取消')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onOpenChange(false)
      setReason('')
      onSuccess?.()
    },
    onError: (error: any) => {
      showApiErrorToast(error, '取消失败')
    }
  })

  const handleCancel = () => {
    if (!order) return
    cancelMutation.mutate(order.id)
  }

  if (!order) return null

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--semi-color-danger)' }}>
          <XCircle size={20} />
          取消订单
        </div>
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={460}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)} disabled={cancelMutation.isPending}>
            返回
          </Button>
          <Button
            type="danger"
            theme="solid"
            icon={<IconClose />}
            loading={cancelMutation.isPending}
            onClick={handleCancel}
          >
            确认取消
          </Button>
        </div>
      }
    >
      <Text type="tertiary" style={{ display: 'block', marginBottom: 16 }}>
        取消后订单将无法恢复，请谨慎操作
      </Text>

      <div style={{
        borderRadius: 8, padding: 16,
        background: 'var(--semi-color-fill-0)',
        border: '1px solid var(--semi-color-border)',
        marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div>
            <Text type="tertiary">订单编号：</Text>
            <Text style={{ fontFamily: 'monospace' }}>{order.order_no}</Text>
          </div>
          <div>
            <Text type="tertiary">学员：</Text>
            <Text>{order.child_name || '-'}</Text>
          </div>
          <div>
            <Text type="tertiary">金额：</Text>
            <Text strong style={{ color: 'var(--semi-color-success)' }}>
              ¥{order.actual_amount.toLocaleString()}
            </Text>
          </div>
        </div>
      </div>

      <div>
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>取消原因（可选）</Text>
        <TextArea
          value={reason}
          onChange={(val) => setReason(val)}
          placeholder="请输入取消原因..."
          rows={2}
          autosize={false}
        />
      </div>
    </Modal>
  )
}
