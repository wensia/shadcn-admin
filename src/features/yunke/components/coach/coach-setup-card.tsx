import { useMemo, useState } from 'react'
import { BookText, ChevronDown, Headphones, Plus } from 'lucide-react'
import { Button, Collapsible, Input, Radio, RadioGroup, Select, Tag } from '@douyinfe/semi-ui-19'
import type { TrainingCatalog, TrainingCatalogItem, TrainingSession, TrainingSetupForm } from './coach-types'

/** 按 group 对人设分组，保留 persona_groups 的顺序 */
function buildGroupedPersonas(
  personas: TrainingCatalogItem[],
  groups: TrainingCatalog['persona_groups'],
) {
  if (!groups || groups.length === 0) return null
  const groupMap: Record<string, TrainingCatalogItem[]> = {}
  let idx = 0
  for (const g of groups) {
    groupMap[g.key] = personas.slice(idx, idx + g.count)
    idx += g.count
  }
  return groups.map((g) => ({
    groupKey: g.key,
    groupLabel: g.label,
    items: groupMap[g.key] || [],
  }))
}

interface CoachSetupCardProps {
  catalog: TrainingCatalog | null
  draft: TrainingSetupForm
  currentSession: TrainingSession | null
  isCreating: boolean
  onChange: (patch: Partial<TrainingSetupForm>) => void
  onCreateSession: () => void
}

export function CoachSetupCard({
  catalog,
  draft,
  currentSession,
  isCreating,
  onChange,
  onCreateSession,
}: CoachSetupCardProps) {
  const [extraOpen, setExtraOpen] = useState(false)

  const groupedPersonas = useMemo(
    () => buildGroupedPersonas(catalog?.personas || [], catalog?.persona_groups),
    [catalog?.personas, catalog?.persona_groups],
  )

  const recommendedPersonas = useMemo(() => {
    const recs = catalog?.scene_persona_recommendations?.[draft.scene_key]
    if (!recs || recs.length === 0) return null
    return (catalog?.personas || []).filter((p) => recs.includes(p.key))
  }, [catalog?.scene_persona_recommendations, catalog?.personas, draft.scene_key])

  const selectedPersonaDesc = useMemo(() => {
    const found = (catalog?.personas || []).find((p) => p.key === draft.persona_key)
    return found?.description || null
  }, [catalog?.personas, draft.persona_key])

  return (
    <section
      className="rounded-2xl border px-5 py-4"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.15)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* 主控制行 */}
      <div className="flex flex-wrap items-center gap-3">
        <RadioGroup
          type="button"
          buttonSize="middle"
          value={draft.mode}
          onChange={(e) => onChange({ mode: e.target.value })}
          style={{ flexShrink: 0 }}
        >
          <Radio value="text">
            <span className="inline-flex items-center gap-1.5">
              <BookText className="h-4 w-4" />
              文字
            </span>
          </Radio>
          <Radio value="voice">
            <span className="inline-flex items-center gap-1.5">
              <Headphones className="h-4 w-4" />
              语音
            </span>
          </Radio>
        </RadioGroup>

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-400">场景</span>
          <Select
            value={draft.scene_key}
            onChange={(value) => onChange({ scene_key: String(value) })}
            style={{ width: 180 }}
          >
            {(catalog?.scenes || []).map((item) => (
              <Select.Option key={item.key} value={item.key} label={item.label}>
                <div className="leading-snug">
                  <div>{item.label}</div>
                  {item.description ? (
                    <div className="text-xs text-slate-400">{item.description}</div>
                  ) : null}
                </div>
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-400">人设</span>
          <Select
            value={draft.persona_key}
            onChange={(value) => onChange({ persona_key: String(value) })}
            style={{ width: 180 }}
          >
            {groupedPersonas
              ? groupedPersonas.map((group) => (
                  <Select.OptGroup key={group.groupKey} label={group.groupLabel}>
                    {group.items.map((item) => (
                      <Select.Option key={item.key} value={item.key} label={item.label}>
                        <div className="leading-snug">
                          <div>{item.label}</div>
                          {item.description ? (
                            <div className="text-xs text-slate-400">{item.description}</div>
                          ) : null}
                        </div>
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                ))
              : (catalog?.personas || []).map((item) => (
                  <Select.Option key={item.key} value={item.key} label={item.label}>
                    {item.label}
                  </Select.Option>
                ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-400">难度</span>
          <Select
            value={draft.difficulty}
            onChange={(value) => onChange({ difficulty: String(value) })}
            optionList={(catalog?.difficulties || []).map((item) => ({ value: item.key, label: item.label }))}
            style={{ width: 100 }}
          />
        </div>

        <Button
          theme="solid"
          loading={isCreating}
          onClick={onCreateSession}
          icon={<Plus className="h-4 w-4" />}
          style={{ flexShrink: 0 }}
        >
          新建陪练
        </Button>

        {currentSession ? (
          <Tag color="orange" style={{ flexShrink: 0 }}>
            进行中
          </Tag>
        ) : null}
      </div>

      {/* 推荐人设 + 更多设置 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {recommendedPersonas && recommendedPersonas.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-slate-400">推荐：</span>
            {recommendedPersonas.map((p) => (
              <Tag
                key={p.key}
                color="orange"
                style={{ cursor: 'pointer' }}
                onClick={() => onChange({ persona_key: p.key })}
              >
                {p.label}
              </Tag>
            ))}
          </div>
        ) : null}

        {selectedPersonaDesc ? (
          <span className="truncate text-sm text-slate-400" style={{ maxWidth: 400 }}>
            {selectedPersonaDesc}
          </span>
        ) : null}

        <button
          type="button"
          className="ml-auto flex shrink-0 items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-600"
          onClick={() => setExtraOpen((prev) => !prev)}
          aria-expanded={extraOpen}
          aria-controls="coach-extra-settings"
        >
          更多设置
          <ChevronDown
            className="h-3 w-3 transition-transform duration-200"
            style={{ transform: extraOpen ? 'rotate(180deg)' : undefined }}
          />
        </button>
      </div>

      {/* 可折叠额外设置 */}
      <Collapsible isOpen={extraOpen} id="coach-extra-settings">
        <div
          className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-3"
          style={{ borderColor: 'rgba(148, 163, 184, 0.12)' }}
        >
          <div>
            <div className="mb-1.5 text-sm text-slate-400">学科</div>
            <Input
              value={draft.subject}
              onChange={(value) => onChange({ subject: value })}
              placeholder="数学"
            />
          </div>
          <div>
            <div className="mb-1.5 text-sm text-slate-400">年级</div>
            <Input
              value={draft.student_grade}
              onChange={(value) => onChange({ student_grade: value })}
              placeholder="初二"
            />
          </div>
          <div>
            <div className="mb-1.5 text-sm text-slate-400">目标</div>
            <Input
              value={draft.goal}
              onChange={(value) => onChange({ goal: value })}
              placeholder="完成首次邀约"
            />
          </div>
        </div>
      </Collapsible>
    </section>
  )
}
