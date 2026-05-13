/**
 * SMTP 邮件配置页面
 */

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Save, Send, ShieldCheck } from 'lucide-react'
import { Banner, Button, Form, Input, Skeleton, Space, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconRefresh } from '@douyinfe/semi-icons'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { emailConfigApi } from '../api'
import type { EmailConfigItem, EmailConfigUpsert } from '../types'

const { Text, Title } = Typography

interface EmailConfigFormValues extends EmailConfigUpsert {
  smtp_password?: string
}

const DEFAULT_FORM_VALUES: EmailConfigFormValues = {
  name: '默认邮件配置',
  provider: 'tencent_ses',
  smtp_host: 'smtp.qcloudmail.com',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: 'RMF CRM',
  smtp_use_tls: true,
  smtp_use_ssl: false,
  smtp_timeout_seconds: 20,
  is_active: true,
  notes: '',
}

function toFormValues(config?: EmailConfigItem): EmailConfigFormValues {
  if (!config) return DEFAULT_FORM_VALUES
  return {
    name: config.name || DEFAULT_FORM_VALUES.name,
    provider: config.provider === 'custom' ? 'custom' : 'tencent_ses',
    smtp_host: config.smtp_host || DEFAULT_FORM_VALUES.smtp_host,
    smtp_port: config.smtp_port || DEFAULT_FORM_VALUES.smtp_port,
    smtp_username: config.smtp_username || '',
    smtp_password: '',
    smtp_from_email: config.smtp_from_email || '',
    smtp_from_name: config.smtp_from_name || DEFAULT_FORM_VALUES.smtp_from_name,
    smtp_use_tls: config.smtp_use_tls,
    smtp_use_ssl: config.smtp_use_ssl,
    smtp_timeout_seconds: config.smtp_timeout_seconds || DEFAULT_FORM_VALUES.smtp_timeout_seconds,
    is_active: config.is_active,
    notes: config.notes || '',
  }
}

function normalizePayload(values: EmailConfigFormValues): EmailConfigUpsert {
  const payload: EmailConfigUpsert = {
    name: values.name?.trim() || DEFAULT_FORM_VALUES.name,
    provider: values.provider || 'tencent_ses',
    smtp_host: values.smtp_host?.trim() || DEFAULT_FORM_VALUES.smtp_host,
    smtp_port: Number(values.smtp_port || DEFAULT_FORM_VALUES.smtp_port),
    smtp_username: values.smtp_username?.trim() || '',
    smtp_from_email: values.smtp_from_email?.trim() || '',
    smtp_from_name: values.smtp_from_name?.trim() || DEFAULT_FORM_VALUES.smtp_from_name,
    smtp_use_tls: Boolean(values.smtp_use_tls),
    smtp_use_ssl: Boolean(values.smtp_use_ssl),
    smtp_timeout_seconds: Number(values.smtp_timeout_seconds || DEFAULT_FORM_VALUES.smtp_timeout_seconds),
    is_active: Boolean(values.is_active),
    notes: values.notes?.trim() || null,
  }
  const password = values.smtp_password?.trim()
  if (password) {
    payload.smtp_password = password
  }
  return payload
}

export function EmailConfigPage() {
  useDocumentTitle('邮件配置')
  const queryClient = useQueryClient()
  const [formApi, setFormApi] = useState<FormApi | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-email-config'],
    queryFn: () => emailConfigApi.get(),
  })

  useEffect(() => {
    if (!formApi) return
    formApi.setValues(toFormValues(data), { isOverride: true })
  }, [data, formApi])

  const saveMutation = useMutation({
    mutationFn: (values: EmailConfigFormValues) => emailConfigApi.save(normalizePayload(values)),
    onSuccess: (result) => {
      toast.success('邮件配置已保存')
      queryClient.setQueryData(['admin-email-config'], result)
      formApi?.setValue('smtp_password', '')
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '保存失败')
    },
  })

  const testMutation = useMutation({
    mutationFn: () => emailConfigApi.test(testEmail.trim() || undefined),
    onSuccess: (result) => {
      toast.success(result.message || '测试邮件已发送')
      queryClient.invalidateQueries({ queryKey: ['admin-email-config'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '测试失败')
    },
  })

  const sourceTag = useMemo(() => {
    if (!data) return null
    if (data.source === 'database') {
      return <Tag color="green">后台配置</Tag>
    }
    return <Tag color="orange">环境变量</Tag>
  }, [data])

  const passwordExtraText = data?.password_configured
    ? `当前已保存：${data.smtp_password_masked || '已配置'}。留空则沿用当前密码。`
    : '腾讯云邮件推送需在发信地址中设置 SMTP 密码。'

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={22} style={{ color: 'var(--semi-color-primary)' }} />
            <Title heading={3} style={{ margin: 0 }}>邮件配置</Title>
            {sourceTag}
          </div>
          <Text type="tertiary">配置员工邀请、密码重置等系统邮件的 SMTP 发信参数。</Text>
        </div>
        <Button
          icon={<IconRefresh />}
          onClick={() => refetch()}
          loading={isFetching}
          theme="light"
        >
          刷新
        </Button>
      </div>

      <Banner
        type="info"
        fullMode={false}
        bordered
        closeIcon={null}
        title="腾讯云邮件推送配置要点"
        description="发信域名需先完成 MX、SPF、DKIM、DMARC 验证；SMTP 密码在邮件推送控制台的发信地址中设置。常用 SMTP 地址为 smtp.qcloudmail.com，465 使用 SSL，587 使用 STARTTLS。"
      />

      {isLoading ? (
        <div style={{ padding: 20, border: '1px solid var(--semi-color-border)', borderRadius: 8 }}>
          <Skeleton.Paragraph rows={8} />
        </div>
      ) : (
        <div style={{ border: '1px solid var(--semi-color-border)', borderRadius: 8, background: 'var(--semi-color-bg-0)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--semi-color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: 'var(--semi-color-success)' }} />
              <Text strong>SMTP 参数</Text>
            </div>
          </div>

          <Form
            getFormApi={setFormApi}
            initValues={DEFAULT_FORM_VALUES}
            onSubmit={(values) => saveMutation.mutate(values as EmailConfigFormValues)}
            labelPosition="top"
            style={{ padding: 20 }}
            autoComplete="off"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '4px 16px' }}>
              <Form.Input
                field="name"
                label="配置名称"
                placeholder="默认邮件配置"
                rules={[{ required: true, message: '请输入配置名称' }]}
              />
              <Form.Select
                field="provider"
                label="服务商"
                optionList={[
                  { label: '腾讯云邮件推送', value: 'tencent_ses' },
                  { label: '自定义 SMTP', value: 'custom' },
                ]}
                rules={[{ required: true, message: '请选择服务商' }]}
              />
              <Form.Input
                field="smtp_host"
                label="SMTP 服务器"
                placeholder="smtp.qcloudmail.com"
                rules={[{ required: true, message: '请输入 SMTP 服务器地址' }]}
              />
              <Form.InputNumber
                field="smtp_port"
                label="端口"
                min={1}
                max={65535}
                style={{ width: '100%' }}
                rules={[{ required: true, message: '请输入 SMTP 端口' }]}
              />
              <Form.Input
                field="smtp_username"
                label="SMTP 用户名"
                placeholder="通常为发信地址"
                rules={[{ required: true, message: '请输入 SMTP 用户名' }]}
              />
              <Form.Input
                field="smtp_password"
                label="SMTP 密码"
                mode="password"
                placeholder={data?.password_configured ? '留空沿用当前密码' : '请输入 SMTP 密码'}
                extraText={passwordExtraText}
              />
              <Form.Input
                field="smtp_from_email"
                label="发件人邮箱"
                placeholder="noreply@example.com"
                rules={[{ required: true, message: '请输入发件人邮箱' }]}
              />
              <Form.Input
                field="smtp_from_name"
                label="发件人名称"
                placeholder="RMF CRM"
                rules={[{ required: true, message: '请输入发件人名称' }]}
              />
              <Form.InputNumber
                field="smtp_timeout_seconds"
                label="超时时间（秒）"
                min={1}
                max={120}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 8 }}>
              <Form.Slot label="STARTTLS">
                <Form.Switch
                  field="smtp_use_tls"
                  noLabel
                  onChange={(checked: boolean) => {
                    if (checked) formApi?.setValue('smtp_use_ssl', false)
                  }}
                />
              </Form.Slot>
              <Form.Slot label="SSL">
                <Form.Switch
                  field="smtp_use_ssl"
                  noLabel
                  onChange={(checked: boolean) => {
                    if (checked) formApi?.setValue('smtp_use_tls', false)
                  }}
                />
              </Form.Slot>
              <Form.Slot label="启用状态">
                <Form.Switch field="is_active" noLabel />
              </Form.Slot>
            </div>

            <Form.TextArea
              field="notes"
              label="备注"
              placeholder="可记录控制台发信地址、域名验证状态或运维说明"
              rows={3}
              maxCount={300}
              style={{ marginTop: 8 }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <Space>
                <Input
                  value={testEmail}
                  onChange={setTestEmail}
                  placeholder="测试收件人邮箱，留空发给当前账号"
                  style={{ width: 280 }}
                />
                <Button
                  icon={<Send size={16} />}
                  onClick={() => testMutation.mutate()}
                  loading={testMutation.isPending}
                  disabled={saveMutation.isPending}
                >
                  发送测试
                </Button>
              </Space>
              <Button
                theme="solid"
                type="primary"
                icon={<Save size={16} />}
                loading={saveMutation.isPending}
                onClick={() => formApi?.submitForm()}
              >
                保存配置
              </Button>
            </div>

            {data?.last_verified_at && (
              <div style={{ marginTop: 12 }}>
                <Text type="tertiary">上次测试成功：{new Date(data.last_verified_at).toLocaleString()}</Text>
              </div>
            )}
          </Form>
        </div>
      )}
    </div>
  )
}
