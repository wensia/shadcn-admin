/**
 * 转录文本纠错工具对话框
 * Semi Design 重构
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Button,
  Input,
  Tag,
  Spin,
} from '@douyinfe/semi-ui-19'
import {
  IconPlus,
  IconDelete,
  IconArrowRight,
  IconTickCircle,
} from '@douyinfe/semi-icons'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { callRecordsApi } from '../../api'

type CorrectionStep = 'dictionary' | 'preview' | 'result'

interface PreviewData {
  total_records_affected: number
  total_replacements: number
  details: Array<{ wrong: string; correct: string; count: number }>
  sample_records: Array<{
    record_id: string
    staff_name: string
    call_time: string
    original_text: string
    corrected_text: string
  }>
}

interface ResultData {
  total_records_updated: number
  total_replacements: number
  details: Array<{ wrong: string; correct: string; replaced: number }>
}

interface TranscriptCorrectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TranscriptCorrectionDialog({
  open,
  onOpenChange,
}: TranscriptCorrectionDialogProps) {
  const [step, setStep] = useState<CorrectionStep>('dictionary')
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [resultData, setResultData] = useState<ResultData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDictLoading, setIsDictLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 添加规则的输入
  const [newWrong, setNewWrong] = useState('')
  const [newCorrect, setNewCorrect] = useState('')

  // 打开时加载词库
  useEffect(() => {
    if (open) {
      loadDictionary()
    } else {
      // 关闭时重置状态
      setStep('dictionary')
      setPreviewData(null)
      setResultData(null)
      setNewWrong('')
      setNewCorrect('')
      setIsDirty(false)
    }
  }, [open])

  const loadDictionary = async () => {
    setIsDictLoading(true)
    try {
      const data = await callRecordsApi.getTranscriptDictionary()
      setCorrections(data.corrections)
      setIsDirty(false)
    } catch (error) {
      showApiErrorToast(error, '加载纠错词库失败')
    } finally {
      setIsDictLoading(false)
    }
  }

  // 按正确词分组
  const groupedCorrections = useMemo(() => {
    const groups: Record<string, string[]> = {}
    for (const [wrong, correct] of Object.entries(corrections)) {
      if (!groups[correct]) groups[correct] = []
      groups[correct].push(wrong)
    }
    return groups
  }, [corrections])

  const correctionCount = Object.keys(corrections).length

  const handleAddRule = () => {
    const wrong = newWrong.trim()
    const correct = newCorrect.trim()
    if (!wrong || !correct) {
      toast.error('请输入错误词和正确词')
      return
    }
    if (wrong === correct) {
      toast.error('错误词和正确词不能相同')
      return
    }
    if (corrections[wrong]) {
      toast.error(`错误词 "${wrong}" 已存在`)
      return
    }
    setCorrections((prev) => ({ ...prev, [wrong]: correct }))
    setIsDirty(true)
    setNewWrong('')
    setNewCorrect('')
    // 添加新规则后清除预览（因为数据已变）
    if (previewData) {
      setPreviewData(null)
      setStep('dictionary')
    }
  }

  const handleDeleteRule = (wrong: string) => {
    setCorrections((prev) => {
      const next = { ...prev }
      delete next[wrong]
      return next
    })
    setIsDirty(true)
    if (previewData) {
      setPreviewData(null)
      setStep('dictionary')
    }
  }

  const handlePreview = async () => {
    if (correctionCount === 0) {
      toast.error('请先添加纠错规则')
      return
    }
    setIsLoading(true)
    try {
      const data = await callRecordsApi.previewTranscriptCorrection(corrections)
      setPreviewData(data)
      setStep('preview')
    } catch (error) {
      showApiErrorToast(error, '预览纠错失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDictionary = async () => {
    setIsSaving(true)
    try {
      const data = await callRecordsApi.saveTranscriptDictionary(corrections)
      setCorrections(data.corrections)
      setIsDirty(false)
      toast.success(`已保存 ${data.total.toLocaleString()} 条纠错规则`)
    } catch (error) {
      showApiErrorToast(error, '保存纠错词库失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApply = async () => {
    setConfirmOpen(false)
    setIsLoading(true)
    try {
      const data = await callRecordsApi.applyTranscriptCorrection(corrections)
      setResultData(data)
      setStep('result')
      toast.success(`成功纠正 ${data.total_records_updated.toLocaleString()} 条记录`)
    } catch (error) {
      showApiErrorToast(error, '执行纠错失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 高亮纠正文本中的差异
  const highlightDiff = (original: string, corrected: string) => {
    const parts: Array<{ text: string; highlighted: boolean }> = []
    let lastIndex = 0

    const correctWords = [...new Set(Object.values(corrections))]
    const regex = new RegExp(`(${correctWords.map(escapeRegex).join('|')})`, 'g')

    let match: RegExpExecArray | null
    while ((match = regex.exec(corrected)) !== null) {
      const origSlice = original.slice(match.index, match.index + match[0].length)
      if (origSlice !== match[0]) {
        if (match.index > lastIndex) {
          parts.push({ text: corrected.slice(lastIndex, match.index), highlighted: false })
        }
        parts.push({ text: match[0], highlighted: true })
        lastIndex = match.index + match[0].length
      }
    }

    if (lastIndex < corrected.length) {
      parts.push({ text: corrected.slice(lastIndex), highlighted: false })
    }

    if (parts.length === 0) {
      return <span>{corrected}</span>
    }

    return (
      <span>
        {parts.map((part, i) =>
          part.highlighted ? (
            <mark
              key={i}
              style={{
                background: 'var(--semi-color-success-light-default)',
                color: 'var(--semi-color-success)',
                padding: '0 2px',
                borderRadius: 2,
              }}
            >
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </span>
    )
  }

  const tableHeaderStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    fontWeight: 500,
    fontSize: 13,
  }

  const tableCellStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: 13,
  }

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <Button onClick={() => onOpenChange(false)}>
        {step === 'result' ? '关闭' : '取消'}
      </Button>
      {step === 'preview' && previewData && (
        <Button
          theme="solid"
          onClick={() => setConfirmOpen(true)}
          disabled={isLoading}
          loading={isLoading}
        >
          执行纠错 ({previewData.total_records_affected.toLocaleString()} 条)
        </Button>
      )}
    </div>
  )

  return (
    <>
      <Modal
        title="转录文本纠错工具"
        visible={open}
        onCancel={() => onOpenChange(false)}
        footer={footer}
        width={700}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ overflow: 'auto' }}
        closeOnEsc
      >
        <div style={{ marginBottom: 4, color: 'var(--semi-color-text-2)', fontSize: 13 }}>
          管理 ASR 转录文本的纠错词库，批量修正品牌名等常见错误；保存后会自动用于后续云客通话转写。
        </div>

        {/* 词库加载中 */}
        {isDictLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <Spin size="middle" />
            <span style={{ marginLeft: 8, color: 'var(--semi-color-text-2)' }}>加载词库中...</span>
          </div>
        ) : (
          <>
            {/* 词库区域 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>纠错词库</span>
                  <Tag size="small" color="grey">{correctionCount} 条规则</Tag>
                  {isDirty && <Tag size="small" color="orange">未保存</Tag>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button
                    theme="light"
                    onClick={handleSaveDictionary}
                    disabled={isSaving || !isDirty}
                    loading={isSaving}
                  >
                    保存词库
                  </Button>
                  <Button
                    theme="solid"
                    onClick={handlePreview}
                    disabled={isLoading || correctionCount === 0}
                    loading={isLoading && step === 'dictionary'}
                  >
                    预览纠错
                  </Button>
                </div>
              </div>

              {/* 词库表格 */}
              {correctionCount > 0 ? (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--semi-color-border)', borderRadius: 6 }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)' }}>
                        <th style={tableHeaderStyle}>错误词</th>
                        <th style={tableHeaderStyle}>正确词</th>
                        <th style={{ ...tableHeaderStyle, textAlign: 'right', width: 60 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedCorrections).map(([correct, wrongs]) =>
                        wrongs.map((wrong, i) => (
                          <tr key={wrong} style={{ borderBottom: '1px solid var(--semi-color-border)' }}>
                            <td style={tableCellStyle}>
                              <span style={{ color: 'var(--semi-color-danger)' }}>{wrong}</span>
                            </td>
                            <td style={tableCellStyle}>
                              {i === 0 ? (
                                <span style={{ color: 'var(--semi-color-success)' }}>{correct}</span>
                              ) : (
                                <span style={{ color: 'var(--semi-color-text-2)' }}>{'↑'}</span>
                              )}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                              <Button
                                theme="borderless"
                                icon={<IconDelete style={{ color: 'var(--semi-color-text-2)' }} />}
                                onClick={() => handleDeleteRule(wrong)}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 6,
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--semi-color-text-2)',
                  fontSize: 13,
                }}>
                  暂无纠错规则，请添加
                </div>
              )}

              {/* 添加自定义规则 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Input
                  placeholder="错误词"
                  value={newWrong}
                  onChange={(val) => setNewWrong(val)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                  style={{ flex: 1 }}
                />
                <IconArrowRight style={{ color: 'var(--semi-color-text-2)', flexShrink: 0 }} />
                <Input
                  placeholder="正确词"
                  value={newCorrect}
                  onChange={(val) => setNewCorrect(val)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                  style={{ flex: 1 }}
                />
                <Button theme="light" icon={<IconPlus />} onClick={handleAddRule}>
                  添加
                </Button>
              </div>
            </div>

            {/* 预览结果区域 */}
            {step === 'preview' && previewData && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--semi-color-border)' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>预览结果</span>

                {/* 统计摘要 */}
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <div style={{ flex: 1, background: 'var(--semi-color-fill-0)', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>影响记录</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {previewData.total_records_affected.toLocaleString()} 条
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--semi-color-fill-0)', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>替换次数</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {previewData.total_replacements.toLocaleString()} 次
                    </div>
                  </div>
                </div>

                {/* 各规则统计 */}
                <div style={{ border: '1px solid var(--semi-color-border)', borderRadius: 6, marginTop: 12 }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)' }}>
                        <th style={tableHeaderStyle}>错误词</th>
                        <th style={tableHeaderStyle}>正确词</th>
                        <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>出现次数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.details.map((detail) => (
                        <tr key={detail.wrong} style={{ borderBottom: '1px solid var(--semi-color-border)' }}>
                          <td style={{ ...tableCellStyle, color: 'var(--semi-color-danger)' }}>{detail.wrong}</td>
                          <td style={{ ...tableCellStyle, color: 'var(--semi-color-success)' }}>
                            {detail.correct}
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                            {detail.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 样本记录 */}
                {previewData.sample_records.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--semi-color-text-2)', marginTop: 12 }}>样本记录</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {previewData.sample_records.map((sample) => (
                        <div
                          key={sample.record_id}
                          style={{
                            border: '1px solid var(--semi-color-border)',
                            borderRadius: 6,
                            padding: 12,
                            fontSize: 13,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--semi-color-text-2)', fontSize: 12 }}>
                            <span>{sample.staff_name}</span>
                            <span>|</span>
                            <span>{sample.call_time}</span>
                          </div>
                          <div style={{ color: 'var(--semi-color-text-2)', textDecoration: 'line-through', marginTop: 4 }}>
                            {sample.original_text}
                          </div>
                          <div style={{ marginTop: 4 }}>{highlightDiff(sample.original_text, sample.corrected_text)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 执行结果区域 */}
            {step === 'result' && resultData && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--semi-color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconTickCircle style={{ color: 'var(--semi-color-success)', fontSize: 18 }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-success)' }}>纠错完成</span>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <div style={{ flex: 1, background: 'var(--semi-color-success-light-default)', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>已更新记录</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {resultData.total_records_updated.toLocaleString()} 条
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--semi-color-success-light-default)', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>总替换次数</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {resultData.total_replacements.toLocaleString()} 次
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--semi-color-border)', borderRadius: 6, marginTop: 12 }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)' }}>
                        <th style={tableHeaderStyle}>错误词</th>
                        <th style={tableHeaderStyle}>正确词</th>
                        <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>替换次数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.details.map((detail) => (
                        <tr key={detail.wrong} style={{ borderBottom: '1px solid var(--semi-color-border)' }}>
                          <td style={{ ...tableCellStyle, color: 'var(--semi-color-danger)' }}>{detail.wrong}</td>
                          <td style={{ ...tableCellStyle, color: 'var(--semi-color-success)' }}>
                            {detail.correct}
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                            {detail.replaced.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 二次确认对话框 */}
      <Modal
        title="确认执行纠错"
        visible={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={handleApply}
        okText="确认执行"
        cancelText="取消"
        okButtonProps={{
          type: 'danger',
          loading: isLoading,
        }}
        closeOnEsc
        size="small"
      >
        {previewData && (
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            将对 {previewData.total_records_affected.toLocaleString()} 条通话记录执行文本纠错，共 {previewData.total_replacements.toLocaleString()} 处替换。此操作不可撤销，是否继续？
          </div>
        )}
      </Modal>
    </>
  )
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
