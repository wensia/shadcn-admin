import { type SVGProps } from 'react'

export function IconStyleLyra(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      data-name='icon-style-lyra'
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 80 52'
      {...props}
    >
      {/* Lyra: 方正技术风 - 无圆角、等宽字体感 */}
      <g opacity={0.8}>
        {/* 顶部标题栏 - 无圆角 */}
        <rect
          x={8}
          y={6}
          width={64}
          height={5}
          rx={0}
          ry={0}
          opacity={0.9}
          strokeLinecap='square'
          strokeMiterlimit={10}
        />

        {/* 方正的代码块样式 - 等间距 */}
        <rect
          x={8}
          y={15}
          width={64}
          height={4}
          rx={0}
          ry={0}
          opacity={0.7}
          strokeLinecap='square'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={22}
          width={64}
          height={4}
          rx={0}
          ry={0}
          opacity={0.7}
          strokeLinecap='square'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={29}
          width={64}
          height={4}
          rx={0}
          ry={0}
          opacity={0.7}
          strokeLinecap='square'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={36}
          width={64}
          height={4}
          rx={0}
          ry={0}
          opacity={0.7}
          strokeLinecap='square'
          strokeMiterlimit={10}
        />

        {/* 列分隔线 - 方正 */}
        <line
          x1={28}
          y1={15}
          x2={28}
          y2={40}
          stroke='currentColor'
          strokeWidth='1'
          opacity={0.3}
        />
        <line
          x1={48}
          y1={15}
          x2={48}
          y2={40}
          stroke='currentColor'
          strokeWidth='1'
          opacity={0.3}
        />

        {/* 等宽字符装饰 - 模拟代码编辑器 */}
        <rect x={12} y={16.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />
        <rect x={15} y={16.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />
        <rect x={18} y={16.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />

        <rect x={12} y={23.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />
        <rect x={15} y={23.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />

        <rect x={12} y={30.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />
        <rect x={15} y={30.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />
        <rect x={18} y={30.5} width={2} height={1} fill='currentColor' opacity={0.6} rx={0} />
      </g>

      {/* 底部标签 "TECHNICAL" - 等宽字体感觉 */}
      <text
        x={40}
        y={48}
        fontSize='4.5'
        textAnchor='middle'
        fill='currentColor'
        opacity={0.5}
        fontWeight='600'
        letterSpacing='0.5'
      >
        TECHNICAL
      </text>
    </svg>
  )
}
