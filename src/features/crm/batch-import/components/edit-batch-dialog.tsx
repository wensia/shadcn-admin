/**
 * 编辑批次弹窗
 * 从 frontend-vue/src/views/crm/BatchImportView.vue 迁移
 */

import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import { batchImportApi } from '../api'
import type { BatchImportItem } from '../types'

interface EditBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: BatchImportItem | null
  onSuccess?: () => void
}

// 表单验证 schema
const formSchema = z.object({
  batch_name: z.string().min(1, '批次名称不能为空').max(100, '批次名称不能超过100个字符'),
  batch_description: z.string().max(500, '批次备注不能超过500个字符').optional(),
})

type FormValues = z.infer<typeof formSchema>

export function EditBatchDialog({ open, onOpenChange, batch, onSuccess }: EditBatchDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batch_name: '',
      batch_description: '',
    },
  })

  // 当 batch 变化时重置表单
  useEffect(() => {
    if (batch && open) {
      form.reset({
        batch_name: batch.batch_name,
        batch_description: batch.batch_description || '',
      })
    }
  }, [batch, open, form])

  // 更新 mutation
  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!batch) throw new Error('批次信息不存在')
      return batchImportApi.updateBatch(batch.id, values)
    },
    onSuccess: () => {
      toast.success('更新成功')
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
    },
  })

  // 关闭弹窗
  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  // 提交表单
  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values)
  }

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑批次</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="batch_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>批次名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入批次名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="batch_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>批次备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="可选，添加批次备注信息"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                取消
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
