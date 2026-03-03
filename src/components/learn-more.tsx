import { CircleQuestionMark } from 'lucide-react'
import { Popover, Button } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

interface LearnMoreProps {
  children?: React.ReactNode
  contentClassName?: string
  triggerClassName?: string
}

export function LearnMore({
  children,
  contentClassName,
  triggerClassName,
}: LearnMoreProps) {
  return (
    <Popover
      content={
        <div className={cn('text-sm text-[var(--semi-color-text-2)] max-w-xs p-2', contentClassName)}>
          {children}
        </div>
      }
      position='top'
      showArrow
    >
      <span style={{ display: 'inline-flex' }}>
        <Button
          theme='borderless'
          size='small'
          icon={<CircleQuestionMark className='size-4 [&>circle]:hidden' />}
          className={cn('!size-5 !rounded-full', triggerClassName)}
        />
      </span>
    </Popover>
  )
}
