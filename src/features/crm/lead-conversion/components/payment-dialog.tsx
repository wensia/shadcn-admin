/**
 * 缴费记录弹窗组件 (Semi Design)
 * 支持新建和编辑缴费记录
 */

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Input,
  Select,
  Toast,
  Typography,
  Form,
} from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { UserPlus, X } from 'lucide-react'
import { paymentApi, employeeApi } from '../api'
import type { Payment, PaymentCreate, PaymentUpdate } from '../types'
import { LeadSelectDialog, type SelectedLead } from '@/features/crm/daily-control/components/lead-select-dialog'
import {
  paymentMethodOptions,
  paymentTypeOptions,
  paymentStatusOptions,
  PaymentMethod,
  PaymentType,
  PaymentStatus
} from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment | null
  onSuccess?: () => void
}

export function PaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: PaymentDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!payment?.id
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null)
  const [leadSelectOpen, setLeadSelectOpen] = useState(false)
  const formApiRef = useRef<FormApi>()

  // 获取收款人列表
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-payment'],
    queryFn: async () => {
      const response = await employeeApi.getEmployees({ is_active: true, size: 100 })
      return response.data?.items || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // 填充编辑数据
  useEffect(() => {
    if (payment && open) {
      formApiRef.current?.setValues({
        lead_id: payment.lead_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_type: payment.payment_type,
        payment_at: payment.payment_at.slice(0, 16),
        status: payment.status,
        collector_id: payment.collector_id || '',
        course_name: payment.course_name || '',
        course_hours: payment.course_hours || '',
        receipt_no: payment.receipt_no || '',
        contract_no: payment.contract_no || '',
        remark: payment.remark || '',
      })
      setSelectedLead({
        id: payment.lead_id,
        child_name: payment.child_name || '',
        parent_phone: payment.parent_phone || '',
      })
    } else if (!payment && open) {
      formApiRef.current?.setValues({
        lead_id: '',
        amount: 0,
        payment_method: PaymentMethod.WECHAT,
        payment_type: PaymentType.FULL_PAY,
        payment_at: new Date().toISOString().slice(0, 16),
        status: PaymentStatus.CONFIRMED,
        collector_id: '',
        course_name: '',
        course_hours: '',
        receipt_no: '',
        contract_no: '',
        remark: '',
      })
      setSelectedLead(null)
    }
  }, [payment, open])

  // 创建缴费记录
  const createMutation = useMutation({
    mutationFn: (data: PaymentCreate) => paymentApi.createPayment(data),
    onSuccess: () => {
      Toast.success({ content: '缴费记录创建成功' })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['conversion-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新缴费记录
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentUpdate }) =>
      paymentApi.updatePayment(id, data),
    onSuccess: () => {
      Toast.success({ content: '缴费记录更新成功' })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['conversion-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 选择线索
  const handleSelectLead = (lead: SelectedLead) => {
    setSelectedLead(lead)
    formApiRef.current?.setValue('lead_id', lead.id)
  }

  // 清除选择的线索
  const handleClearLead = () => {
    setSelectedLead(null)
    formApiRef.current?.setValue('lead_id', '')
  }

  // 提交表单
  const handleSubmit = (values: Record<string, any>) => {
    if (!values.lead_id) {
      Toast.warning({ content: '请选择线索' })
      return
    }
    const amount = parseFloat(values.amount)
    if (!amount || amount <= 0) {
      Toast.warning({ content: '金额必须大于0' })
      return
    }

    const data = {
      lead_id: values.lead_id,
      amount: amount,
      payment_method: values.payment_method,
      payment_type: values.payment_type,
      payment_at: new Date(values.payment_at).toISOString(),
      status: values.status,
      collector_id: values.collector_id || undefined,
      course_name: values.course_name || undefined,
      course_hours: values.course_hours ? parseInt(values.course_hours) : undefined,
      receipt_no: values.receipt_no || undefined,
      contract_no: values.contract_no || undefined,
      remark: values.remark || undefined,
    }

    if (isEdit && payment) {
      updateMutation.mutate({ id: payment.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Modal
        title={isEdit ? '编辑缴费记录' : '新建缴费记录'}
        visible={open}
        onCancel={() => onOpenChange(false)}
        width={672}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ overflow: 'auto' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              theme="solid"
              disabled={isSubmitting}
              onClick={() => formApiRef.current?.submitForm()}
            >
              {isSubmitting ? '提交中...' : isEdit ? '保存' : '创建'}
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => (formApiRef.current = api)}
          onSubmit={handleSubmit}
          initValues={{
            lead_id: '',
            amount: 0,
            payment_method: PaymentMethod.WECHAT,
            payment_type: PaymentType.FULL_PAY,
            payment_at: new Date().toISOString().slice(0, 16),
            status: PaymentStatus.CONFIRMED,
            collector_id: '',
            course_name: '',
            course_hours: '',
            receipt_no: '',
            contract_no: '',
            remark: '',
          }}
          labelPosition="top"
        >
          {/* 线索选择 */}
          <Form.Slot label="选择线索 *">
            {selectedLead ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 8, border: '1px solid var(--semi-color-border)',
                borderRadius: 4, backgroundColor: 'var(--semi-color-fill-0)',
              }}>
                <Text strong>{selectedLead.child_name || '-'}</Text>
                <Text type="tertiary">-</Text>
                <Text>{selectedLead.parent_phone}</Text>
                <Button
                  type="tertiary"
                  theme="borderless"
                  icon={<X style={{ width: 16, height: 16 }} />}
                  style={{ marginLeft: 'auto', padding: 4 }}
                  onClick={handleClearLead}
                />
              </div>
            ) : (
              <Button
                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--semi-color-text-2)' }}
                icon={<UserPlus style={{ width: 16, height: 16 }} />}
                onClick={() => setLeadSelectOpen(true)}
              >
                点击选择线索
              </Button>
            )}
          </Form.Slot>

          {/* 金额和支付方式 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Slot label="缴费金额 *">
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--semi-color-text-2)', zIndex: 1,
                }}>¥</span>
                <Input
                  type="number"
                  style={{ paddingLeft: 28 }}
                  placeholder="0.00"
                  value={formApiRef.current?.getValue('amount')?.toString()}
                  onChange={(v) => formApiRef.current?.setValue('amount', v)}
                />
              </div>
            </Form.Slot>
            <Form.Select
              field="payment_method"
              label="支付方式 *"
              rules={[{ required: true, message: '请选择支付方式' }]}
              optionList={paymentMethodOptions.map(o => ({ label: o.label, value: o.value }))}
            />
          </div>

          {/* 缴费类型和时间 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Select
              field="payment_type"
              label="缴费类型 *"
              rules={[{ required: true, message: '请选择缴费类型' }]}
              optionList={paymentTypeOptions.map(o => ({ label: o.label, value: o.value }))}
            />
            <Form.Input
              field="payment_at"
              label="缴费时间 *"
              type="datetime-local"
              rules={[{ required: true, message: '请选择缴费时间' }]}
            />
          </div>

          {/* 收款人和状态 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Select
              field="collector_id"
              label="收款人"
              placeholder="选择收款人"
              showClear
              optionList={[
                { label: '不指定', value: '' },
                ...(employeesData?.map((emp) => ({
                  label: emp.name,
                  value: emp.id,
                })) || []),
              ]}
            />
            <Form.Select
              field="status"
              label="缴费状态 *"
              rules={[{ required: true, message: '请选择状态' }]}
              optionList={paymentStatusOptions.map(o => ({ label: o.label, value: o.value }))}
            />
          </div>

          {/* 课程信息 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Input field="course_name" label="课程名称" placeholder="请输入课程名称" />
            <Form.InputNumber field="course_hours" label="课时数" min={0} placeholder="请输入课时数" />
          </div>

          {/* 收据和合同编号 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Input field="receipt_no" label="收据编号" placeholder="请输入收据编号" />
            <Form.Input field="contract_no" label="合同编号" placeholder="请输入合同编号" />
          </div>

          {/* 备注 */}
          <Form.TextArea field="remark" label="备注" placeholder="请输入备注信息" rows={3} />
        </Form>
      </Modal>

      {/* 线索选择弹窗 */}
      <LeadSelectDialog
        open={leadSelectOpen}
        onOpenChange={setLeadSelectOpen}
        onSelect={handleSelectLead}
        title="选择线索"
        description="选择要登记缴费的线索"
      />
    </>
  )
}
