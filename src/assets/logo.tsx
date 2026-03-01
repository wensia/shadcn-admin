import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * 独立 G 字 Logo 组件（兼容旧 Logo 引用）
 * 使用图层叠加方式构建 G 字形
 */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 40 40'
      xmlns='http://www.w3.org/2000/svg'
      height='24'
      width='24'
      fill='none'
      className={cn('size-6', className)}
      {...props}
    >
      <title>RMF CRM</title>
      <rect width='40' height='40' rx='8' fill='#0064FA' />
      <circle cx='20' cy='20' r='13' fill='white' />
      <circle cx='20' cy='20' r='8' fill='#0064FA' />
      <polygon points='20,20 34,20 30,7' fill='#0064FA' />
      <path
        d='M 20 20 L 33 20 A 13 13 0 0 1 32 25 L 20 25 Z'
        fill='white'
      />
    </svg>
  )
}
