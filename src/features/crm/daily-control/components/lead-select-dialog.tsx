/**
 * 线索选择弹窗组件 - Semi Design 版
 * 需要输入完整手机号（11位）才能搜索
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, Button, Input, Table, Tag } from '@douyinfe/semi-ui-19'
import { IconSearch, IconTick } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { leadsApi } from '@/features/crm/leads/api'
import { leadStatusLabels } from '@/features/crm/leads/types'

export interface SelectedLead {
  id: string
  child_name: string
  parent_phone: string
}

interface SearchResultItem {
  id: string
  child_name: string
  parent_name: string
  parent_phone?: string
  status: string
  advisor_name?: string
  owner_campus_name?: string
  created_by_name?: string
  created_at?: string
  no_permission?: boolean
}

interface LeadSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (lead: SelectedLead) => void
  title?: string
  description?: string
}

export function LeadSelectDialog({
  open,
  onOpenChange,
  onSelect,
  title = '选择线索',
  description = '请输入完整手机号搜索线索',
}: LeadSelectDialogProps) {
  const [selectedLead, setSelectedLead] = useState<SearchResultItem | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [searchPhone, setSearchPhone] = useState('')

  const isValidPhone = (phone: string) => /^1\d{10}$/.test(phone)
  const resetDialogState = () => {
    setSelectedLead(null)
    setPhoneInput('')
    setSearchPhone('')
  }

  const { data: searchData, isLoading, isFetched } = useQuery({
    queryKey: ['check-phone-for-select', searchPhone],
    queryFn: async () => {
      const response = await leadsApi.checkPhoneDuplicate(searchPhone)
      return response.data
    },
    enabled: open && isValidPhone(searchPhone),
  })

  const handleSearch = () => {
    if (isValidPhone(phoneInput)) {
      setSearchPhone(phoneInput)
      setSelectedLead(null)
    }
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleSelectLead = (lead: SearchResultItem) => {
    setSelectedLead(selectedLead?.id === lead.id ? null : lead)
  }

  const handleConfirm = () => {
    if (selectedLead) {
      onSelect({
        id: selectedLead.id,
        child_name: selectedLead.child_name || '',
        parent_phone: selectedLead.parent_phone || searchPhone || '',
      })
      resetDialogState()
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    resetDialogState()
    onOpenChange(false)
  }

  const searchResults = searchData?.duplicate_leads || []
  const hasSearched = isFetched && isValidPhone(searchPhone)

  const columns: ColumnProps<SearchResultItem>[] = [
    {
      title: '选择', dataIndex: 'select', width: 56, align: 'center' as const,
      render: (_text, record) => {
        if (!record) return null
        const isSelected = selectedLead?.id === record.id
        return (
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: `2px solid ${isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-border)'}`,
            background: isSelected ? 'var(--semi-color-primary)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            {isSelected && <IconTick size="extra-small" style={{ color: '#fff' }} />}
          </div>
        )
      },
    },
    {
      title: '学生姓名', dataIndex: 'child_name', width: 96,
      render: (text, record) => {
        const isSelected = selectedLead?.id === record?.id
        return <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--semi-color-primary)' : undefined }}>{text || '-'}</span>
      },
    },
    {
      title: '联系电话', dataIndex: 'parent_phone', width: 128,
      render: (text) => <span style={{ fontSize: 12 }}>{text || searchPhone || '-'}</span>,
    },
    {
      title: '状态', dataIndex: 'status', width: 96,
      render: (text) => <Tag size="small">{leadStatusLabels[text as keyof typeof leadStatusLabels] || text}</Tag>,
    },
    {
      title: '课程顾问', dataIndex: 'advisor_name', width: 96,
      render: (text) => <span style={{ fontSize: 12 }}>{text || '-'}</span>,
    },
    {
      title: '校区', dataIndex: 'owner_campus_name',
      render: (text) => <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>{text || '-'}</span>,
    },
  ]

  return (
    <Modal
      visible={open}
      onCancel={handleCancel}
      title={title}
      width={680}
      style={{ maxHeight: '70vh' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16, gap: 16, maxHeight: 'calc(70vh - 120px)' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button size="small" onClick={() => onOpenChange(false)}>取消</Button>
          <Button size="small" theme="solid" onClick={handleConfirm} disabled={!selectedLead}>
            {selectedLead ? `确定选择 ${selectedLead.child_name || selectedLead.parent_phone}` : '请先选择线索'}
          </Button>
        </div>
      }
    >
      <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', margin: 0 }}>{description}</p>

      {/* 搜索栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Input
          value={phoneInput}
          onChange={(v) => setPhoneInput(v.replace(/\D/g, '').slice(0, 11))}
          onKeyDown={handleKeyDown}
          placeholder="请输入完整手机号（11位）"
          prefix={<IconSearch />}
          style={{ flex: 1 }}
        />
        <Button
          onClick={handleSearch}
          disabled={!isValidPhone(phoneInput) || isLoading}
          theme="solid"
        >
          {isLoading ? '搜索中...' : '搜索'}
        </Button>
      </div>

      {/* 搜索结果 */}
      {!hasSearched ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--semi-color-border)', borderRadius: 6,
          background: 'var(--semi-color-fill-0)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>
            请输入完整的11位手机号进行搜索
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--semi-color-border)', borderRadius: 6 }}>
          <Table
            columns={columns}
            dataSource={searchResults}
            rowKey="id"
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => record && handleSelectLead(record),
              style: {
                cursor: 'pointer',
                background: selectedLead?.id === record?.id ? 'var(--semi-color-primary-light-default)' : undefined,
              },
            })}
            empty={
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)', fontSize: 12 }}>
                {isLoading ? '搜索中...' : '未找到匹配的线索'}
              </div>
            }
          />
        </div>
      )}

      {hasSearched && searchResults.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--semi-color-text-2)', flexShrink: 0 }}>
          找到 {searchResults.length} 条线索
        </div>
      )}
    </Modal>
  )
}
