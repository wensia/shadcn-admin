import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../utils'

interface ResizableImageProps {
  src: string
  alt?: string
  width?: number
  onResize?: (src: string, width: number) => void
}

export function ResizableImage({ src, alt, width, onResize }: ResizableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [dragging, setDragging] = useState(false)
  const [currentWidth, setCurrentWidth] = useState<number | undefined>(width)
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null)
  const latestWidthRef = useRef(currentWidth)
  const onResizeRef = useRef(onResize)

  onResizeRef.current = onResize
  latestWidthRef.current = currentWidth

  useEffect(() => {
    setCurrentWidth(width)
  }, [width])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const img = imgRef.current
    if (!img) return

    const startWidth = img.getBoundingClientRect().width
    dragState.current = { startX: e.clientX, startWidth }
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current || !containerRef.current) return
      const { startX, startWidth } = dragState.current
      const deltaX = e.clientX - startX
      const containerWidth = containerRef.current.parentElement?.clientWidth ?? Infinity
      const newWidth = Math.max(50, Math.min(startWidth + deltaX, containerWidth))
      setCurrentWidth(newWidth)
    }

    const handleMouseUp = () => {
      setDragging(false)
      const w = latestWidthRef.current
      if (w != null && onResizeRef.current) {
        onResizeRef.current(src, Math.round(w))
      }
      dragState.current = null
    }

    document.body.style.cursor = 'nwse-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, src])

  const imgStyle: React.CSSProperties = currentWidth
    ? { width: currentWidth, maxWidth: '100%' }
    : { maxWidth: '100%' }

  return (
    <div ref={containerRef} className={cn('group relative inline-block my-3')}>
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ''}
        style={imgStyle}
        className={cn(
          'block rounded-md mx-auto max-w-full',
          dragging && 'ring-2 ring-primary/50'
        )}
      />
      {onResize && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-sm bg-primary cursor-nwse-resize',
            'translate-x-1/2 translate-y-1/2',
            dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'transition-opacity'
          )}
        />
      )}
      {dragging && currentWidth != null && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-1 px-2 py-0.5 rounded text-xs bg-foreground/80 text-background whitespace-nowrap">
          {Math.round(currentWidth)}px
        </div>
      )}
    </div>
  )
}
