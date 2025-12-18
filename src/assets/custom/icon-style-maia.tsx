import { type SVGProps } from 'react'

export function IconStyleMaia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      data-name='icon-style-maia'
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 80 52'
      {...props}
    >
      {/* Maia: 柔和圆角 + 宽松布局 - 友好温暖 */}
      <g opacity={0.8}>
        {/* 顶部标题栏 - 大圆角 */}
        <rect
          x={8}
          y={6}
          width={64}
          height={5}
          rx={3}
          ry={3}
          opacity={0.9}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />

        {/* 宽松的数据行 - 行间距更大 */}
        <rect
          x={8}
          y={16}
          width={64}
          height={4}
          rx={2}
          ry={2}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={25}
          width={64}
          height={4}
          rx={2}
          ry={2}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={34}
          width={64}
          height={4}
          rx={2}
          ry={2}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />

        {/* 列分隔线 - 柔和 */}
        <line
          x1={30}
          y1={16}
          x2={30}
          y2={38}
          stroke='currentColor'
          strokeWidth='0.8'
          opacity={0.25}
          strokeLinecap='round'
        />
        <line
          x1={50}
          y1={16}
          x2={50}
          y2={38}
          stroke='currentColor'
          strokeWidth='0.8'
          opacity={0.25}
          strokeLinecap='round'
        />

        {/* 圆形装饰 - 表示友好 */}
        <circle cx={14} cy={18} r={1.2} fill='currentColor' opacity={0.6} />
        <circle cx={14} cy={27} r={1.2} fill='currentColor' opacity={0.6} />
        <circle cx={14} cy={36} r={1.2} fill='currentColor' opacity={0.6} />
      </g>

      {/* 底部标签 "FRIENDLY" */}
      <text
        x={40}
        y={48}
        fontSize='5'
        textAnchor='middle'
        fill='currentColor'
        opacity={0.5}
        fontWeight='600'
        letterSpacing='0.3'
      >
        FRIENDLY
      </text>
    </svg>
  )
}
