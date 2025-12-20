/**
 * 批量操作Dialogs组件集合
 * Mira风格: 紧凑布局、小字号
 */

import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, RefreshCw, Check } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { leadsApi, employeeApi, type EmployeeListItem, type Campus } from '../api'
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

  // 状态
  const [selectedAdvisor, setSelectedAdvisor] = useState<EmployeeListItem | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedCampus, setSelectedCampus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5

  // 获取校区列表
  const { data: campuses = [] } = useQuery({
    queryKey: ['user-campuses'],
    queryFn: async () => {
      return await employeeApi.getCurrentUserCampuses()
    },
    enabled: open,
    staleTime: 5 * 60 * 1000
  })

  // 获取顾问列表
  const { data: advisorData, isLoading, refetch } = useQuery({
    queryKey: ['course-advisors', page, pageSize, searchText, selectedCampus],
    queryFn: async () => {
      const response = await employeeApi.getCourseAdvisors({
        page,
        size: pageSize,
        search: searchText || undefined,
        campus_name: selectedCampus || undefined,
        is_active: true
      })
      return response.data
    },
    enabled: open
  })

  // 弹框关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSelectedAdvisor(null)
      setSearchText('')
      setSelectedCampus('')
      setPage(1)
    }
  }, [open])

  // 搜索时重置页码
  useEffect(() => {
    setPage(1)
  }, [searchText, selectedCampus])

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
    },
    onError: (error: any) => {
      toast.error(error.message || '批量分配失败')
    }
  })

  const handleSubmit = () => {
    if (!selectedAdvisor) {
      toast.warning('请选择顾问')
      return
    }
    assignMutation.mutate({
      lead_ids: selectedLeadIds,
      advisor_id: selectedAdvisor.id
    })
  }

  const handleRefresh = () => {
    setSearchText('')
    setSelectedCampus('')
    setPage(1)
    refetch()
  }

  const handleSelectAdvisor = (advisor: EmployeeListItem) => {
    if (selectedAdvisor?.id === advisor.id) {
      setSelectedAdvisor(null)
    } else {
      setSelectedAdvisor(advisor)
    }
  }

  // 获取顾问的校区和部门信息
  const getAdvisorInfo = (advisor: EmployeeListItem) => {
    const identity = advisor.employee_identities?.[0]
    return {
      campus: identity?.campus?.name || advisor.campus_name || '-',
      department: identity?.department?.name || advisor.department_name || '-',
      position: identity?.position?.name || advisor.position?.name || '-'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">选择课程顾问</DialogTitle>
          <DialogDescription className="text-xs">
            将 {selectedLeadIds.length} 条线索分配给顾问
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* 搜索栏 */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">搜索顾问</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="输入姓名或用户名搜索"
                  className="h-8 text-xs pl-8 w-48"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">校区</Label>
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="全部校区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-xs">全部校区</SelectItem>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.name} className="text-xs">
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              刷新
            </Button>
          </div>

          {/* 顾问表格 */}
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-14 text-xs text-center">选择</TableHead>
                  <TableHead className="w-24 text-xs">姓名</TableHead>
                  <TableHead className="w-28 text-xs">用户名</TableHead>
                  <TableHead className="w-24 text-xs">职位</TableHead>
                  <TableHead className="w-28 text-xs">校区</TableHead>
                  <TableHead className="w-24 text-xs">部门</TableHead>
                  <TableHead className="w-16 text-xs text-center">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : advisorData?.items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      暂无顾问数据
                    </TableCell>
                  </TableRow>
                ) : (
                  advisorData?.items?.map((advisor) => {
                    const isSelected = selectedAdvisor?.id === advisor.id
                    const info = getAdvisorInfo(advisor)
                    return (
                      <TableRow
                        key={advisor.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-primary/5'
                        )}
                        onClick={() => handleSelectAdvisor(advisor)}
                      >
                        <TableCell className="text-center">
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 mx-auto flex items-center justify-center transition-colors',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell className={cn('text-xs', isSelected && 'font-semibold text-primary')}>
                          {advisor.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {advisor.username}
                        </TableCell>
                        <TableCell>
                          {info.position !== '-' && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {info.position}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{info.campus}</TableCell>
                        <TableCell className="text-xs">{info.department}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={advisor.is_active ? 'default' : 'destructive'}
                            className="text-xs h-5"
                          >
                            {advisor.is_active ? '在职' : '离职'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* 分页 */}
          <div className="flex items-center justify-center gap-4 shrink-0 pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              共 {advisorData?.total || 0} 位顾问
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="text-xs px-2">
                第 {page} / {Math.max(1, Math.ceil((advisorData?.total || 0) / pageSize))} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={page >= Math.ceil((advisorData?.total || 0) / pageSize)}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2 shrink-0">
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
            disabled={!selectedAdvisor || assignMutation.isPending}
          >
            {assignMutation.isPending ? '分配中...' : selectedAdvisor ? `确定选择 ${selectedAdvisor.name}` : '请先选择顾问'}
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
                <SelectItem value="INVALID_LEAD" className="text-xs">无效线索</SelectItem>
                <SelectItem value="NO_FOLLOWUP" className="text-xs">长期无跟进</SelectItem>
                <SelectItem value="ADVISOR_TRANSFER" className="text-xs">顾问调整</SelectItem>
                <SelectItem value="MANUAL_RELEASE" className="text-xs">手动释放</SelectItem>
                <SelectItem value="OTHER" className="text-xs">其他</SelectItem>
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
