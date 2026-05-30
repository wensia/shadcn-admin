import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  Banner,
  Button,
  Empty,
  Modal,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  IconCamera,
  IconCopy,
  IconExternalOpen,
  IconRefresh,
} from '@douyinfe/semi-icons'

import { toast } from '@/lib/toast'
import { copyToClipboard } from '@/lib/utils'
import {
  xiaoditangApi,
  type XiaodituiWatermarkCheckin,
  type XiaodituiWatermarkMarketLink,
} from './api'

const { Text, Title } = Typography

// TODO: 小程序注册成功后，用内建小程序替换当前小地推水印相机入口。

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return value
  }
}

function buildCameraUrl(token?: string): string {
  if (!token || typeof window === 'undefined') return ''
  return `${window.location.origin}/xiaoditui-camera?token=${encodeURIComponent(token)}`
}

export function XiaodituiWatermarkCameraTab({ enabled = true }: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const [qrRecord, setQrRecord] = useState<XiaodituiWatermarkMarketLink | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const linksQuery = useQuery({
    queryKey: ['xiaoditui', 'watermark-camera', 'links'],
    queryFn: () => xiaoditangApi.listWatermarkCameraLinks(),
    enabled,
    staleTime: 30_000,
  })

  const checkinsQuery = useQuery({
    queryKey: ['xiaoditui', 'watermark-camera', 'checkins'],
    queryFn: () => xiaoditangApi.listWatermarkCameraCheckins({ page: 1, size: 50 }),
    enabled,
    staleTime: 15_000,
  })

  const invalidateWatermarkQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'watermark-camera'] })
  }

  const enableMutation = useMutation({
    mutationFn: (marketId: number) => xiaoditangApi.enableWatermarkCameraLink(marketId),
    onSuccess: (resp) => {
      toast.success(resp.message || '水印相机链接已启用')
      invalidateWatermarkQueries()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '启用链接失败')
    },
  })

  const disableMutation = useMutation({
    mutationFn: (linkId: string) => xiaoditangApi.disableWatermarkCameraLink(linkId),
    onSuccess: (resp) => {
      toast.success(resp.message || '水印相机链接已停用')
      invalidateWatermarkQueries()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '停用链接失败')
    },
  })

  const rotateMutation = useMutation({
    mutationFn: (linkId: string) => xiaoditangApi.rotateWatermarkCameraLink(linkId),
    onSuccess: (resp) => {
      toast.success(resp.message || '水印相机链接已重置')
      invalidateWatermarkQueries()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '重置链接失败')
    },
  })

  const links = useMemo(
    () => linksQuery.data?.data?.items ?? [],
    [linksQuery.data?.data?.items],
  )
  const checkins = useMemo(
    () => checkinsQuery.data?.data?.items ?? [],
    [checkinsQuery.data?.data?.items],
  )
  const mapConfigured = linksQuery.data?.data?.map_configured ?? true

  useEffect(() => {
    let cancelled = false
    const url = buildCameraUrl(qrRecord?.link?.token)
    if (!url) {
      setQrDataUrl('')
      return
    }
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl)
    }).catch(() => {
      if (!cancelled) setQrDataUrl('')
    })
    return () => {
      cancelled = true
    }
  }, [qrRecord])

  const handleCopy = async (record: XiaodituiWatermarkMarketLink) => {
    const url = buildCameraUrl(record.link?.token)
    if (!url) return
    const ok = await copyToClipboard(url)
    if (ok) {
      toast.success('水印相机链接已复制')
    } else {
      toast.error('复制失败')
    }
  }

  const handleRotate = (record: XiaodituiWatermarkMarketLink) => {
    if (!record.link?.id) return
    Modal.confirm({
      title: '重置水印相机链接',
      content: '重置后旧链接会失效，需要把新链接重新发给推广员。',
      okText: '重置',
      cancelText: '取消',
      onOk: () => rotateMutation.mutate(record.link!.id),
    })
  }

  const linkColumns = useMemo<ColumnProps<XiaodituiWatermarkMarketLink>[]>(
    () => [
      {
        title: '推广员',
        dataIndex: 'market_name',
        width: 180,
        render: (_text, record) => (
          <div style={promoterCellStyle}>
            <Text strong ellipsis={{ showTooltip: true }}>{record.market_name}</Text>
            <Text type='tertiary' size='small'>
              {record.market_mobile || '无手机号'}
            </Text>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'link',
        width: 110,
        render: (_text, record) => record.link?.is_active ? (
          <Tag color='green'>已启用</Tag>
        ) : record.link ? (
          <Tag color='grey'>已停用</Tag>
        ) : (
          <Tag color='blue'>未生成</Tag>
        ),
      },
      {
        title: '链接',
        dataIndex: 'token',
        width: 260,
        render: (_text, record) => {
          const url = buildCameraUrl(record.link?.token)
          if (!url) return <Text type='tertiary'>—</Text>
          return <Text ellipsis={{ showTooltip: true }}>{url}</Text>
        },
      },
      {
        title: '最近使用',
        dataIndex: 'last_used_at',
        width: 170,
        render: (_text, record) => (
          <Text type='tertiary'>{formatDateTime(record.link?.last_used_at)}</Text>
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 300,
        render: (_text, record) => {
          const hasLink = Boolean(record.link)
          const active = Boolean(record.link?.is_active)
          return (
            <div style={actionGroupStyle}>
              <Button
                theme={active ? 'light' : 'solid'}
                type='primary'
                icon={<IconCamera />}
                loading={enableMutation.isPending}
                onClick={() => enableMutation.mutate(record.market_id)}
              >
                {hasLink ? '启用' : '生成'}
              </Button>
              <Tooltip content={active ? '复制链接' : '启用后可复制'}>
                <Button
                  theme='borderless'
                  type='tertiary'
                  icon={<IconCopy />}
                  disabled={!active}
                  aria-label='复制链接'
                  onClick={() => handleCopy(record)}
                />
              </Tooltip>
              <Tooltip content={active ? '查看二维码' : '启用后可查看'}>
                <Button
                  theme='borderless'
                  type='tertiary'
                  icon={<IconExternalOpen />}
                  disabled={!active}
                  aria-label='查看二维码'
                  onClick={() => setQrRecord(record)}
                />
              </Tooltip>
              <Button
                theme='borderless'
                type='tertiary'
                icon={<IconRefresh />}
                disabled={!hasLink}
                loading={rotateMutation.isPending}
                onClick={() => handleRotate(record)}
              >
                重置
              </Button>
              <Button
                theme='borderless'
                type='danger'
                disabled={!active}
                loading={disableMutation.isPending}
                onClick={() => record.link?.id && disableMutation.mutate(record.link.id)}
              >
                停用
              </Button>
            </div>
          )
        },
      },
    ],
    [disableMutation, enableMutation, rotateMutation],
  )

  const checkinColumns = useMemo<ColumnProps<XiaodituiWatermarkCheckin>[]>(
    () => [
      {
        title: '照片',
        dataIndex: 'photo_url',
        width: 88,
        render: (_text, record) => (
          <a href={record.photo_url} target='_blank' rel='noreferrer'>
            <img src={record.photo_url} alt='打卡照片' style={photoThumbStyle} />
          </a>
        ),
      },
      {
        title: '推广员',
        dataIndex: 'market_name',
        width: 140,
        render: (_text, record) => (
          <Text ellipsis={{ showTooltip: true }}>{record.market_name || '—'}</Text>
        ),
      },
      {
        title: '打卡时间',
        dataIndex: 'checkin_at',
        width: 180,
        render: (_text, record) => formatDateTime(record.checkin_at),
      },
      {
        title: '位置',
        dataIndex: 'address',
        render: (_text, record) => (
          <div style={locationCellStyle}>
            <Text ellipsis={{ showTooltip: true }}>{record.address}</Text>
            <Text type='tertiary' size='small'>
              {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
              {typeof record.accuracy_m === 'number'
                ? ` · 精度 ${Math.round(record.accuracy_m)} 米`
                : ''}
            </Text>
          </div>
        ),
      },
    ],
    [],
  )

  if (!enabled) {
    return <Empty title='小地推登录不可用' description='恢复小地推登录态后才能配置水印打卡。' />
  }

  return (
    <div style={pageStyle}>
      {!mapConfigured ? (
        <Banner
          fullMode={false}
          type='warning'
          description='高德地图服务未配置。配置 AMAP_WEB_SERVICE_KEY 后，推广员才能提交带街道地址的水印打卡。'
        />
      ) : null}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <Title heading={5} style={{ margin: 0 }}>推广员水印相机</Title>
            <Text type='tertiary' size='small'>
              每个推广员一个免登录链接，照片会写入时间、位置和姓名水印。
            </Text>
          </div>
          <Button
            icon={<IconRefresh />}
            loading={linksQuery.isFetching || checkinsQuery.isFetching}
            onClick={() => {
              linksQuery.refetch()
              checkinsQuery.refetch()
            }}
          >
            刷新
          </Button>
        </div>
        {linksQuery.isPending ? (
          <div style={loadingStyle}><Spin /> <Text type='tertiary'>正在加载推广员...</Text></div>
        ) : (
          <Table<XiaodituiWatermarkMarketLink>
            rowKey='market_id'
            columns={linkColumns}
            dataSource={links}
            pagination={false}
            empty={<Empty title='暂无推广员' description='请先同步小地推账号下的推广员。' />}
          />
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <Title heading={5} style={{ margin: 0 }}>最近打卡</Title>
            <Text type='tertiary' size='small'>最多显示最近 50 条水印打卡记录。</Text>
          </div>
        </div>
        {checkinsQuery.isPending ? (
          <div style={loadingStyle}><Spin /> <Text type='tertiary'>正在加载打卡记录...</Text></div>
        ) : (
          <Table<XiaodituiWatermarkCheckin>
            rowKey='id'
            columns={checkinColumns}
            dataSource={checkins}
            pagination={false}
            empty={<Empty title='暂无打卡记录' description='推广员提交后会显示在这里。' />}
          />
        )}
      </section>

      <Modal
        visible={!!qrRecord}
        title={qrRecord ? `${qrRecord.market_name} 的水印相机码` : '水印相机码'}
        footer={null}
        onCancel={() => setQrRecord(null)}
      >
        <div style={qrModalBodyStyle}>
          {qrDataUrl ? <img src={qrDataUrl} alt='水印相机二维码' style={qrImageStyle} /> : <Spin />}
          <Text copyable ellipsis={{ showTooltip: true }} style={qrUrlStyle}>
            {buildCameraUrl(qrRecord?.link?.token)}
          </Text>
        </div>
      </Modal>
    </div>
  )
}

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const sectionStyle: CSSProperties = {
  border: '1px solid var(--semi-color-border)',
  borderRadius: 8,
  background: 'var(--semi-color-bg-0)',
  overflow: 'hidden',
}

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  borderBottom: '1px solid var(--semi-color-border)',
}

const loadingStyle: CSSProperties = {
  minHeight: 180,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
}

const promoterCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
}

const actionGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 4,
}

const photoThumbStyle: CSSProperties = {
  width: 48,
  height: 64,
  objectFit: 'cover',
  borderRadius: 6,
  border: '1px solid var(--semi-color-border)',
  display: 'block',
}

const locationCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  gap: 2,
}

const qrModalBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 14,
  padding: '8px 0 4px',
}

const qrImageStyle: CSSProperties = {
  width: 240,
  height: 240,
}

const qrUrlStyle: CSSProperties = {
  width: '100%',
}
