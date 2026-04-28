/**
 * Excel 在线编辑 Demo 页面
 * 全屏沉浸式布局，无侧边栏
 * 基于 Univer 开源电子表格引擎
 * 支持 localStorage 自动保存
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import { Button, Divider, Tooltip } from '@douyinfe/semi-ui-19'
import { toast } from '@/lib/toast'
import {
  FileUp,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  Terminal,
  Plus,
  Check,
  Loader2,
} from 'lucide-react'

import '@univerjs/preset-sheets-core/lib/index.css'

const STORAGE_KEY = 'excel-demo-data'
const STORAGE_NAME_KEY = 'excel-demo-doc-name'
const SAVE_DEBOUNCE_MS = 1500

interface WorkbookSnapshot {
  [key: string]: unknown
}

interface WorkbookLike {
  save: () => WorkbookSnapshot
}

interface CommandSubscription {
  dispose?: () => void
}

interface UniverApiLike {
  createWorkbook: (data: WorkbookSnapshot) => void
  getActiveWorkbook: () => WorkbookLike | null
  onCommandExecuted: (callback: () => void) => CommandSubscription
  dispose: () => void
}

// 示例数据
const SAMPLE_DATA = {
  sheetOrder: ['sheet1'],
  sheets: {
    sheet1: {
      id: 'sheet1',
      name: '员工信息',
      cellData: {
        0: {
          0: { v: '姓名', s: { bl: 1, bg: { rgb: '#f0efe9' } } },
          1: { v: '部门', s: { bl: 1, bg: { rgb: '#f0efe9' } } },
          2: { v: '职位', s: { bl: 1, bg: { rgb: '#f0efe9' } } },
          3: { v: '入职日期', s: { bl: 1, bg: { rgb: '#f0efe9' } } },
          4: { v: '月薪', s: { bl: 1, bg: { rgb: '#f0efe9' } } },
          5: { v: '绩效评分', s: { bl: 1, bg: { rgb: '#f0efe9' } } },
        },
        1: {
          0: { v: '张三' },
          1: { v: '市场部' },
          2: { v: '经理' },
          3: { v: '2022-03-15' },
          4: { v: 15000 },
          5: { v: 92 },
        },
        2: {
          0: { v: '李四' },
          1: { v: '技术部' },
          2: { v: '高级工程师' },
          3: { v: '2021-07-01' },
          4: { v: 20000 },
          5: { v: 88 },
        },
        3: {
          0: { v: '王五' },
          1: { v: '销售部' },
          2: { v: '销售主管' },
          3: { v: '2023-01-10' },
          4: { v: 12000 },
          5: { v: 95 },
        },
        4: {
          0: { v: '赵六' },
          1: { v: '技术部' },
          2: { v: '前端开发' },
          3: { v: '2023-06-20' },
          4: { v: 16000 },
          5: { v: 85 },
        },
        5: {
          0: { v: '钱七' },
          1: { v: '人事部' },
          2: { v: 'HR专员' },
          3: { v: '2024-02-01' },
          4: { v: 10000 },
          5: { v: 90 },
        },
        6: {},
        7: {
          0: { v: '合计', s: { bl: 1 } },
          4: { f: '=SUM(E2:E6)', v: 73000, s: { bl: 1 } },
          5: { f: '=AVERAGE(F2:F6)', s: { bl: 1 } },
        },
      },
      rowCount: 200,
      columnCount: 26,
      defaultColumnWidth: 120,
      defaultRowHeight: 28,
    },
  },
}

/** 重新创建 Univer 实例的工具函数 */
function initUniver(container: HTMLElement, data?: WorkbookSnapshot) {
  const { univerAPI } = createUniver({
    locale: LocaleType.ZH_CN,
    locales: {
      [LocaleType.ZH_CN]: mergeLocales(UniverPresetSheetsCoreZhCN),
    },
    presets: [
      UniverSheetsCorePreset({ container }),
    ],
  })
  const api = univerAPI as unknown as UniverApiLike
  api.createWorkbook(data ?? {})
  return api
}

/** 从 localStorage 加载已保存的数据 */
function loadSavedData(): { data: WorkbookSnapshot; name: string } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const data = JSON.parse(saved)
    const name = localStorage.getItem(STORAGE_NAME_KEY) || '员工信息表'
    return { data, name }
  } catch {
    return null
  }
}

/** 保存数据到 localStorage */
function saveToStorage(data: WorkbookSnapshot, name: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    localStorage.setItem(STORAGE_NAME_KEY, name)
  } catch {
    // localStorage 满了等异常静默忽略
  }
}

export function ExcelDemoPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<UniverApiLike | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const navigate = useNavigate()

  // 从 localStorage 恢复文档名（惰性初始化，仅首次渲染执行）
  const [docName, setDocName] = useState(() => loadSavedData()?.name || '员工信息表')

  // 执行保存（防抖）
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (!apiRef.current) return
      const workbook = apiRef.current.getActiveWorkbook()
      if (!workbook) return

      setSaveStatus('saving')
      const snapshot = workbook.save()
      const nameInput = document.querySelector<HTMLInputElement>('[data-doc-name]')
      const currentName = nameInput?.value || '员工信息表'
      saveToStorage(snapshot, currentName)

      setTimeout(() => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }, 300)
    }, SAVE_DEBOUNCE_MS)
  }, [])

  // 初始化 Univer（从 localStorage 恢复或使用示例数据）
  useEffect(() => {
    if (!containerRef.current) return

    const savedData = loadSavedData()
    const initialData = savedData?.data || SAMPLE_DATA

    const api = initUniver(containerRef.current, initialData)
    apiRef.current = api
    const readyTimer = window.setTimeout(() => setIsReady(true), 0)

    // 监听所有命令执行，触发自动保存
    const subscription = api.onCommandExecuted(() => {
      scheduleSave()
    })

    return () => {
      window.clearTimeout(readyTimer)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      subscription?.dispose?.()
      api.dispose()
      apiRef.current = null
      setIsReady(false)
    }
  }, [scheduleSave])

  // 导出 JSON 快照
  const handleExportJSON = useCallback(() => {
    if (!apiRef.current) return
    const workbook = apiRef.current.getActiveWorkbook()
    if (!workbook) return

    const snapshot = workbook.save()
    const json = JSON.stringify(snapshot, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docName}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('已导出 JSON 快照')
  }, [docName])

  // 加载 JSON 快照
  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !apiRef.current || !containerRef.current) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        apiRef.current.dispose()

        const api = initUniver(containerRef.current, data)
        apiRef.current = api
        const newName = file.name.replace(/\.json$/, '')
        setDocName(newName)

        // 立即保存导入的数据
        saveToStorage(data, newName)
        // 重新绑定命令监听
        api.onCommandExecuted(() => scheduleSave())

        toast.success('已加载 JSON 数据')
      } catch {
        toast.error('JSON 文件格式错误')
      }
    }
    input.click()
  }, [scheduleSave])

  // 打印当前数据到控制台
  const handlePrintData = useCallback(() => {
    if (!apiRef.current) return
    const workbook = apiRef.current.getActiveWorkbook()
    if (!workbook) return

    const snapshot = workbook.save()
    ;(window as Window & { __EXCEL_DEMO_SNAPSHOT__?: WorkbookSnapshot }).__EXCEL_DEMO_SNAPSHOT__ = snapshot
    toast.success('快照已挂到 window.__EXCEL_DEMO_SNAPSHOT__')
  }, [])

  // 清空表格（同时清除 localStorage）
  const handleClear = useCallback(() => {
    if (!apiRef.current || !containerRef.current) return

    apiRef.current.dispose()
    const api = initUniver(containerRef.current)
    apiRef.current = api
    setDocName('未命名表格')
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_NAME_KEY)

    // 重新绑定命令监听
    api.onCommandExecuted(() => scheduleSave())

    toast.info('已创建空白表格')
  }, [scheduleSave])

  return (
    <div className="flex h-full flex-col">
      {/* 顶部工具栏 */}
      <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b px-3" style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
        {/* 左侧：返回 + 文档标题 */}
        <Tooltip content="返回首页" position="bottom">
          <span style={{ display: 'inline-flex' }}>
            <Button
              theme="borderless"
              type="tertiary"
              icon={<ArrowLeft className="h-4 w-4" />}
              style={{ width: 32, height: 32 }}
              onClick={() => navigate({ to: '/' })}
            />
          </span>
        </Tooltip>

        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" style={{ color: 'var(--semi-color-primary)' }} />
          <input
            data-doc-name
            value={docName}
            onChange={(e) => {
              setDocName(e.target.value)
              scheduleSave()
            }}
            className="h-7 w-[200px] rounded bg-transparent px-1.5 text-sm font-medium outline-none transition-colors"
            style={{ border: '1px solid transparent', color: 'var(--semi-color-text-0)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--semi-color-primary)'; e.currentTarget.style.background = 'var(--semi-color-bg-0)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
          />
          {/* 保存状态指示 */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--semi-color-text-2)' }}>
              <Loader2 className="h-3 w-3 animate-spin" />
              保存中
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--semi-color-text-2)' }}>
              <Check className="h-3 w-3" />
              已保存
            </span>
          )}
        </div>

        <Divider layout="vertical" style={{ height: 20, margin: '0 4px' }} />

        {/* 操作按钮组 */}
        <div className="flex items-center gap-1">
          <Tooltip content="导入 JSON 快照" position="bottom">
            <span style={{ display: 'inline-flex' }}>
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={<FileUp className="h-3.5 w-3.5" />}
                onClick={handleImportJSON}
              >
                导入
              </Button>
            </span>
          </Tooltip>

          <Tooltip content="导出 JSON 快照" position="bottom">
            <span style={{ display: 'inline-flex' }}>
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={<Download className="h-3.5 w-3.5" />}
                onClick={handleExportJSON}
                disabled={!isReady}
              >
                导出
              </Button>
            </span>
          </Tooltip>

          <Tooltip content="将工作簿数据打印到浏览器控制台 (F12)" position="bottom">
            <span style={{ display: 'inline-flex' }}>
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={<Terminal className="h-3.5 w-3.5" />}
                onClick={handlePrintData}
                disabled={!isReady}
              >
                控制台
              </Button>
            </span>
          </Tooltip>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Tooltip content="新建空白表格" position="bottom">
            <span style={{ display: 'inline-flex' }}>
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleClear}
                disabled={!isReady}
              >
                新建
              </Button>
            </span>
          </Tooltip>
        </div>
      </header>

      {/* Univer 表格容器 - 占满剩余空间 */}
      <div className="min-h-0 flex-1">
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}
