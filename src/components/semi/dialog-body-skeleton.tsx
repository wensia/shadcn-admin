import { Skeleton } from '@douyinfe/semi-ui-19'

type DialogBodySkeletonVariant = 'form' | 'list' | 'detail'

interface DialogBodySkeletonProps {
  variant?: DialogBodySkeletonVariant
  rows?: number
  compact?: boolean
}

const fieldWidths = ['58%', '72%', '64%', '46%', '68%', '52%']

export function DialogBodySkeleton({
  variant = 'form',
  rows = variant === 'list' ? 4 : 6,
  compact = false,
}: DialogBodySkeletonProps) {
  const padding = compact ? 0 : '4px 0'

  if (variant === 'list') {
    return (
      <Skeleton loading active style={{ padding }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px minmax(0, 1fr) 72px',
                gap: 12,
                alignItems: 'center',
                padding: 12,
                border: '1px solid var(--semi-color-border)',
                borderRadius: 8,
              }}
            >
              <Skeleton.Avatar style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div>
                <Skeleton.Title style={{ width: index % 2 === 0 ? 96 : 128, height: 16, marginBottom: 8 }} />
                <Skeleton.Paragraph rows={1} style={{ width: index % 2 === 0 ? 160 : 120 }} />
              </div>
              <Skeleton.Button style={{ width: 64, height: 24 }} />
            </div>
          ))}
        </div>
      </Skeleton>
    )
  }

  if (variant === 'detail') {
    return (
      <Skeleton loading active style={{ padding }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Skeleton.Title style={{ width: 140, height: 20, marginBottom: 14 }} />
            <Skeleton.Paragraph rows={3} style={{ width: '100%' }} />
          </div>
          <div>
            <Skeleton.Title style={{ width: 112, height: 18, marginBottom: 14 }} />
            <Skeleton.Paragraph rows={rows} style={{ width: '100%' }} />
          </div>
        </div>
      </Skeleton>
    )
  }

  return (
    <Skeleton loading active style={{ padding }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index}>
              <Skeleton.Title style={{ width: 72, height: 14, marginBottom: 8 }} />
              <Skeleton.Paragraph rows={1} style={{ width: fieldWidths[index % fieldWidths.length] }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Skeleton.Button style={{ width: 48, height: 24 }} />
          <Skeleton.Button style={{ width: 48, height: 24 }} />
        </div>
      </div>
    </Skeleton>
  )
}
