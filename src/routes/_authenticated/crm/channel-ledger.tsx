import { createFileRoute } from '@tanstack/react-router'
import { ChannelLedgerPage } from '@/features/crm/channel-ledger'

export const Route = createFileRoute('/_authenticated/crm/channel-ledger')({
  staticData: { title: '渠道台账' },
  component: ChannelLedgerPage,
})
