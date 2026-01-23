/**
 * 订单审批弹窗组件
 * 支持领导审批和财务确认
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  User,
  DollarSign,
  Clock
} from 'lucide-react'
import { orderApi } from '../api'
import type { Order, OrderListItem } from '../types'
import { formatTime } from '@/lib/utils/time'

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
  pending: 'bg-gray-100 text-gray-800',
  leader_pending: 'bg-blue-100 text-blue-800',
  leader_rejected: 'bg-red-100 text-red-800',
  finance_pending: 'bg-purple-100 text-purple-800',
  finance_rejected: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600'
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
      toast.success(action === 'approve' ? '审批通过成功' : '审批驳回成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['pending-leader-approvals'] })
      onOpenChange(false)
      setComment('')
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '操作失败')
    }
  })

  // 财务确认
  const financeApproveMutation = useMutation({
    mutationFn: ({ orderId, action }: { orderId: string; action: 'approve' | 'reject' }) =>
      orderApi.financeApprove(orderId, { action, comment: comment || undefined }),
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' ? '确认通过成功' : '确认驳回成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['pending-finance-approvals'] })
      onOpenChange(false)
      setComment('')
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '操作失败')
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
      toast.error('驳回时必须填写审批意见')
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {approvalType === 'leader' ? (
              <User className="h-5 w-5 text-blue-500" />
            ) : (
              <DollarSign className="h-5 w-5 text-purple-500" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            请审核以下订单信息，并决定是否通过
          </DialogDescription>
        </DialogHeader>

        {/* 订单摘要 */}
        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">订单编号</div>
                <div className="font-mono font-medium">{order.order_no}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">学员姓名</div>
                <div className="font-medium">{order.child_name || '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">订单金额</div>
                <div className="font-semibold text-green-600">
                  ¥{order.actual_amount.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">当前状态</div>
                <Badge className={cn('text-xs', approvalStatusColorMap[order.approval_status] || 'bg-gray-100')}>
                  {order.approval_status_display}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">支付状态</div>
                <div>{order.payment_status_display}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">创建时间</div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(order.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* 审批意见 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <FileText className="h-4 w-4" />
              审批意见
              <span className="text-muted-foreground text-xs">（驳回时必填）</span>
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入审批意见..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <XCircle className="h-4 w-4 mr-1" />
            )}
            {rejectLabel}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            {approveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      toast.success('提交审批成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '提交失败')
    }
  })

  const handleSubmit = () => {
    if (!order) return
    submitMutation.mutate(order.id)
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            确认提交审批
          </DialogTitle>
          <DialogDescription>
            提交后订单将进入审批流程，请确认订单信息无误
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">订单编号：</span>
                <span className="font-mono">{order.order_no}</span>
              </div>
              <div>
                <span className="text-muted-foreground">学员：</span>
                <span>{order.child_name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">金额：</span>
                <span className="font-semibold text-green-600">¥{order.actual_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            确认提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      toast.success('订单已取消')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onOpenChange(false)
      setReason('')
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '取消失败')
    }
  })

  const handleCancel = () => {
    if (!order) return
    cancelMutation.mutate(order.id)
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            取消订单
          </DialogTitle>
          <DialogDescription>
            取消后订单将无法恢复，请谨慎操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">订单编号：</span>
                <span className="font-mono">{order.order_no}</span>
              </div>
              <div>
                <span className="text-muted-foreground">学员：</span>
                <span>{order.child_name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">金额：</span>
                <span className="font-semibold text-green-600">¥{order.actual_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">取消原因（可选）</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入取消原因..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelMutation.isPending}
          >
            返回
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <XCircle className="h-4 w-4 mr-1" />
            )}
            确认取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
