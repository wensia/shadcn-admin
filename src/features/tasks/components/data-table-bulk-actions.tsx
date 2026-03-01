import { useState } from 'react'
import { Button, Tooltip, Tag, Divider, Dropdown } from '@douyinfe/semi-ui-19'
import { Trash2, CircleArrowUp, ArrowUpDown, Download, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { sleep } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { priorities, statuses } from '../data/data'
import { type Task } from '../data/schema'
import { TasksMultiDeleteDialog } from './tasks-multi-delete-dialog'

type DataTableBulkActionsProps = {
  selectedRows: Task[]
  onClearSelection: () => void
  entityName: string
}

export function DataTableBulkActions({
  selectedRows,
  onClearSelection,
  entityName,
}: DataTableBulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedCount = selectedRows.length

  const handleBulkStatusChange = (status: string) => {
    toast.promise(sleep(2000), {
      loading: 'Updating status...',
      success: () => {
        onClearSelection()
        return `Status updated to "${status}" for ${selectedCount} task${selectedCount > 1 ? 's' : ''}.`
      },
      error: 'Error',
    })
  }

  const handleBulkPriorityChange = (priority: string) => {
    toast.promise(sleep(2000), {
      loading: 'Updating priority...',
      success: () => {
        onClearSelection()
        return `Priority updated to "${priority}" for ${selectedCount} task${selectedCount > 1 ? 's' : ''}.`
      },
      error: 'Error',
    })
  }

  const handleBulkExport = () => {
    toast.promise(sleep(2000), {
      loading: 'Exporting tasks...',
      success: () => {
        onClearSelection()
        return `Exported ${selectedCount} task${selectedCount > 1 ? 's' : ''} to CSV.`
      },
      error: 'Error',
    })
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div
        className={cn(
          'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl',
          'transition-all delay-100 duration-300 ease-out hover:scale-105'
        )}
      >
        <div
          className={cn(
            'p-2 shadow-xl',
            'rounded-xl border',
            'bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/60',
            'flex items-center gap-x-2'
          )}
        >
          <Tooltip content='Clear selection (Escape)'>
            <Button
              theme='borderless'
              type='tertiary'
              icon={<X size={14} />}
              size='small'
              onClick={onClearSelection}
              style={{ borderRadius: '50%', width: 24, height: 24, padding: 0 }}
            />
          </Tooltip>

          <Divider layout='vertical' style={{ height: 20 }} />

          <div className='flex items-center gap-x-1 text-sm'>
            <Tag color='dark' size='large' shape='circle'>
              {selectedCount}
            </Tag>
            <span className='hidden sm:inline'>
              {entityName}
              {selectedCount > 1 ? 's' : ''}
            </span>{' '}
            selected
          </div>

          <Divider layout='vertical' style={{ height: 20 }} />

          <Dropdown
            trigger='click'
            position='topLeft'
            clickToHide
            render={
              <Dropdown.Menu>
                {statuses.map((status) => (
                  <Dropdown.Item
                    key={status.value}
                    onClick={() => handleBulkStatusChange(status.value)}
                  >
                    {status.icon && (
                      <status.icon className='size-4 text-muted-foreground mr-2 inline' />
                    )}
                    {status.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            }
          >
            <Tooltip content='Update status'>
              <Button
                theme='outline'
                size='small'
                icon={<CircleArrowUp size={16} />}
                style={{ width: 32, height: 32 }}
              />
            </Tooltip>
          </Dropdown>

          <Dropdown
            trigger='click'
            position='topLeft'
            clickToHide
            render={
              <Dropdown.Menu>
                {priorities.map((priority) => (
                  <Dropdown.Item
                    key={priority.value}
                    onClick={() => handleBulkPriorityChange(priority.value)}
                  >
                    {priority.icon && (
                      <priority.icon className='size-4 text-muted-foreground mr-2 inline' />
                    )}
                    {priority.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            }
          >
            <Tooltip content='Update priority'>
              <Button
                theme='outline'
                size='small'
                icon={<ArrowUpDown size={16} />}
                style={{ width: 32, height: 32 }}
              />
            </Tooltip>
          </Dropdown>

          <Tooltip content='Export tasks'>
            <Button
              theme='outline'
              size='small'
              icon={<Download size={16} />}
              onClick={handleBulkExport}
              style={{ width: 32, height: 32 }}
            />
          </Tooltip>

          <Tooltip content='Delete selected tasks'>
            <Button
              type='danger'
              theme='solid'
              size='small'
              icon={<Trash2 size={16} />}
              onClick={() => setShowDeleteConfirm(true)}
              style={{ width: 32, height: 32 }}
            />
          </Tooltip>
        </div>
      </div>

      <TasksMultiDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        selectedCount={selectedCount}
        onSuccess={onClearSelection}
      />
    </>
  )
}
