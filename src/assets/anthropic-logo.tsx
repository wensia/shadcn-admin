import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

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
        <title>Anthropic</title>
        {/* Anthropic 风格的 A 字母 Logo */}
        <rect width='40' height='40' rx='8' fill='#d97757' />
        <path
          d='M20 8L10 32H14.5L16.5 27H23.5L25.5 32H30L20 8ZM18 23L20 17L22 23H18Z'
          fill='#faf9f5'
        />
      </svg>
      {showText && (
        <span
          className='text-xl font-semibold tracking-tight'
          style={{ fontFamily: 'Poppins, Arial, sans-serif', color: '#141413' }}
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
      {/* Logo Icon */}
      <rect width='40' height='40' rx='8' fill='#d97757' />
      <path
        d='M20 8L10 32H14.5L16.5 27H23.5L25.5 32H30L20 8ZM18 23L20 17L22 23H18Z'
        fill='#faf9f5'
      />
      {/* Text */}
      <text
        x='52'
        y='28'
        fill='#141413'
        fontFamily='Poppins, Arial, sans-serif'
        fontSize='20'
        fontWeight='600'
        letterSpacing='-0.02em'
      >
        RMF CRM
      </text>
    </svg>
  )
}
