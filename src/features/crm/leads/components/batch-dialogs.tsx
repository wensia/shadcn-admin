/**
 * 批量操作Dialogs组件集合
 * Mira风格: 紧凑布局、小字号
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { leadsApi } from '../api'
import type { LeadStatus } from '../types'
import { leadStatusLabels } from '../types'

// ==================== 批量分配Dialog ====================
interface BatchAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchAssignDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess
}: BatchAssignDialogProps) {
  const queryClient = useQueryClient()
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('')

  // 获取顾问列表
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    enabled: open
  })

  // 批量分配Mutation
  const assignMutation = useMutation({
    mutationFn: async (data: { lead_ids: string[]; advisor_id: string }) => {
      const response = await leadsApi.batchAssignLeads(data)
      return response.data
    },
    onSuccess: () => {
      toast.success(`成功分配${selectedLeadIds.length}条线索`)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
      setSelectedAdvisorId('')
    },
    onError: (error: any) => {
      toast.error(error.message || '批量分配失败')
    }
  })

  const handleSubmit = () => {
    if (!selectedAdvisorId) {
      toast.warning('请选择顾问')
      return
    }
    assignMutation.mutate({
      lead_ids: selectedLeadIds,
      advisor_id: selectedAdvisorId
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">批量分配线索</DialogTitle>
          <DialogDescription className="text-xs">
            将{selectedLeadIds.length}条线索分配给顾问
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="advisor" className="text-xs font-semibold">
              选择顾问 <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedAdvisorId} onValueChange={setSelectedAdvisorId}>
              <SelectTrigger id="advisor" className="h-8 text-xs">
                <SelectValue placeholder="请选择顾问" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions?.advisors.map((advisor) => (
                  <SelectItem key={advisor.id} value={advisor.id} className="text-xs">
                    {advisor.name} ({advisor.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-8 text-xs"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="h-8 text-xs"
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? '分配中...' : '确定分配'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== 批量释放Dialog ====================
interface BatchReleaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchReleaseDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess
}: BatchReleaseDialogProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [remark, setRemark] = useState('')

  // 批量释放Mutation
  const releaseMutation = useMutation({
    mutationFn: async (data: { lead_ids: string[]; reason: string; remark?: string }) => {
      const response = await leadsApi.batchReleaseLeads(data)
      return response.data
    },
    onSuccess: () => {
      toast.success(`成功释放${selectedLeadIds.length}条线索到公海`)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
      setReason('')
      setRemark('')
    },
    onError: (error: any) => {
      toast.error(error.message || '批量释放失败')
    }
  })

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.warning('请输入释放理由')
      return
    }
    releaseMutation.mutate({
      lead_ids: selectedLeadIds,
      reason: reason.trim(),
      remark: remark.trim() || undefined
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">释放线索到公海</DialogTitle>
          <DialogDescription className="text-xs">
            将{selectedLeadIds.length}条线索释放到公海池
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs font-semibold">
              释放理由 <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" className="h-8 text-xs">
                <SelectValue placeholder="请选择释放理由" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="无效线索" className="text-xs">无效线索</SelectItem>
                <SelectItem value="长期无跟进" className="text-xs">长期无跟进</SelectItem>
                <SelectItem value="顾问调整" className="text-xs">顾问调整</SelectItem>
                <SelectItem value="其他" className="text-xs">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remark" className="text-xs font-semibold">
              备注说明
            </Label>
            <Textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="min-h-[60px] text-xs resize-none"
              placeholder="可选,补充说明"
            />
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-8 text-xs"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="h-8 text-xs"
            disabled={releaseMutation.isPending}
          >
            {releaseMutation.isPending ? '释放中...' : '确定释放'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== 批量修改状态Dialog ====================
interface BatchUpdateStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchUpdateStatusDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess
}: BatchUpdateStatusDialogProps) {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('')

  // 批量修改状态Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { lead_ids: string[]; status: LeadStatus }) => {
      const response = await leadsApi.batchUpdateStatus(data)
      return response.data
    },
    onSuccess: () => {
      toast.success(`成功修改${selectedLeadIds.length}条线索状态`)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
      setSelectedStatus('')
    },
    onError: (error: any) => {
      toast.error(error.message || '批量修改状态失败')
    }
  })

  const handleSubmit = () => {
    if (!selectedStatus) {
      toast.warning('请选择目标状态')
      return
    }
    updateStatusMutation.mutate({
      lead_ids: selectedLeadIds,
      status: selectedStatus as LeadStatus
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">批量修改状态</DialogTitle>
          <DialogDescription className="text-xs">
            修改{selectedLeadIds.length}条线索的状态
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="status" className="text-xs font-semibold">
              目标状态 <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as LeadStatus)}>
              <SelectTrigger id="status" className="h-8 text-xs">
                <SelectValue placeholder="请选择状态" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leadStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-8 text-xs"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="h-8 text-xs"
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? '修改中...' : '确定修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== 批量删除Dialog ====================
interface BatchDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess
}: BatchDeleteDialogProps) {
  const queryClient = useQueryClient()

  // 批量删除Mutation
  const deleteMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const response = await leadsApi.batchDeleteLeads(leadIds)
      return response.data
    },
    onSuccess: () => {
      toast.success(`成功删除${selectedLeadIds.length}条线索`)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || '批量删除失败')
    }
  })

  const handleConfirm = () => {
    deleteMutation.mutate(selectedLeadIds)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">确认删除线索</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            您确定要删除选中的 {selectedLeadIds.length} 条线索吗?
            <br />
            <span className="text-destructive font-semibold">此操作不可撤销!</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-8 text-xs">取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="h-8 text-xs bg-destructive hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '删除中...' : '确定删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
