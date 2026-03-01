/**
 * 内联音频播放器 - Spotify mini-player 风格底部播放栏
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Slider, Popover, Tooltip } from '@douyinfe/semi-ui-19'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  X,
} from 'lucide-react'

interface InlineAudioPlayerProps {
  audioUrl: string
  title?: string
  onClose: () => void
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function InlineAudioPlayer({ audioUrl, title, onClose }: InlineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  // 组件卸载或关闭时停止播放
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }, [isPlaying])

  const skipBackward = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
  }, [])

  const skipForward = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10)
  }, [duration])

  const handleSeek = useCallback((val: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = val
    setCurrentTime(val)
  }, [])

  const handleVolumeChange = useCallback((val: number) => {
    if (!audioRef.current || !Number.isFinite(val)) return
    const clamped = Math.max(0, Math.min(1, val))
    audioRef.current.volume = clamped
    setVolume(clamped)
    setIsMuted(clamped === 0)
  }, [])

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return
    const newMuted = !isMuted
    audioRef.current.muted = newMuted
    setIsMuted(newMuted)
  }, [isMuted])

  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    onClose()
  }, [onClose])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 52,
        padding: '0 12px',
        borderTop: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-1)',
        flexShrink: 0,
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* 控制按钮组 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Tooltip content="快退 10 秒" position="top">
          <Button
            theme="borderless"
            type="tertiary"
            size="small"
            icon={<SkipBack style={{ height: 14, width: 14 }} />}
            onClick={skipBackward}
            aria-label="快退 10 秒"
            style={{ height: 28, width: 28, padding: 0 }}
          />
        </Tooltip>
        <Button
          theme="solid"
          size="small"
          icon={
            isPlaying
              ? <Pause style={{ height: 14, width: 14 }} />
              : <Play style={{ height: 14, width: 14, marginLeft: 1 }} />
          }
          onClick={togglePlay}
          aria-label={isPlaying ? '暂停播放' : '开始播放'}
          style={{ height: 32, width: 32, borderRadius: '50%', padding: 0 }}
        />
        <Tooltip content="快进 10 秒" position="top">
          <Button
            theme="borderless"
            type="tertiary"
            size="small"
            icon={<SkipForward style={{ height: 14, width: 14 }} />}
            onClick={skipForward}
            aria-label="快进 10 秒"
            style={{ height: 28, width: 28, padding: 0 }}
          />
        </Tooltip>
      </div>

      {/* 当前时间 */}
      <span
        style={{
          width: 38,
          flexShrink: 0,
          textAlign: 'right',
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--semi-color-text-2)',
        }}
      >
        {formatTime(currentTime)}
      </span>

      {/* 进度条 */}
      <Slider
        value={currentTime}
        max={duration || 100}
        step={0.1}
        onChange={(val) => handleSeek(val as number)}
        tipFormatter={(v) => formatTime(v as number)}
        style={{ minWidth: 0, flex: 1 }}
      />

      {/* 总时长 */}
      <span
        style={{
          width: 38,
          flexShrink: 0,
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--semi-color-text-2)',
        }}
      >
        {formatTime(duration)}
      </span>

      {/* 分隔线 */}
      <div style={{ height: 16, width: 1, background: 'var(--semi-color-border)', flexShrink: 0 }} />

      {/* 音量控制 */}
      <Popover
        content={
          <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: 120 }}>
            <Slider
              vertical
              value={isMuted ? 0 : volume}
              max={1}
              step={0.05}
              onChange={(val) => handleVolumeChange(val as number)}
              tipFormatter={null}
              style={{ height: '100%' }}
            />
          </div>
        }
        position="top"
        trigger="click"
      >
        <Tooltip content={isMuted ? '取消静音' : '静音'} position="top">
          <Button
            theme="borderless"
            type="tertiary"
            size="small"
            icon={
              isMuted || volume === 0
                ? <VolumeX style={{ height: 14, width: 14 }} />
                : <Volume2 style={{ height: 14, width: 14 }} />
            }
            onClick={toggleMute}
            aria-label={isMuted ? '取消静音' : '静音'}
            style={{ height: 28, width: 28, padding: 0 }}
          />
        </Tooltip>
      </Popover>

      {/* 下载按钮 */}
      <Tooltip content="下载录音" position="top">
        <a
          href={audioUrl}
          download={title ? `${title}.mp3` : '录音.mp3'}
          aria-label="下载录音"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Button
            theme="borderless"
            type="tertiary"
            size="small"
            icon={<Download style={{ height: 14, width: 14 }} />}
            style={{ height: 28, width: 28, padding: 0 }}
          />
        </a>
      </Tooltip>

      {/* 关闭按钮 */}
      <Tooltip content="关闭播放器" position="top">
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          icon={<X style={{ height: 14, width: 14 }} />}
          onClick={handleClose}
          aria-label="关闭播放器"
          style={{ height: 28, width: 28, padding: 0 }}
        />
      </Tooltip>
    </div>
  )
}
