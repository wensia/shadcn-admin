/**
 * 日控报表 Tab - Semi Design 版
 * 展示每个课程顾问的诺到、到访、业绩结果统计
 * 校区筛选由主页面统一控制
 */

import { useRef, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Skeleton } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { getDailyControlReport, type AdvisorDailyControlStats } from '../api'
import { brandColors } from '../theme'

interface ReportTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

export function ReportTab({ dateFrom, dateTo, creatorCampusId }: ReportTabProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState<number>(400)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const headerH = el.querySelector('.semi-table-thead')?.getBoundingClientRect().height ?? 47
      const available = el.clientHeight - headerH
      if (available > 100) setScrollY(available)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 获取报表数据
  const { data: reportData, isLoading, isError } = useQuery({
    queryKey: ['daily-control-report', creatorCampusId, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | undefined> = {
        date_from: dateFrom,
        date_to: dateTo,
      }
      if (creatorCampusId) {
        params.campus_id = creatorCampusId
      }
      return getDailyControlReport(params)
    },
  })

  const stats = reportData?.stats || []
  const summary = {
    totalAdvisors: reportData?.total_advisors || 0,
    totalPromised: reportData?.total_promised || 0,
    totalVisited: reportData?.total_visited || 0,
    totalPaymentCount: reportData?.total_payment_count || 0,
    totalPaymentAmount: reportData?.total_payment_amount || 0,
  }

  const getVisitRate = (promised: number, visited: number) => {
    const total = promised + visited
    if (total === 0) return '-'
    return `${Math.round((visited / total) * 100)}%`
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton.Paragraph rows={1} style={{ width: 160 }} />
        <div style={{ borderRadius: 8, border: '1px solid var(--semi-color-border)' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderBottom: '1px solid var(--semi-color-border)' }}>
              <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--semi-color-text-2)' }}>
        加载失败，请重试
      </div>
    )
  }

  const columns: ColumnProps<AdvisorDailyControlStats>[] = [
    { title: '顾问姓名', dataIndex: 'advisor_name', width: 120, render: (text) => <span style={{ fontWeight: 500 }}>{text}</span> },
    { title: '所属校区', dataIndex: 'campus_name', width: 120, render: (text) => <span style={{ color: 'var(--semi-color-text-2)' }}>{text || '-'}</span> },
    {
      title: <span style={{ color: brandColors.orange }}>诺到</span>,
      dataIndex: 'promised_count', width: 80, align: 'center' as const,
      render: (text) => <span style={{ fontWeight: 500, color: text > 0 ? brandColors.orange : undefined }}>{text}</span>,
    },
    {
      title: <span style={{ color: brandColors.blue }}>到访</span>,
      dataIndex: 'visited_count', width: 80, align: 'center' as const,
      render: (text) => <span style={{ fontWeight: 500, color: text > 0 ? brandColors.blue : undefined }}>{text}</span>,
    },
    {
      title: '到访率', dataIndex: 'visit_rate', width: 80, align: 'center' as const,
      render: (_text, record) => {
        if (!record) return '-'
        return <span style={{ color: 'var(--semi-color-text-2)' }}>{getVisitRate(record.promised_count, record.visited_count)}</span>
      },
    },
    {
      title: <span style={{ color: brandColors.green }}>业绩笔数</span>,
      dataIndex: 'payment_count', width: 80, align: 'center' as const,
      render: (text) => <span style={{ fontWeight: 500, color: text > 0 ? brandColors.green : undefined }}>{text}</span>,
    },
    {
      title: '净业绩额', dataIndex: 'payment_amount', width: 120, align: 'right' as const,
      render: (text) => {
        const amount = Number(text || 0)
        if (amount === 0) {
          return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
        }
        return (
          <span style={{ fontWeight: 500, color: amount > 0 ? brandColors.orange : 'var(--semi-color-danger)' }}>
            ¥{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 汇总统计 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>顾问数</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{summary.totalAdvisors}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: brandColors.orange }}>诺到</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{summary.totalPromised}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: brandColors.blue }}>到访</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{summary.totalVisited}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: brandColors.green }}>业绩</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{summary.totalPaymentCount}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>净业绩额</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: Number(summary.totalPaymentAmount) >= 0 ? brandColors.orange : 'var(--semi-color-danger)',
            }}
          >
            ¥{Number(summary.totalPaymentAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 表格 */}
      <div ref={wrapperRef} style={{ flex: 1, minHeight: 0 }}>
        <Table
          columns={columns}
          dataSource={stats}
          rowKey="advisor_id"
          pagination={false}
          scroll={{ y: scrollY }}
          size="middle"
          empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无数据</div>}
        />
      </div>
    </div>
  )
}
