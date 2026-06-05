import { useState, type ReactNode } from 'react'
import { IconEyeOpened, IconFilter, IconSearch } from '@douyinfe/semi-icons'
import { Button, Input, Modal, Space, Tag, Toast } from '@douyinfe/semi-ui-19'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { leadsApi } from '../api'
import type { Lead } from '../types'
import { LeadInfoDisplay } from './detail/lead-info-display'

const isValidPhone = (value: string) => /^1[3-9]\d{9}$/.test(value)

interface LeadListToolbarControlsProps {
  searchValue?: string
  searchPlaceholder?: string
  searchWidth?: number
  filterBadgeCount?: number
  filterButtonTheme?: 'solid' | 'borderless' | 'light'
  enablePhoneLookup?: boolean
  extraControls?: ReactNode
  onSearchChange?: (value: string) => void
  onSearch?: () => void
  onFilterClick: () => void
}

export function LeadListToolbarControls({
  searchValue = '',
  searchPlaceholder = '搜索姓名/手机号...',
  searchWidth = 220,
  filterBadgeCount = 0,
  filterButtonTheme,
  enablePhoneLookup = false,
  extraControls,
  onSearchChange,
  onSearch,
  onFilterClick,
}: LeadListToolbarControlsProps) {
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

  return (
    <>
      <Space spacing={8} wrap>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Input
            prefix={<IconSearch />}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(v) => onSearchChange?.(v)}
            onEnterPress={() => onSearch?.()}
            showClear
            style={{ width: searchWidth }}
          />
          {onSearch && <Button onClick={() => onSearch()}>搜索</Button>}
          {enablePhoneLookup && isValidPhone(searchValue) && (
            <Button
              icon={<IconEyeOpened />}
              theme='borderless'
              onClick={handlePhoneLookup}
              loading={isLookingUp}
              title='查看该手机号的线索详情'
            />
          )}
        </div>

        <Button
          icon={<IconFilter />}
          theme={filterButtonTheme}
          onClick={onFilterClick}
        >
          高级筛选
          {filterBadgeCount > 0 && (
            <Tag
              color='blue'
              shape='circle'
              style={{
                marginLeft: 6,
                minWidth: 20,
                height: 20,
                lineHeight: '20px',
              }}
            >
              {filterBadgeCount}
            </Tag>
          )}
        </Button>

        {extraControls}
      </Space>

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
