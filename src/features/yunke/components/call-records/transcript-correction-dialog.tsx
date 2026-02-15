/**
 * 转录文本纠错工具对话框
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Loader2, Plus, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
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
    }
  }, [open])

  const loadDictionary = async () => {
    setIsDictLoading(true)
    try {
      const data = await callRecordsApi.getTranscriptDictionary()
      setCorrections(data.corrections)
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
    // 找出所有被替换的词并高亮
    const parts: Array<{ text: string; highlighted: boolean }> = []
    let remaining = corrected
    let lastIndex = 0

    // 简单实现：遍历所有正确词，在纠正文本中标记
    const correctWords = [...new Set(Object.values(corrections))]
    const regex = new RegExp(`(${correctWords.map(escapeRegex).join('|')})`, 'g')

    let match: RegExpExecArray | null
    while ((match = regex.exec(corrected)) !== null) {
      // 检查原文同位置是否不同
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
            <mark key={i} className="bg-green-100 text-green-800 px-0.5 rounded dark:bg-green-900 dark:text-green-200">
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </span>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>转录文本纠错工具</DialogTitle>
            <DialogDescription>
              管理 ASR 转录文本的纠错词库，批量修正品牌名等常见错误
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 min-h-0">
            {/* 词库加载中 */}
            {isDictLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">加载词库中...</span>
              </div>
            ) : (
              <>
                {/* 词库区域 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">纠错词库</h3>
                      <Badge variant="secondary">{correctionCount} 条规则</Badge>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePreview}
                      disabled={isLoading || correctionCount === 0}
                    >
                      {isLoading && step === 'dictionary' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      预览纠错
                    </Button>
                  </div>

                  {/* 词库表格 */}
                  {correctionCount > 0 ? (
                    <ScrollArea className="max-h-[200px]">
                      <div className="border rounded-md">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left px-3 py-2 font-medium">错误词</th>
                              <th className="text-left px-3 py-2 font-medium">正确词</th>
                              <th className="text-right px-3 py-2 font-medium w-16">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(groupedCorrections).map(([correct, wrongs]) =>
                              wrongs.map((wrong, i) => (
                                <tr key={wrong} className="border-b last:border-0">
                                  <td className="px-3 py-1.5">
                                    <span className="text-destructive">{wrong}</span>
                                  </td>
                                  <td className="px-3 py-1.5">
                                    {i === 0 ? (
                                      <span className="text-green-600 dark:text-green-400">{correct}</span>
                                    ) : (
                                      <span className="text-muted-foreground">{'↑'}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleDeleteRule(wrong)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="border rounded-md p-6 text-center text-muted-foreground text-sm">
                      暂无纠错规则，请添加
                    </div>
                  )}

                  {/* 添加自定义规则 */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="错误词"
                      value={newWrong}
                      onChange={(e) => setNewWrong(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                    />
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="正确词"
                      value={newCorrect}
                      onChange={(e) => setNewCorrect(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddRule}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加
                    </Button>
                  </div>
                </div>

                {/* 预览结果区域 */}
                {step === 'preview' && previewData && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <h3 className="text-sm font-medium">预览结果</h3>

                    {/* 统计摘要 */}
                    <div className="flex gap-4">
                      <div className="bg-muted/50 rounded-md px-4 py-2 flex-1">
                        <div className="text-xs text-muted-foreground">影响记录</div>
                        <div className="text-lg font-semibold">
                          {previewData.total_records_affected.toLocaleString()} 条
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-md px-4 py-2 flex-1">
                        <div className="text-xs text-muted-foreground">替换次数</div>
                        <div className="text-lg font-semibold">
                          {previewData.total_replacements.toLocaleString()} 次
                        </div>
                      </div>
                    </div>

                    {/* 各规则统计 */}
                    <div className="border rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">错误词</th>
                            <th className="text-left px-3 py-2 font-medium">正确词</th>
                            <th className="text-right px-3 py-2 font-medium">出现次数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.details.map((detail) => (
                            <tr key={detail.wrong} className="border-b last:border-0">
                              <td className="px-3 py-1.5 text-destructive">{detail.wrong}</td>
                              <td className="px-3 py-1.5 text-green-600 dark:text-green-400">
                                {detail.correct}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono">
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
                        <h4 className="text-sm font-medium text-muted-foreground">样本记录</h4>
                        <div className="space-y-2">
                          {previewData.sample_records.map((sample) => (
                            <div
                              key={sample.record_id}
                              className="border rounded-md p-3 space-y-1 text-sm"
                            >
                              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <span>{sample.staff_name}</span>
                                <span>|</span>
                                <span>{sample.call_time}</span>
                              </div>
                              <div className="text-muted-foreground line-through">
                                {sample.original_text}
                              </div>
                              <div>{highlightDiff(sample.original_text, sample.corrected_text)}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 执行结果区域 */}
                {step === 'result' && resultData && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h3 className="text-sm font-medium text-green-600">纠错完成</h3>
                    </div>

                    <div className="flex gap-4">
                      <div className="bg-green-50 dark:bg-green-950 rounded-md px-4 py-2 flex-1">
                        <div className="text-xs text-muted-foreground">已更新记录</div>
                        <div className="text-lg font-semibold">
                          {resultData.total_records_updated.toLocaleString()} 条
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 rounded-md px-4 py-2 flex-1">
                        <div className="text-xs text-muted-foreground">总替换次数</div>
                        <div className="text-lg font-semibold">
                          {resultData.total_replacements.toLocaleString()} 次
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">错误词</th>
                            <th className="text-left px-3 py-2 font-medium">正确词</th>
                            <th className="text-right px-3 py-2 font-medium">替换次数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.details.map((detail) => (
                            <tr key={detail.wrong} className="border-b last:border-0">
                              <td className="px-3 py-1.5 text-destructive">{detail.wrong}</td>
                              <td className="px-3 py-1.5 text-green-600 dark:text-green-400">
                                {detail.correct}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono">
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
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {step === 'result' ? '关闭' : '取消'}
            </Button>
            {step === 'preview' && previewData && (
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                执行纠错 ({previewData.total_records_affected.toLocaleString()} 条)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 二次确认对话框 */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="确认执行纠错"
        desc={
          previewData
            ? `将对 ${previewData.total_records_affected.toLocaleString()} 条通话记录执行文本纠错，共 ${previewData.total_replacements.toLocaleString()} 处替换。此操作不可撤销，是否继续？`
            : ''
        }
        confirmText="确认执行"
        cancelBtnText="取消"
        destructive
        handleConfirm={handleApply}
        isLoading={isLoading}
      />
    </>
  )
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
