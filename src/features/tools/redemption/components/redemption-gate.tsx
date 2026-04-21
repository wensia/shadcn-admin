/**
 * 兑换码验证门 - 公开页面组件
 * 使用 Anthropic 品牌风格（shadcn 组件）
 */

import { useState } from 'react'
import { Button } from '../../zhongkao/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../zhongkao/components/ui/card'
import { Input } from '../../zhongkao/components/ui/input'
import '../../zhongkao/styles/anthropic.css'
import { verifyRedemptionCode } from '../api'

interface RedemptionGateProps {
  toolId: string
  onVerified: (ticket: string) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  REDEMPTION_CODE_INVALID: '兑换码无效，请检查后重试',
  REDEMPTION_CODE_EXPIRED: '兑换码已过期',
  REDEMPTION_CODE_REVOKED: '兑换码已被撤销',
  REDEMPTION_CODE_EXHAUSTED: '兑换码已达使用上限',
}

export function RedemptionGate({ toolId, onVerified }: RedemptionGateProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('请输入兑换码')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await verifyRedemptionCode(trimmed, toolId)
      if (result.valid && result.access_ticket) {
        onVerified(result.access_ticket)
      } else {
        setError('兑换码无效')
      }
    } catch (err: unknown) {
      const errCode = (err as Error & { code?: string }).code
      if (errCode && ERROR_MESSAGES[errCode]) {
        setError(ERROR_MESSAGES[errCode])
      } else {
        setError((err as Error).message || '验证失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !loading) {
      handleVerify()
    }
  }

  return (
    <div className="tools-anthropic min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <Card className="w-full rounded-2xl border-border/30 bg-card shadow-sm">
          <CardHeader className="pb-2 p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(217, 119, 87, 0.1)' }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d97757"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
            </div>
            <CardTitle
              className="font-display text-xl font-semibold"
              style={{ fontFamily: "'Poppins', Arial, sans-serif" }}
            >
              请输入兑换码
            </CardTitle>
            <CardDescription
              className="mt-1"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              该工具需要兑换码才能使用
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6 pt-2">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="请输入兑换码"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  if (error) setError(null)
                }}
                onKeyDown={handleKeyDown}
                className="ant-input h-12 text-center text-lg tracking-widest"
                style={{ fontFamily: "'Fira Code', 'Courier New', monospace" }}
                autoFocus
              />
              {error && (
                <p
                  className="text-center text-[13px]"
                  style={{ color: '#d97757', fontFamily: "'Lora', Georgia, serif" }}
                >
                  {error}
                </p>
              )}
            </div>

            <Button
              onClick={handleVerify}
              disabled={loading}
              className="ant-btn h-11 w-full bg-primary text-primary-foreground hover:bg-[#c4654a]"
            >
              {loading ? '验证中...' : '验证'}
            </Button>

            <div className="relative flex items-center my-1">
              <div className="flex-1 border-t border-border/40" />
              <span className="px-3 text-[12px] text-muted-foreground" style={{ fontFamily: "'Lora', Georgia, serif" }}>或</span>
              <div className="flex-1 border-t border-border/40" />
            </div>

            <a
              href={`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`}
              className="ant-btn flex h-11 w-full items-center justify-center rounded-lg border border-border/50 bg-card text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
              style={{ fontFamily: "'Poppins', Arial, sans-serif" }}
            >
              员工登录
            </a>

            <div className="rounded-xl bg-[#788c5d]/8 p-3">
              <p
                className="text-center text-[12px] text-muted-foreground"
                style={{ fontFamily: "'Lora', Georgia, serif" }}
              >
                兑换码由管理员发放，如需获取请联系相关负责人
              </p>
            </div>
          </CardContent>
        </Card>

        <p
          className="mt-8 text-center text-[13px] text-[#b0aea5]"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          由 RuiMF 提供技术支持
        </p>
      </div>
    </div>
  )
}
