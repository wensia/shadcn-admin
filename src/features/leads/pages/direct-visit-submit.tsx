import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Banner, Button, Card, Form, Spin, Typography } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSend } from '@douyinfe/semi-icons'
import { Check, MapPin, ShieldCheck } from 'lucide-react'
import { gradeLabels } from '@/features/crm/leads/types'
import {
  submitDirectVisitLead,
  validateDirectVisitToken,
  type DirectVisitSubmitResponse,
  type DirectVisitValidateResponse,
} from '../api/direct-visit'

const { Title, Text } = Typography

type Phase = 'loading' | 'invalid' | 'form' | 'submitting' | 'result'

interface DirectVisitFormValues {
  parent_phone?: string
  parent_name?: string
  child_name?: string
  grade?: string
  school_name?: string
  notes?: string
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background:
    'linear-gradient(180deg, rgba(20, 184, 166, 0.10) 0%, rgba(255, 255, 255, 0.94) 34%, var(--semi-color-bg-0) 100%)',
  padding: '18px 14px 28px',
  overflow: 'auto',
}

const shellStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 460,
  margin: '0 auto',
  minHeight: 'calc(100dvh - 46px)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const centerStyle: React.CSSProperties = {
  ...shellStyle,
  alignItems: 'center',
}

const FAILED_RESULT_STATUSES = new Set<DirectVisitSubmitResponse['status']>(['invalid', 'error'])

const successSceneStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 'calc(100dvh - 46px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '22px 0',
}

const successPanelStyle: React.CSSProperties = {
  position: 'relative',
  width: 'min(100%, 360px)',
  minHeight: 300,
  borderRadius: 28,
  overflow: 'hidden',
  background:
    'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,253,250,0.96) 100%)',
  border: '1px solid rgba(17, 94, 89, 0.10)',
  boxShadow: '0 28px 80px rgba(15, 118, 110, 0.16), 0 1px 0 rgba(255,255,255,0.9) inset',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const successHaloStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 34,
  borderRadius: '50%',
  background:
    'radial-gradient(circle, rgba(34,197,94,0.22) 0%, rgba(20,184,166,0.10) 38%, rgba(255,255,255,0) 70%)',
}

const successGlyphStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'linear-gradient(145deg, #16a34a 0%, #0f766e 100%)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 18px 36px rgba(22, 163, 74, 0.32)',
  marginBottom: 24,
}

const successTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#12201d',
  fontSize: 34,
  lineHeight: 1.2,
  fontWeight: 800,
  letterSpacing: 0,
}

function cleanText(value?: string) {
  const next = value?.trim()
  return next || undefined
}

function getPhoneDigits(value?: string) {
  let digits = (value || '').replace(/\D/g, '')
  if (digits.startsWith('0086') && digits.length > 13) {
    digits = digits.slice(4)
  } else if (digits.startsWith('86') && digits.length > 11) {
    digits = digits.slice(2)
  }
  return digits.slice(0, 11)
}

function formatPhoneForDisplay(value?: string) {
  const digits = getPhoneDigits(value)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export function DirectVisitSubmit() {
  const search = useSearch({ from: '/direct-visit' })
  const token = search.token ?? ''
  const formRef = useRef<FormApi | null>(null)

  const [phase, setPhase] = useState<Phase>('loading')
  const [campus, setCampus] = useState<DirectVisitValidateResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<DirectVisitSubmitResponse | null>(null)

  const gradeOptions = useMemo(
    () => Object.entries(gradeLabels).map(([value, label]) => ({ value, label })),
    []
  )

  useEffect(() => {
    if (!token) {
      document.title = '直访登记'
      setPhase('invalid')
      return
    }

    let cancelled = false
    setPhase('loading')
    validateDirectVisitToken(token)
      .then((data) => {
        if (cancelled) return
        if (!data.valid) {
          setErrorMsg('该直访登记链接无效或已停用，请联系校区老师。')
          document.title = '直访登记'
          setPhase('invalid')
          return
        }
        setCampus(data)
        document.title = `${data.campus_name}直访登记`
        setPhase('form')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setErrorMsg(err instanceof Error ? err.message : '链接无效或已停用')
        document.title = '直访登记'
        setPhase('invalid')
      })

    return () => { cancelled = true }
  }, [token])

  const handleSubmit = useCallback(async () => {
    setErrorMsg('')
    try {
      await formRef.current?.validate()
    } catch {
      return
    }

    const values = (formRef.current?.getValues() || {}) as DirectVisitFormValues
    const parentPhone = getPhoneDigits(values.parent_phone)
    setPhase('submitting')
    try {
      const submitResult = await submitDirectVisitLead({
        token,
        parent_phone: parentPhone,
        parent_name: cleanText(values.parent_name),
        child_name: cleanText(values.child_name),
        grade: cleanText(values.grade),
        school_name: cleanText(values.school_name),
        notes: cleanText(values.notes),
      })
      setResult(submitResult)
      setPhase('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请稍后重试')
      setPhase('form')
    }
  }, [token])

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Spin size="large" />
          <Text type="tertiary" style={{ marginTop: 12 }}>
            {phase === 'loading' ? '正在打开登记表...' : '正在提交...'}
          </Text>
        </div>
      </div>
    )
  }

  if (phase === 'invalid') {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Card style={{ width: '100%', maxWidth: 380 }}>
            <Banner
              type="danger"
              fullMode={false}
              closeIcon={null}
              title="链接不可用"
              description={errorMsg || '该直访登记链接无效或已停用，请联系校区老师。'}
            />
          </Card>
        </div>
      </div>
    )
  }

  if (phase === 'result' && result) {
    const isFailed = FAILED_RESULT_STATUSES.has(result.status)
    if (!isFailed) {
      return (
        <div style={pageStyle}>
          <div style={successSceneStyle}>
            <div style={successPanelStyle}>
              <div style={successHaloStyle} />
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  right: 28,
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  border: '1px solid rgba(20, 184, 166, 0.16)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -28,
                  left: -18,
                  width: 118,
                  height: 118,
                  borderRadius: '50%',
                  background: 'rgba(20, 184, 166, 0.08)',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={successGlyphStyle}>
                  <Check size={42} strokeWidth={3.4} />
                </div>
                <h1 style={successTitleStyle}>登记成功</h1>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Card bodyStyle={{ padding: 22 }}>
            <Banner
              type={isFailed ? 'danger' : 'success'}
              fullMode={false}
              closeIcon={null}
              title={isFailed ? '提交失败' : '登记成功'}
              description={isFailed ? '请稍后重试，或联系校区老师。' : undefined}
            />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f766e', marginBottom: 10 }}>
            <MapPin size={18} />
            <Text strong style={{ color: '#0f766e' }}>{campus?.campus_name || '校区'}</Text>
          </div>
          <Title heading={3} style={{ margin: 0, color: 'var(--semi-color-text-0)' }}>
            直访登记
          </Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, lineHeight: 1.6 }}>
            请留下联系方式，校区老师会为您安排后续咨询。
          </Text>
        </div>

        <Card bodyStyle={{ padding: 20 }}>
          <Form
            getFormApi={(api) => { formRef.current = api }}
            labelPosition="top"
          >
            <Form.Input
              field="parent_phone"
              label="联系电话"
              placeholder="请输入手机号"
              maxLength={20}
              inputMode="tel"
              autoComplete="tel"
              convert={formatPhoneForDisplay}
              transform={getPhoneDigits}
              rules={[
                { required: true, message: '请输入联系电话' },
                {
                  validator: (_rule: unknown, value: string) => /^1[3-9]\d{9}$/.test(getPhoneDigits(value)),
                  message: '请输入正确的11位手机号',
                },
              ]}
            />
            <Form.Input field="parent_name" label="家长姓名" placeholder="选填" maxLength={20} />
            <Form.Input field="child_name" label="孩子姓名" placeholder="选填" maxLength={10} />
            <Form.Select
              field="grade"
              label="年级"
              placeholder="选填"
              optionList={gradeOptions}
              showClear
              style={{ width: '100%' }}
            />
            <Form.Input field="school_name" label="学校" placeholder="选填" maxLength={50} />
            <Form.TextArea
              field="notes"
              label="备注"
              placeholder="选填，可填写想了解的课程或时间"
              autosize={{ minRows: 3, maxRows: 5 }}
              maxCount={500}
              showClear
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

            <Button theme="solid" icon={<IconSend />} block onClick={handleSubmit}>
              提交登记
            </Button>
          </Form>
        </Card>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={15} color="#0f766e" />
          <Text type="tertiary" size="small">信息仅用于本次校区咨询跟进</Text>
        </div>
      </div>
    </div>
  )
}
