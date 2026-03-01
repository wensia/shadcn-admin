import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/context/theme-provider'

export function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="top-left"
      className='toaster group [&_div[data-content]]:w-full'
      style={
        {
          '--normal-bg': 'var(--semi-color-bg-3)',
          '--normal-text': 'var(--semi-color-text-0)',
          '--normal-border': 'var(--semi-color-border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
