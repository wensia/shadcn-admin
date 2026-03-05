/**
 * 渠道线索提交公开页 — Semi Design 默认样式版
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  Card,
  Tabs,
  TabPane,
  Form,
  Button,
  Spin,
  Banner,
  Empty,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconSend, IconRefresh, IconExternalOpen } from '@douyinfe/semi-icons'
import type { SourceChannelExtraField } from '@/features/crm/leads/types'
import {
  validateChannelToken,
  submitSingleLead,
  fetchChannelStats,
  fetchCampusEmployees,
  type SingleLeadResponse,
  type ValidateTokenResponse,
  type ChannelStatsResponse,
  type CampusEmployee,
} from '../api/channel-submit'

const { Title, Text } = Typography

type Phase = 'loading' | 'invalid' | 'form' | 'submitting' | 'result'

const STATUS_MAP: Record<
  SingleLeadResponse['status'],
  { label: string; bannerType: 'success' | 'warning' | 'info' | 'danger' }
> = {
  created: { label: '新线索，已录入', bannerType: 'success' },
  collision_taken: { label: '撞量，已接管', bannerType: 'warning' },
  collision_active: { label: '撞量，线索跟进中', bannerType: 'warning' },
  duplicate: { label: '本渠道已提交过', bannerType: 'info' },
  invalid: { label: '手机号格式错误', bannerType: 'danger' },
  error: { label: '提交出错', bannerType: 'danger' },
}

/* ─── 页面容器 ─── */
const pageStyle: React.CSSProperties = {
  height: '100dvh',
  backgroundColor: 'var(--semi-color-bg-1)',
  padding: '20px 16px',
  overflow: 'auto',
}
const centerStyle: React.CSSProperties = {
  maxWidth: 440,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '80svh',
}
const innerStyle: React.CSSProperties = { maxWidth: 440, margin: '0 auto' }

/* ═══════════════════ 统计面板 ═══════════════════ */

function StatsPanel({ token }: { token: string }) {
  const [stats, setStats] = useState<ChannelStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetchChannelStats(token)
      .then((res) => { setStats(res); setError('') })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '加载失败'),
      )
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
        <Spin size="large" />
        <Text type="tertiary" style={{ marginTop: 12 }}>加载统计数据...</Text>
      </div>
    )
  }

  if (error) {
    return <Banner type="danger" fullMode={false} closeIcon={null} description={error} />
  }

  if (!stats) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 汇总 - 4格 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--semi-color-fill-0)', textAlign: 'center' }}>
          <Text type="tertiary" size="small">今日成功</Text>
          <Title heading={2} style={{ color: 'var(--semi-color-success)', margin: '4px 0 0' }}>
            {stats.today_success}
          </Title>
        </div>
        <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--semi-color-fill-0)', textAlign: 'center' }}>
          <Text type="tertiary" size="small">今日提交</Text>
          <Title heading={2} style={{ color: 'var(--semi-color-primary)', margin: '4px 0 0' }}>
            {stats.today_count}
          </Title>
        </div>
        <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--semi-color-fill-0)', textAlign: 'center' }}>
          <Text type="tertiary" size="small">30天成功</Text>
          <Title heading={3} style={{ color: 'var(--semi-color-success)', margin: '4px 0 0' }}>
            {stats.total_success}
          </Title>
        </div>
        <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--semi-color-fill-0)', textAlign: 'center' }}>
          <Text type="tertiary" size="small">30天提交</Text>
          <Title heading={3} style={{ margin: '4px 0 0' }}>{stats.total_count}</Title>
        </div>
      </div>

      {/* 每日明细 - 双色堆叠条 */}
      <div style={{ border: '1px solid var(--semi-color-border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--semi-color-border)' }}>
          <Text strong>每日明细</Text>
        </div>
        {stats.daily_stats.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <Text type="tertiary">暂无提交记录</Text>
          </div>
        ) : (
          stats.daily_stats.map((item) => {
            const isToday = item.date === new Date().toISOString().slice(0, 10)
            const maxCount = Math.max(...stats.daily_stats.map((d) => d.total), 1)
            const totalBarWidth = Math.max((item.total / maxCount) * 100, 4)
            const successRatio = item.total > 0 ? (item.success / item.total) * 100 : 0
            return (
              <div
                key={item.date}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  backgroundColor: isToday ? 'var(--semi-color-primary-light-default)' : undefined,
                }}
              >
                <Text
                  strong={isToday}
                  type={isToday ? undefined : 'secondary'}
                  style={{ width: 56, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                >
                  {isToday ? '今天' : item.date.slice(5)}
                </Text>
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: 16, borderRadius: 4, overflow: 'hidden',
                    width: `${totalBarWidth}%`,
                    display: 'flex',
                    transition: 'width 0.3s ease',
                  }}>
                    {/* 成功部分 - 绿色 */}
                    <div style={{
                      width: `${successRatio}%`,
                      height: '100%',
                      backgroundColor: 'var(--semi-color-success)',
                      transition: 'width 0.3s ease',
                    }} />
                    {/* 失败部分 - 灰色 */}
                    <div style={{
                      width: `${100 - successRatio}%`,
                      height: '100%',
                      backgroundColor: 'var(--semi-color-fill-2)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
                <Text
                  strong
                  type={isToday ? undefined : 'secondary'}
                  style={{ width: 48, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                >
                  {item.success}/{item.total}
                </Text>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ═══════════════════ 主组件 ═══════════════════ */

export function LeadChannelSubmit() {
  const search = useSearch({ from: '/lead-submit' })
  const token = search.token ?? ''

  const [phase, setPhase] = useState<Phase>('loading')
  const [channelName, setChannelName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [requireCampusSelection, setRequireCampusSelection] = useState(false)
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([])
  const [selectedCampusId, setSelectedCampusId] = useState('')
  const [extraFields, setExtraFields] = useState<SourceChannelExtraField[]>([])

  const [campusEmployees, setCampusEmployees] = useState<CampusEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  const [singleResult, setSingleResult] = useState<SingleLeadResponse | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formApiRef = useRef<any>(null)

  /* ─── Token 验证 ─── */
  useEffect(() => {
    if (!token) { setPhase('invalid'); return }
    validateChannelToken(token)
      .then((res: ValidateTokenResponse) => {
        const name = res.channel_name || '渠道提交'
        setChannelName(name)
        document.title = `${name} - 线索录入`
        if (res.require_campus_selection && res.campuses?.length) {
          setRequireCampusSelection(true)
          setCampuses(res.campuses)
        }
        if (res.extra_fields?.length) setExtraFields(res.extra_fields)
        setPhase('form')
      })
      .catch(() => { document.title = '线索录入'; setPhase('invalid') })
  }, [token])

  /* ─── 校区切换 → 加载员工 ─── */
  useEffect(() => {
    if (!selectedCampusId || !token) {
      setCampusEmployees([])
      formApiRef.current?.setValue('advisor_id', undefined)
      return
    }
    let cancelled = false
    setLoadingEmployees(true)
    formApiRef.current?.setValue('advisor_id', undefined)
    fetchCampusEmployees(selectedCampusId, token)
      .then((list) => { if (!cancelled) setCampusEmployees(list) })
      .catch(() => { if (!cancelled) setCampusEmployees([]) })
      .finally(() => { if (!cancelled) setLoadingEmployees(false) })
    return () => { cancelled = true }
  }, [selectedCampusId, token])

  /* ─── 提交 ─── */
  const handleSubmit = useCallback(async () => {
    setErrorMsg('')
    try { await formApiRef.current?.validate() } catch { return }

    const values = formApiRef.current?.getValues() || {}

    if (requireCampusSelection && !selectedCampusId) {
      setErrorMsg('请先选择归属校区')
      return
    }
    for (const field of extraFields) {
      if (field.required && !values[`extra_${field.field_name}`]?.trim?.()) {
        setErrorMsg(`请填写${field.field_label || field.field_name}`)
        return
      }
    }

    setPhase('submitting')
    try {
      const extra: Record<string, string> = {}
      for (const f of extraFields) {
        const v = values[`extra_${f.field_name}`]
        if (v) extra[f.field_name] = v
      }
      const res = await submitSingleLead({
        token,
        parent_phone: (values.parent_phone || '').trim(),
        parent_name: values.parent_name?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        campus_id: selectedCampusId || undefined,
        advisor_id: values.advisor_id || undefined,
        extra_fields: Object.keys(extra).length > 0 ? extra : undefined,
      })
      setSingleResult(res)
      setPhase('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请稍后重试')
      setPhase('form')
    }
  }, [token, selectedCampusId, requireCampusSelection, extraFields])

  /* ─── 继续录入 ─── */
  const handleReset = useCallback(() => {
    setSingleResult(null)
    setErrorMsg('')
    setPhase('form')
  }, [])

  /* ═══ Loading ═══ */
  if (phase === 'loading') {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Spin size="large" />
          <Text type="tertiary" style={{ marginTop: 12 }}>正在验证链接...</Text>
        </div>
      </div>
    )
  }

  /* ═══ Invalid ═══ */
  if (phase === 'invalid') {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Card style={{ width: '100%', maxWidth: 380 }}>
            <Banner
              type="danger"
              fullMode={false}
              closeIcon={null}
              title="链接无效"
              description="该提交链接无效或已失效，请联系管理员获取正确的链接"
            />
          </Card>
        </div>
      </div>
    )
  }

  /* ═══ Submitting ═══ */
  if (phase === 'submitting') {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Spin size="large" />
          <Text type="tertiary" style={{ marginTop: 12 }}>正在提交...</Text>
        </div>
      </div>
    )
  }

  /* ═══ Result ═══ */
  if (phase === 'result' && singleResult) {
    const cfg = STATUS_MAP[singleResult.status]
    const isSuccess = singleResult.status === 'created' || singleResult.status === 'collision_taken'

    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <Card>
              <Banner
                type={cfg.bannerType}
                fullMode={false}
                closeIcon={null}
                title={isSuccess ? '提交成功' : '提交结果'}
                description={cfg.label}
              />
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="tertiary">手机号</Text>
                <Text strong style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                  {singleResult.phone}
                </Text>
              </div>
              {singleResult.message && (
                <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 8 }}>
                  {singleResult.message}
                </Text>
              )}
            </Card>
            <Button
              theme="solid"
              icon={<IconRefresh />}
              block
              style={{ marginTop: 16 }}
              onClick={handleReset}
            >
              继续录入
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══ Form ═══ */
  const canSubmit = !requireCampusSelection || !!selectedCampusId

  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <Card>
          <Title heading={5} style={{ textAlign: 'center', marginBottom: 4 }}>
            {channelName}
          </Title>

          <Tabs type="line" defaultActiveKey="form">
            <TabPane tab="录入" itemKey="form">
              <Form
                layout="vertical"
                getFormApi={(api: any) => { formApiRef.current = api }}  // eslint-disable-line @typescript-eslint/no-explicit-any
                initValues={{ campus_id: selectedCampusId || undefined }}
                onValueChange={(_values: any, changedValue: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
                  if ('campus_id' in changedValue) {
                    setSelectedCampusId((changedValue.campus_id as string) || '')
                  }
                }}
                style={{ marginTop: 16 }}
              >
                {requireCampusSelection && (
                  <Form.Select
                    field="campus_id"
                    label="归属校区"
                    placeholder="请选择归属校区"
                    rules={[{ required: true, message: '请选择归属校区' }]}
                    optionList={campuses.map((cp) => ({ label: cp.name, value: cp.id }))}
                    style={{ width: '100%' }}
                  />
                )}

                {requireCampusSelection && selectedCampusId && (
                  <Form.Select
                    field="advisor_id"
                    label="分配顾问"
                    placeholder={loadingEmployees ? '加载中...' : '选填，不选则为待分配线索'}
                    helpText="不选择则线索进入该校区待分配池"
                    optionList={campusEmployees.map((e) => ({ label: e.name, value: e.id }))}
                    loading={loadingEmployees}
                    filter
                    showClear
                    emptyContent="该校区暂无员工"
                    style={{ width: '100%' }}
                  />
                )}

                {extraFields.map((field) => {
                  const label = field.field_label || field.field_name
                  const key = `extra_${field.field_name}`
                  const rules = field.required ? [{ required: true, message: `请填写${label}` }] : undefined

                  if (field.field_type === 'select' && field.options?.length) {
                    return (
                      <Form.Select
                        key={key} field={key} label={label}
                        placeholder={field.placeholder || `请选择${label}`}
                        rules={rules}
                        optionList={field.options.map((o) => ({ label: o.label, value: o.value }))}
                        style={{ width: '100%' }}
                      />
                    )
                  }
                  if (field.field_type === 'textarea') {
                    return (
                      <Form.TextArea
                        key={key} field={key} label={label}
                        placeholder={field.placeholder || `请输入${label}`}
                        rules={rules}
                        autosize={{ minRows: 3, maxRows: 6 }}
                      />
                    )
                  }
                  return (
                    <Form.Input
                      key={key} field={key} label={label}
                      placeholder={field.placeholder || `请输入${label}`}
                      rules={rules}
                    />
                  )
                })}

                <Form.Input
                  field="parent_name"
                  label="客户名字"
                  placeholder="选填"
                />

                <Form.Input
                  field="parent_phone"
                  label="联系电话"
                  placeholder="11位手机号"
                  maxLength={11}
                  rules={[
                    { required: true, message: '请输入联系电话' },
                    {
                      pattern: /^1[3-9]\d{9}$/,
                      message: '请输入正确的11位手机号',
                    },
                  ]}
                />

                <Form.TextArea
                  field="notes"
                  label="备注"
                  placeholder="选填"
                  autosize={{ minRows: 3, maxRows: 6 }}
                />

                {errorMsg && (
                  <Banner
                    type="danger"
                    fullMode={false}
                    closeIcon={null}
                    description={errorMsg}
                    style={{ marginBottom: 12 }}
                  />
                )}

                <Button
                  theme="solid"
                  icon={<IconSend />}
                  block
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  {requireCampusSelection && !selectedCampusId ? '请先选择校区' : '提交'}
                </Button>
              </Form>
            </TabPane>

            <TabPane tab="统计" itemKey="stats">
              <div style={{ marginTop: 16 }}>
                <StatsPanel token={token} />
                <Button
                  icon={<IconExternalOpen />}
                  block
                  style={{ marginTop: 16 }}
                  onClick={() => window.open(`/channel-portal?token=${encodeURIComponent(token)}`, '_blank')}
                >
                  查看数据看板
                </Button>
              </div>
            </TabPane>
          </Tabs>
        </Card>

        <Text
          type="tertiary"
          size="small"
          style={{ display: 'block', textAlign: 'center', marginTop: 12 }}
        >
          提交即表示线索将录入 CRM 系统
        </Text>
      </div>
    </div>
  )
}
