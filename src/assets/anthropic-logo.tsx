import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * 几何 G 字 Logo - Semi Design 蓝色主色
 *
 * 构建方式：图层叠加（避免复杂弧线路径方向问题）
 * - Layer 1: 白色实心圆 (R=13) → 外圆
 * - Layer 2: 蓝色实心圆 (R=8) → 挖空内圆形成环形
 * - Layer 3: 蓝色三角形 → 右上方开口（~52° 缺口）
 * - Layer 4: 白色横杠路径 → 右侧弧形边缘贴合外圆
 */

const BG_COLOR = '#0064FA'

/** G 字图标的 SVG 内部元素（可复用） */
function GLetterMark() {
  return (
    <>
      {/* 外圆 */}
      <circle cx='20' cy='20' r='13' fill='white' />
      {/* 内圆（挖空） */}
      <circle cx='20' cy='20' r='8' fill={BG_COLOR} />
      {/* 右上缺口（~52° 开口） */}
      <polygon points='20,20 34,20 30,7' fill={BG_COLOR} />
      {/* 横杠（右侧贴合外圆弧线） */}
      <path
        d='M 20 20 L 33 20 A 13 13 0 0 1 32 25 L 20 25 Z'
        fill='white'
      />
    </>
  )
}

interface AnthropicLogoProps extends SVGProps<SVGSVGElement> {
  showText?: boolean
}

export function AnthropicLogo({
  className,
  showText = false,
  ...props
}: AnthropicLogoProps) {
  return (
    <div className='flex items-center gap-3'>
      <svg
        viewBox='0 0 40 40'
        xmlns='http://www.w3.org/2000/svg'
        height='40'
        width='40'
        fill='none'
        className={cn('size-10', className)}
        {...props}
      >
        <title>RMF CRM</title>
        <rect width='40' height='40' rx='8' fill={BG_COLOR} />
        <GLetterMark />
      </svg>
      {showText && (
        <span
          className='text-xl font-semibold tracking-tight'
          style={{ color: 'var(--semi-color-text-0, #141413)' }}
        >
          RMF CRM
        </span>
      )}
    </div>
  )
}

export function AnthropicWordmark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 180 40'
      xmlns='http://www.w3.org/2000/svg'
      height='40'
      width='180'
      fill='none'
      className={cn('h-10 w-auto', className)}
      {...props}
    >
      <title>RMF CRM</title>
      <rect width='40' height='40' rx='8' fill={BG_COLOR} />
      <GLetterMark />
      <text
        x='52'
        y='28'
        fill='currentColor'
        fontFamily='var(--font-display-local)'
        fontSize='20'
        fontWeight='600'
        letterSpacing='-0.02em'
      >
        RMF CRM
      </text>
    </svg>
  )
}
