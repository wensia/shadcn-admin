/**
 * 统计卡片组件
 * 显示诺到、到访、缴费的统计数据
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, CheckCircle, CreditCard, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConversionStats } from '../types'

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
      iconClassName: 'text-blue-500',
      bgClassName: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      title: '本月到访',
      value: stats?.visited_month ?? 0,
      total: stats?.visited_total ?? 0,
      icon: CheckCircle,
      iconClassName: 'text-green-500',
      bgClassName: 'bg-green-50 dark:bg-green-950'
    },
    {
      title: '本月缴费',
      value: stats?.payment_month ?? 0,
      total: stats?.payment_total ?? 0,
      icon: CreditCard,
      iconClassName: 'text-purple-500',
      bgClassName: 'bg-purple-50 dark:bg-purple-950'
    },
    {
      title: '本月缴费金额',
      value: stats?.payment_amount_month ?? 0,
      total: stats?.payment_amount_total ?? 0,
      icon: DollarSign,
      iconClassName: 'text-amber-500',
      bgClassName: 'bg-amber-50 dark:bg-amber-950',
      isCurrency: true
    }
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn('rounded-full p-2', card.bgClassName)}>
                <Icon className={cn('h-4 w-4', card.iconClassName)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.isCurrency ? (
                  <>
                    <span className="text-lg font-normal text-muted-foreground mr-0.5">¥</span>
                    {card.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                ) : (
                  card.value.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                累计: {card.isCurrency ? (
                  <>¥{card.total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                ) : (
                  card.total.toLocaleString()
                )}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
