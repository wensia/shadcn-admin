import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Anthropic 品牌色:
 * - Orange: #d97757 (主要强调)
 * - Blue: #6a9bcc (次要强调)
 * - Green: #788c5d (第三强调)
 * - Mid Gray: #b0aea5 (次要元素)
 * - Light Gray: #e8e6dc (微妙背景)
 * - Dark: #141413 (主要文本)
 * - Light: #faf9f5 (浅色背景)
 */
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        // Anthropic 品牌色状态样式 - 浅色背景 + 品牌色文字
        'status-orange':
          'border-[#d97757]/30 bg-[#d97757]/10 text-[#d97757]',
        'status-blue':
          'border-[#6a9bcc]/30 bg-[#6a9bcc]/10 text-[#6a9bcc]',
        'status-green':
          'border-[#788c5d]/30 bg-[#788c5d]/10 text-[#788c5d]',
        'status-gray':
          'border-[#b0aea5]/30 bg-[#b0aea5]/10 text-[#b0aea5]',
        'status-red':
          'border-red-300 bg-red-50 text-red-600',
        // 深色实心样式
        'status-orange-solid':
          'border-transparent bg-[#d97757] text-white',
        'status-blue-solid':
          'border-transparent bg-[#6a9bcc] text-white',
        'status-green-solid':
          'border-transparent bg-[#788c5d] text-white',
        'status-gray-solid':
          'border-transparent bg-[#b0aea5] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot='badge'
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
