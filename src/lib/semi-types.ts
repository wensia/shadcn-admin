import type { TagProps } from '@douyinfe/semi-ui-19/lib/es/tag'

export type SemiTagColor = NonNullable<TagProps['color']>

export function asSemiTagColor(color: string | undefined): TagProps['color'] {
  return color as TagProps['color']
}
