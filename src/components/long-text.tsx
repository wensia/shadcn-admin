import { useRef, useState } from 'react'
import { Popover, Tooltip } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

type LongTextProps = {
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function LongText({
  children,
  className = '',
  contentClassName = '',
}: LongTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOverflown, setIsOverflown] = useState(false)

  // Use ref callback to check overflow when element is mounted
  const refCallback = (node: HTMLDivElement | null) => {
    ref.current = node
    if (node && checkOverflow(node)) {
      queueMicrotask(() => setIsOverflown(true))
    }
  }

  if (!isOverflown)
    return (
      <div ref={refCallback} className={cn('truncate', className)}>
        {children}
      </div>
    )

  return (
    <>
      <div className='hidden sm:block'>
        <Tooltip content={<span className={contentClassName}>{children}</span>}>
          <div ref={refCallback} className={cn('truncate', className)}>
            {children}
          </div>
        </Tooltip>
      </div>
      <div className='sm:hidden'>
        <Popover
          content={
            <div className={cn('w-fit p-2', contentClassName)}>
              <p>{children}</p>
            </div>
          }
          trigger='click'
          showArrow
        >
          <div ref={refCallback} className={cn('truncate', className)}>
            {children}
          </div>
        </Popover>
      </div>
    </>
  )
}

function checkOverflow(el: HTMLDivElement | null): boolean {
  if (!el) return false
  return el.offsetHeight < el.scrollHeight || el.offsetWidth < el.scrollWidth
}
