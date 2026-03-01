/**
 * 统计卡片组件 (Semi Design)
 * 显示诺到、到访、缴费的统计数据
 */

import { Card, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import { Calendar, CheckCircle, CreditCard, DollarSign } from 'lucide-react'
import type { ConversionStats } from '../types'

const { Text } = Typography

interface StatsCardsProps {
  stats?: ConversionStats
  isLoading?: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      title: '本月诺到',
      value: stats?.scheduled_month ?? 0,
      total: stats?.scheduled_total ?? 0,
      icon: Calendar,
      iconColor: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      title: '本月到访',
      value: stats?.visited_month ?? 0,
      total: stats?.visited_total ?? 0,
      icon: CheckCircle,
      iconColor: '#00b42a',
      bgColor: '#f0fdf4',
    },
    {
      title: '本月缴费',
      value: stats?.payment_month ?? 0,
      total: stats?.payment_total ?? 0,
      icon: CreditCard,
      iconColor: '#a855f7',
      bgColor: '#faf5ff',
    },
    {
      title: '本月缴费金额',
      value: stats?.payment_amount_month ?? 0,
      total: stats?.payment_amount_total ?? 0,
      icon: DollarSign,
      iconColor: '#ff7d00',
      bgColor: '#fffbeb',
      isCurrency: true,
    },
  ]

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {cards.map((_, index) => (
          <Card key={index} bodyStyle={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Skeleton.Title style={{ width: 80, height: 16 }} />
              <Skeleton.Avatar shape="circle" style={{ width: 32, height: 32 }} />
            </div>
            <Skeleton.Title style={{ width: 96, height: 32, marginBottom: 4 }} />
            <Skeleton.Title style={{ width: 64, height: 12 }} />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} bodyStyle={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="tertiary" style={{ fontSize: 14, fontWeight: 500 }}>
                {card.title}
              </Text>
              <div style={{ borderRadius: '50%', padding: 8, backgroundColor: card.bgColor }}>
                <Icon style={{ width: 16, height: 16, color: card.iconColor }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {card.isCurrency ? (
                <>
                  <span style={{ fontSize: 18, fontWeight: 400, color: 'var(--semi-color-text-2)', marginRight: 2 }}>¥</span>
                  {card.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </>
              ) : (
                card.value.toLocaleString()
              )}
            </div>
            <Text type="tertiary" style={{ fontSize: 12 }}>
              累计: {card.isCurrency ? (
                <>¥{card.total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
              ) : (
                card.total.toLocaleString()
              )}
            </Text>
          </Card>
        )
      })}
    </div>
  )
}
