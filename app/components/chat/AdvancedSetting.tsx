import { AspectRatio } from '@/lib/types'
import { SearchMetadata, VideoConfig } from '@/lib/types/search'
import { type FC, type ChangeEvent, useCallback, useMemo } from 'react'


interface AdvancedSettingProps {
  showAdvancedSettings: boolean
  setShowAdvancedSettings: (show: boolean) => void
  videoConfig: VideoConfig
  searchMetadata: SearchMetadata
  setVideoConfig: (config: VideoConfig | ((prev: VideoConfig) => VideoConfig)) => void
}

const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '21:9', label: '21:9 (Cinematic)' },
] as const

const FPS_CONFIG = {
  MIN: 24,
  MAX: 60,
  STEP: 1,
} as const

const ICONS = {
  COLLAPSED: '▶',
  EXPANDED: '▼',
  INFO: 'ℹ️',
} as const

const clampFps = (value: number): number => {
  return Math.max(FPS_CONFIG.MIN, Math.min(FPS_CONFIG.MAX, value))
}

const formatFpsLabel = (fps: number): string => {
  return `${fps} fps`
}

export const AdvancedSetting: FC<AdvancedSettingProps> = ({
  showAdvancedSettings,
  setShowAdvancedSettings,
  videoConfig,
  searchMetadata,
  setVideoConfig,
}) => {
  const toggleIcon = useMemo(() => (showAdvancedSettings ? ICONS.EXPANDED : ICONS.COLLAPSED), [showAdvancedSettings])

  const hasDetectedAspectRatio = useMemo(() => Boolean(searchMetadata.aspectRatio), [searchMetadata.aspectRatio])

  const currentFpsLabel = useMemo(() => formatFpsLabel(videoConfig.fps), [videoConfig.fps])

  const handleToggleSettings = useCallback((): void => {
    setShowAdvancedSettings(!showAdvancedSettings)
  }, [showAdvancedSettings, setShowAdvancedSettings])

  const handleAspectRatioChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const aspectRatio = e.target.value as AspectRatio
      setVideoConfig((prev) => ({
        ...prev,
        aspectRatio,
      }))
    },
    [setVideoConfig]
  )

  const handleFpsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const rawValue = parseInt(e.target.value, 10)
      const fps = clampFps(rawValue)

      setVideoConfig((prev) => ({
        ...prev,
        fps,
      }))
    },
    [setVideoConfig]
  )

  return (
    <div className="video-config-panel">
      <button
        type="button"
        className="advanced-settings-toggle"
        onClick={handleToggleSettings}
        aria-expanded={showAdvancedSettings}
        aria-controls="advanced-settings-content"
        aria-label={`${showAdvancedSettings ? 'Hide' : 'Show'} advanced settings`}
      >
        <span className="toggle-icon" aria-hidden="true">
          {toggleIcon}
        </span>
        Advanced Settings
      </button>

      {showAdvancedSettings && (
        <div
          id="advanced-settings-content"
          className="config-options"
          role="region"
          aria-label="Advanced video configuration options"
        >
          <div className="config-row">
            <div className="config-item">
              <label htmlFor="aspect-ratio-select">Aspect Ratio</label>
              <select
                id="aspect-ratio-select"
                value={videoConfig.aspectRatio}
                onChange={handleAspectRatioChange}
                className="config-select"
                aria-describedby={hasDetectedAspectRatio ? 'detected-aspect-ratio-info' : undefined}
              >
                {ASPECT_RATIO_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="config-item">
              <label htmlFor="fps-slider">
                Frame Rate: <strong>{currentFpsLabel}</strong>
              </label>
              <input
                id="fps-slider"
                type="range"
                min={FPS_CONFIG.MIN}
                max={FPS_CONFIG.MAX}
                step={FPS_CONFIG.STEP}
                value={videoConfig.fps}
                onChange={handleFpsChange}
                className="config-slider"
                aria-valuemin={FPS_CONFIG.MIN}
                aria-valuemax={FPS_CONFIG.MAX}
                aria-valuenow={videoConfig.fps}
                aria-valuetext={currentFpsLabel}
              />
              <div className="slider-labels" aria-hidden="true">
                <span>{formatFpsLabel(FPS_CONFIG.MIN)}</span>
                <span>{formatFpsLabel(FPS_CONFIG.MAX)}</span>
              </div>
            </div>
          </div>

          {hasDetectedAspectRatio && (
            <div id="detected-aspect-ratio-info" className="config-info" role="status" aria-live="polite">
              <span className="info-icon" aria-hidden="true">
                {ICONS.INFO}
              </span>
              <span>
                Detected aspect ratio from search: <strong>{searchMetadata.aspectRatio}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
