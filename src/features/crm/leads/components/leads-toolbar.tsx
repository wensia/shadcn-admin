/**
 * 线索工具栏 - Semi Design 版本
 * 搜索、状态/意向筛选、批量操作
 */
import { useState } from 'react'
import {
  IconSearch,
  IconFilter,
  IconMore,
  IconEyeOpened,
} from '@douyinfe/semi-icons'
import {
  Input,
  Select,
  Button,
  Dropdown,
  Modal,
  Toast,
  Space,
} from '@douyinfe/semi-ui-19'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { leadsApi } from '../api'
import {
  leadStatusLabels,
  intentionLevelLabels,
  type Lead,
  type LeadStatus,
  type IntentionLevel,
} from '../types'
import { LeadInfoDisplay } from './detail/lead-info-display'

const isValidPhone = (value: string) => /^1[3-9]\d{9}$/.test(value)

interface LeadsToolbarProps {
  table?: unknown
  selectedCount: number
  searchValue?: string
  statusFilter?: LeadStatus[]
  intentionFilter?: IntentionLevel[]
  onFilterClick: () => void
  onSearchChange?: (value: string) => void
  onSearch?: () => void
  onStatusFilterChange?: (values: LeadStatus[]) => void
  onIntentionFilterChange?: (values: IntentionLevel[]) => void
  onBatchAssign?: () => void
  onCreateAssignmentTask?: () => void
  onBatchRelease?: () => void
  onBatchUpdateStatus?: () => void
  onBatchDelete?: () => void
}

export function LeadsToolbar({
  selectedCount,
  searchValue = '',
  statusFilter = [],
  intentionFilter = [],
  onFilterClick,
  onSearchChange,
  onSearch,
  onStatusFilterChange,
  onIntentionFilterChange,
  onBatchAssign,
  onCreateAssignmentTask,
  onBatchRelease,
  onBatchUpdateStatus,
  onBatchDelete,
}: LeadsToolbarProps) {
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupLead, setLookupLead] = useState<Lead | null>(null)
  const [showLeadModal, setShowLeadModal] = useState(false)

  const handlePhoneLookup = async () => {
    if (!isValidPhone(searchValue)) return
    setIsLookingUp(true)
    try {
      const checkResult = await leadsApi.checkPhoneDuplicate(searchValue)
      const duplicateLeads = checkResult?.data?.duplicate_leads
      if (duplicateLeads && duplicateLeads.length > 0) {
        const accessibleLead = duplicateLeads.find((l) => !l.no_permission)
        if (accessibleLead) {
          const leadDetail = await leadsApi.getLead(accessibleLead.id)
          if (leadDetail.data) {
            setLookupLead(leadDetail.data)
            setShowLeadModal(true)
          } else {
            Toast.warning({ content: '线索详情不存在或暂无权限' })
          }
        } else {
          Toast.warning({ content: '找到线索但您没有查看权限' })
        }
      } else {
        Toast.info({ content: '未找到该手机号对应的线索' })
      }
    } catch (error: unknown) {
      showApiErrorToast(error, '查询失败')
    } finally {
      setIsLookingUp(false)
    }
  }

  const batchMenuItems = [
    onCreateAssignmentTask && {
      node: 'item' as const,
      name: '创建分配任务',
      onClick: onCreateAssignmentTask,
    },
    onBatchAssign && {
      node: 'item' as const,
      name: '快速分配',
      onClick: onBatchAssign,
    },
    onBatchRelease && {
      node: 'item' as const,
      name: '释放到公海',
      onClick: onBatchRelease,
    },
    onBatchUpdateStatus && {
      node: 'item' as const,
      name: '修改状态',
      onClick: onBatchUpdateStatus,
    },
    onBatchDelete && {
      node: 'item' as const,
      name: '批量删除',
      type: 'danger' as const,
      onClick: onBatchDelete,
    },
  ].filter(Boolean) as Array<{
    node: 'item'
    name: string
    type?: 'danger'
    onClick: () => void
  }>

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {/* 左侧：搜索 + 筛选 */}
        <Space spacing={8} wrap>
          {/* 搜索框 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Input
              prefix={<IconSearch />}
              placeholder='搜索姓名/手机号...'
              value={searchValue}
              onChange={(v) => onSearchChange?.(v)}
              onEnterPress={() => onSearch?.()}
              showClear
              style={{ width: 220 }}
            />
            <Button onClick={() => onSearch?.()}>搜索</Button>
            {isValidPhone(searchValue) && (
              <Button
                icon={<IconEyeOpened />}
                theme='borderless'
                onClick={handlePhoneLookup}
                loading={isLookingUp}
                title='查看该手机号的线索详情'
              />
            )}
          </div>

          {/* 状态筛选 */}
          <Select
            placeholder='状态'
            multiple
            maxTagCount={2}
            value={statusFilter}
            onChange={(v) => onStatusFilterChange?.((v || []) as LeadStatus[])}
            style={{ width: 200 }}
            showClear
          >
            {Object.entries(leadStatusLabels).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            ))}
          </Select>

          {/* 意向等级筛选 */}
          <Select
            placeholder='意向等级'
            multiple
            value={intentionFilter}
            onChange={(v) =>
              onIntentionFilterChange?.((v || []) as IntentionLevel[])
            }
            style={{ width: 160 }}
            showClear
          >
            {Object.entries(intentionLevelLabels).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            ))}
          </Select>

          {/* 高级筛选 */}
          <Button icon={<IconFilter />} theme='light' onClick={onFilterClick}>
            高级筛选
          </Button>
        </Space>

        {/* 右侧：批量操作 */}
        {selectedCount > 0 && (
          <Dropdown
            trigger='click'
            clickToHide
            position='bottomRight'
            menu={batchMenuItems}
          >
            <span style={{ display: 'inline-flex' }}>
              <Button icon={<IconMore />} theme='light'>
                批量操作 ({selectedCount})
              </Button>
            </span>
          </Dropdown>
        )}
      </div>

      {/* 手机号查看详情弹窗 */}
      <Modal
        title={`线索详情 - ${lookupLead?.child_name || lookupLead?.parent_phone || ''}`}
        visible={showLeadModal}
        onCancel={() => setShowLeadModal(false)}
        footer={null}
        width={800}
        bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
      >
        {lookupLead && (
          <LeadInfoDisplay
            lead={lookupLead}
            compact={false}
            showBackupContact={true}
          />
        )}
      </Modal>
    </>
  )
}
