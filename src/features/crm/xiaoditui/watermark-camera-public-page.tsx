import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from 'react'
import { useSearch } from '@tanstack/react-router'
import { Banner, Button, Card, Spin, Typography } from '@douyinfe/semi-ui-19'
import {
  IconAlertTriangle,
  IconCamera,
  IconClock,
  IconRefresh,
  IconTickCircle,
} from '@douyinfe/semi-icons'

import { toast } from '@/lib/toast'
import {
  xiaoditangApi,
  type XiaodituiWatermarkCheckin,
  type XiaodituiWatermarkPublicSession,
} from './api'

const { Text, Title } = Typography

// TODO: 小程序注册成功后，用内建小程序替换当前小地推水印相机入口。

type Phase =
  | 'loading'
  | 'invalid'
  | 'ready'
  | 'processing'
  | 'captured'
  | 'submitting'
  | 'success'

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'resolved'; latitude: number; longitude: number; accuracyM?: number | null; address: string }
  | { status: 'error'; message: string }

interface CapturedPhoto {
  blob: Blob
  previewUrl: string
  watermarkedAt: Date
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function formatDateTime(value: Date | string | undefined | null): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function getLocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return '定位权限未开启'
  if (error.code === error.POSITION_UNAVAILABLE) return '当前位置不可用'
  if (error.code === error.TIMEOUT) return '定位超时'
  return '定位失败'
}

function updateServerOffset(serverTime: string | undefined, setOffset: (value: number) => void) {
  if (!serverTime) return
  const parsed = Date.parse(serverTime)
  if (Number.isFinite(parsed)) {
    setOffset(parsed - Date.now())
  }
}

function createCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('照片处理失败'))
      },
      'image/jpeg',
      0.9,
    )
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('照片读取失败'))
    }
    image.src = url
  })
}

function trimTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let next = text
  while (next.length > 1 && ctx.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1)
  }
  return `${next}...`
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  let current = ''
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = `${current}${char}`
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next
      continue
    }
    if (lines.length === maxLines - 1) {
      lines.push(trimTextToWidth(ctx, `${current}${text.slice(i)}`, maxWidth))
      return lines
    }
    lines.push(current)
    current = char
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: { marketName: string; address: string; time: Date },
) {
  const padding = clamp(width * 0.045, 36, 84)
  const titleSize = clamp(width * 0.034, 30, 56)
  const bodySize = clamp(width * 0.026, 24, 42)
  const smallSize = clamp(width * 0.02, 18, 32)
  const overlayHeight = clamp(height * 0.3, 260, 440)
  const top = height - overlayHeight
  const gradient = ctx.createLinearGradient(0, top, 0, height)

  gradient.addColorStop(0, 'rgba(15, 23, 42, 0)')
  gradient.addColorStop(0.28, 'rgba(15, 23, 42, 0.62)')
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.9)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, top, width, overlayHeight)

  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 2

  const maxWidth = width - padding * 2
  let y = top + padding * 1.45

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${titleSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`
  ctx.fillText(trimTextToWidth(ctx, params.marketName, maxWidth), padding, y)

  y += titleSize * 1.35
  ctx.font = `600 ${bodySize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`
  ctx.fillText(formatDateTime(params.time), padding, y)

  y += bodySize * 1.45
  ctx.font = `500 ${bodySize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`
  for (const line of wrapText(ctx, params.address, maxWidth, 2)) {
    ctx.fillText(line, padding, y)
    y += bodySize * 1.28
  }

  ctx.font = `500 ${smallSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
  ctx.fillText('小地推水印打卡', padding, height - padding * 0.72)
  ctx.shadowBlur = 0
}

async function createWatermarkedPhoto(
  file: File,
  params: { marketName: string; address: string; time: Date },
): Promise<Blob> {
  const image = await loadImage(file)
  const maxSide = 1800
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('当前浏览器不支持照片处理')
  canvas.width = width
  canvas.height = height
  ctx.drawImage(image, 0, 0, width, height)
  drawWatermark(ctx, width, height, params)
  return createCanvasBlob(canvas)
}

export function XiaodituiWatermarkCameraPublicPage() {
  const search = useSearch({ strict: false }) as { token?: string }
  const token = search.token ?? ''
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [session, setSession] = useState<XiaodituiWatermarkPublicSession | null>(null)
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [tick, setTick] = useState(Date.now())
  const [errorMsg, setErrorMsg] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const [result, setResult] = useState<XiaodituiWatermarkCheckin | null>(null)

  const serverNow = useMemo(
    () => new Date(tick + serverOffsetMs),
    [serverOffsetMs, tick],
  )

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (capturedPhoto?.previewUrl) {
        URL.revokeObjectURL(capturedPhoto.previewUrl)
      }
    }
  }, [capturedPhoto?.previewUrl])

  const requestLocation = useCallback(() => {
    if (!token || !session?.map_configured) return
    if (!navigator.geolocation) {
      setLocation({ status: 'error', message: '当前浏览器不支持定位' })
      return
    }

    setLocation({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        try {
          const resp = await xiaoditangApi.resolveWatermarkCameraLocation({
            token,
            latitude,
            longitude,
            accuracyM: Number.isFinite(accuracy) ? accuracy : null,
          })
          const data = resp.data
          if (!data) throw new Error(resp.message || '位置解析失败')
          updateServerOffset(data.server_time, setServerOffsetMs)
          setLocation({
            status: 'resolved',
            latitude: data.latitude,
            longitude: data.longitude,
            accuracyM: data.accuracy_m,
            address: data.address,
          })
        } catch (err) {
          setLocation({
            status: 'error',
            message: err instanceof Error ? err.message : '位置解析失败',
          })
        }
      },
      (error) => {
        setLocation({ status: 'error', message: getLocationErrorMessage(error) })
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }, [session?.map_configured, token])

  useEffect(() => {
    if (!token) {
      document.title = '水印打卡'
      setPhase('invalid')
      setErrorMsg('水印打卡链接缺少 token')
      return
    }

    let cancelled = false
    setPhase('loading')
    xiaoditangApi.validateWatermarkCameraToken(token)
      .then((resp) => {
        if (cancelled) return
        const data = resp.data
        if (!data) throw new Error(resp.message || '水印打卡链接不可用')
        setSession(data)
        updateServerOffset(data.server_time, setServerOffsetMs)
        document.title = `${data.market_name || '推广员'}水印打卡`
        setPhase('ready')
        if (!data.map_configured) {
          setLocation({ status: 'error', message: '地址解析未配置' })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPhase('invalid')
        setErrorMsg(err instanceof Error ? err.message : '水印打卡链接无效或已停用')
        document.title = '水印打卡'
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (phase === 'ready' && session?.map_configured && location.status === 'idle') {
      requestLocation()
    }
  }, [location.status, phase, requestLocation, session?.map_configured])

  const mainButtonState = useMemo(() => {
    if (!session?.map_configured) {
      return { label: '地址解析未配置', disabled: true, busy: false }
    }
    if (location.status === 'locating') {
      return { label: '定位中', disabled: true, busy: true }
    }
    if (phase === 'processing') {
      return { label: '处理中', disabled: true, busy: true }
    }
    if (phase === 'submitting') {
      return { label: '上传中', disabled: true, busy: true }
    }
    if (location.status === 'error') {
      return { label: '重新定位', disabled: false, busy: false }
    }
    return { label: '拍照打卡', disabled: phase !== 'ready' && phase !== 'success', busy: false }
  }, [location.status, phase, session?.map_configured])

  const handleMainButtonClick = useCallback(() => {
    if (location.status === 'error') {
      requestLocation()
      return
    }
    if (location.status !== 'resolved') {
      toast.warning('正在获取当前位置')
      return
    }
    fileInputRef.current?.click()
  }, [location.status, requestLocation])

  const handlePhotoChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file || !session) return
      if (location.status !== 'resolved') {
        toast.warning('请先完成定位')
        return
      }

      setPhase('processing')
      try {
        const watermarkedAt = new Date(Date.now() + serverOffsetMs)
        const blob = await createWatermarkedPhoto(file, {
          marketName: session.market_name || '推广员',
          address: location.address,
          time: watermarkedAt,
        })
        const previewUrl = URL.createObjectURL(blob)
        setCapturedPhoto((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
          return { blob, previewUrl, watermarkedAt }
        })
        setResult(null)
        setPhase('captured')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '照片处理失败')
        setPhase('ready')
      }
    },
    [location, serverOffsetMs, session],
  )

  const handleUpload = useCallback(async () => {
    if (!capturedPhoto || location.status !== 'resolved') return
    setPhase('submitting')
    try {
      const formData = new FormData()
      formData.append('token', token)
      formData.append('latitude', String(location.latitude))
      formData.append('longitude', String(location.longitude))
      if (typeof location.accuracyM === 'number') {
        formData.append('accuracy_m', String(location.accuracyM))
      }
      formData.append('address', location.address)
      formData.append('photo', capturedPhoto.blob, `xiaoditui-checkin-${Date.now()}.jpg`)

      const resp = await xiaoditangApi.submitWatermarkCameraCheckin(formData)
      const data = resp.data
      if (!data) throw new Error(resp.message || '上传失败')
      setResult(data)
      toast.success('打卡成功')
      setPhase('success')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
      setPhase('captured')
    }
  }, [capturedPhoto, location, token])

  const handleRetake = useCallback(() => {
    setCapturedPhoto((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
    setResult(null)
    setPhase('ready')
    window.setTimeout(() => fileInputRef.current?.click(), 0)
  }, [])

  if (phase === 'loading') {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Spin size='large' />
          <Text type='tertiary' style={{ marginTop: 12 }}>正在打开水印打卡...</Text>
        </div>
      </div>
    )
  }

  if (phase === 'invalid') {
    return (
      <div style={pageStyle}>
        <div style={centerStyle}>
          <Card bordered style={invalidCardStyle}>
            <Banner
              type='danger'
              fullMode={false}
              closeIcon={null}
              icon={<IconAlertTriangle />}
              title='链接不可用'
              description={errorMsg || '该水印打卡链接无效或已停用'}
            />
          </Card>
        </div>
      </div>
    )
  }

  const locationText =
    location.status === 'resolved'
      ? location.address
      : location.status === 'locating'
        ? '正在获取当前位置...'
        : location.status === 'error'
          ? location.message
          : '等待定位'

  return (
    <div style={pageStyle}>
      <main style={shellStyle}>
        <div style={headerStyle}>
          <Text type='tertiary' size='small'>小地推水印打卡</Text>
          <Title heading={4} style={nameStyle}>
            {session?.market_name || '推广员'}
          </Title>
        </div>

        <div style={stageStyle}>
          {capturedPhoto ? (
            <div style={previewPanelStyle}>
              <img src={capturedPhoto.previewUrl} alt='水印照片预览' style={previewImageStyle} />
              <div style={previewActionsStyle}>
                {phase === 'success' ? (
                  <Button
                    theme='solid'
                    type='primary'
                    icon={<IconCamera />}
                    onClick={handleRetake}
                  >
                    再次打卡
                  </Button>
                ) : (
                  <Button
                    theme='solid'
                    type='primary'
                    icon={<IconTickCircle />}
                    loading={phase === 'submitting'}
                    onClick={handleUpload}
                  >
                    上传打卡
                  </Button>
                )}
                <Button
                  theme='light'
                  icon={<IconRefresh />}
                  disabled={phase === 'submitting'}
                  onClick={handleRetake}
                >
                  重拍
                </Button>
              </div>
              {result ? (
                <Text type='tertiary' size='small'>
                  已提交：{formatDateTime(result.checkin_at)}
                </Text>
              ) : (
                <Text type='tertiary' size='small'>
                  水印时间：{formatDateTime(capturedPhoto.watermarkedAt)}
                </Text>
              )}
            </div>
          ) : (
            <button
              type='button'
              style={{
                ...cameraButtonStyle,
                ...(mainButtonState.disabled ? cameraButtonDisabledStyle : {}),
              }}
              disabled={mainButtonState.disabled}
              onClick={handleMainButtonClick}
            >
              {mainButtonState.busy ? (
                <Spin size='middle' />
              ) : (
                <IconCamera style={cameraButtonIconStyle} />
              )}
              <span style={cameraButtonTextStyle}>{mainButtonState.label}</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          capture='environment'
          style={{ display: 'none' }}
          onChange={handlePhotoChange}
        />
      </main>

      <footer style={bottomStatusStyle}>
        <div style={statusLineStyle}>
          <IconClock style={{ color: '#0f766e', flexShrink: 0 }} />
          <Text strong style={statusTextStyle}>{formatDateTime(serverNow)}</Text>
        </div>
        <Text
          type={location.status === 'error' ? 'danger' : 'tertiary'}
          ellipsis={{ showTooltip: true }}
          style={addressTextStyle}
        >
          {locationText}
        </Text>
      </footer>
    </div>
  )
}

const pageStyle: CSSProperties = {
  minHeight: '100dvh',
  background: 'linear-gradient(180deg, #f8fafc 0%, #eef7f4 100%)',
  color: '#0f172a',
}

const centerStyle: CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const invalidCardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 380,
  borderRadius: 8,
}

const shellStyle: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  minHeight: '100dvh',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 20px 154px',
  boxSizing: 'border-box',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minHeight: 64,
}

const nameStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
  maxWidth: '100%',
  textAlign: 'center',
}

const stageStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 360,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const cameraButtonStyle: CSSProperties = {
  width: 184,
  height: 184,
  border: '1px solid rgba(15, 118, 110, 0.28)',
  borderRadius: '50%',
  background: 'linear-gradient(145deg, #0f766e 0%, #14b8a6 100%)',
  boxShadow: '0 24px 58px rgba(15, 118, 110, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.32)',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
}

const cameraButtonDisabledStyle: CSSProperties = {
  opacity: 0.68,
  cursor: 'not-allowed',
  filter: 'grayscale(0.2)',
}

const cameraButtonIconStyle: CSSProperties = {
  fontSize: 52,
  color: '#ffffff',
}

const cameraButtonTextStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  lineHeight: '24px',
}

const previewPanelStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
}

const previewImageStyle: CSSProperties = {
  width: '100%',
  maxHeight: '58dvh',
  objectFit: 'contain',
  borderRadius: 8,
  background: '#0f172a',
  boxShadow: '0 18px 42px rgba(15, 23, 42, 0.18)',
}

const previewActionsStyle: CSSProperties = {
  width: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr 104px',
  gap: 10,
}

const bottomStatusStyle: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '14px 20px calc(18px + env(safe-area-inset-bottom))',
  background: 'rgba(255, 255, 255, 0.92)',
  borderTop: '1px solid rgba(15, 23, 42, 0.08)',
  backdropFilter: 'blur(18px)',
  boxShadow: '0 -14px 36px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  boxSizing: 'border-box',
}

const statusLineStyle: CSSProperties = {
  maxWidth: 480,
  width: '100%',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
}

const statusTextStyle: CSSProperties = {
  color: '#0f172a',
  fontVariantNumeric: 'tabular-nums',
  minWidth: 0,
}

const addressTextStyle: CSSProperties = {
  maxWidth: 480,
  width: '100%',
  margin: '0 auto',
  display: 'block',
}
