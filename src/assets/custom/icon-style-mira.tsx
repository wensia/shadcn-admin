import { type SVGProps } from 'react'

export function IconStyleMira(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      data-name='icon-style-mira'
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 80 52'
      {...props}
    >
      {/* Mira: 密集型布局 - 紧凑的网格和小元素 */}
      <g opacity={0.8}>
        {/* 顶部标题栏 - 小圆角 */}
        <rect
          x={8}
          y={6}
          width={64}
          height={4}
          rx={1}
          ry={1}
          opacity={0.9}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />

        {/* 紧凑的数据行 */}
        <rect
          x={8}
          y={14}
          width={64}
          height={3}
          rx={0.5}
          ry={0.5}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={19}
          width={64}
          height={3}
          rx={0.5}
          ry={0.5}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={24}
          width={64}
          height={3}
          rx={0.5}
          ry={0.5}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={29}
          width={64}
          height={3}
          rx={0.5}
          ry={0.5}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />
        <rect
          x={8}
          y={34}
          width={64}
          height={3}
          rx={0.5}
          ry={0.5}
          opacity={0.7}
          strokeLinecap='round'
          strokeMiterlimit={10}
        />

        {/* 列分隔线 - 细线 */}
        <line
          x1={26}
          y1={14}
          x2={26}
          y2={37}
          stroke='currentColor'
          strokeWidth='0.5'
          opacity={0.3}
        />
        <line
          x1={44}
          y1={14}
          x2={44}
          y2={37}
          stroke='currentColor'
          strokeWidth='0.5'
          opacity={0.3}
        />

        {/* 小图标装饰 - 表示紧凑 */}
        <circle cx={14} cy={15.5} r={0.8} fill='currentColor' opacity={0.6} />
        <circle cx={14} cy={20.5} r={0.8} fill='currentColor' opacity={0.6} />
        <circle cx={14} cy={25.5} r={0.8} fill='currentColor' opacity={0.6} />
      </g>

      {/* 底部标签 "DENSE" */}
      <text
        x={40}
        y={46}
        fontSize='5'
        textAnchor='middle'
        fill='currentColor'
        opacity={0.5}
        fontWeight='600'
      >
        DENSE
      </text>
    </svg>
  )
}
