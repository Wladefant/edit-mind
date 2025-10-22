import React, { useState, useEffect } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Switch } from '@/app/components/ui/switch'

import { SettingsConfig } from '@/lib/types/settings'
import { Label } from '@/app/components/ui/label'

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Partial<SettingsConfig>>({})

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await window.conveyor.app.getSettings()
        setSettings(settings)
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target
    setSettings((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    }))
  }

  const handleSaveSettings = async () => {
    try {
      await window.conveyor.app.saveSettings(settings)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please check the console for details.')
    }
  }

  return (
    <div className="p-4">
      <CardHeader>
        <CardTitle>Analysis Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sample_interval_seconds">Sample Interval (seconds)</Label>
            <Input
              id="sample_interval_seconds"
              type="number"
              value={settings.sample_interval_seconds || '2'}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_workers">Max Workers</Label>
            <Input id="max_workers" type="number" value={settings.max_workers || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch_size">Batch Size</Label>
            <Input id="batch_size" type="number" value={settings.batch_size || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yolo_confidence">YOLO Confidence</Label>
            <Input
              id="yolo_confidence"
              type="number"
              step="0.05"
              value={settings.yolo_confidence || ''}
              onChange={handleInputChange}
              min={0}
              max={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yolo_iou">YOLO IOU</Label>
            <Input
              id="yolo_iou"
              type="number"
              step="0.05"
              value={settings.yolo_iou || ''}
              onChange={handleInputChange}
              min={0}
              max={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yolo_model">YOLO Model</Label>
            <Input id="yolo_model" type="text" value={settings.yolo_model || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="output_dir">Output Directory</Label>
            <Input id="output_dir" type="text" value={settings.output_dir || ''} onChange={handleInputChange} />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="resize_to_720p"
              checked={settings.resize_to_720p || false}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, resize_to_720p: checked }))}
            />
            <Label htmlFor="resize_to_720p">Resize to 720p</Label>
          </div>
        </div>
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </CardContent>
    </div>
  )
}
