import React from 'react';
import { Button } from '@/app/components/ui/Button';
import { useSettings } from '@/app/hooks/useSettings';
import { SettingsSection } from '@/app/components/settings/SettingsSection';
import { SettingsInput } from '@/app/components/settings/SettingsInput';
import { SettingsSwitch } from '@/app/components/settings/SettingsSwitch';

export const Settings: React.FC = () => {
  const { settings, handleInputChange, handleSwitchChange, handleSaveSettings } = useSettings();

  return (
    <div className="p-4">
      <SettingsSection title="Analysis Settings">
        <SettingsInput
          id="sample_interval_seconds"
          label="Sample Interval (seconds)"
          type="number"
          value={settings.sample_interval_seconds || '2'}
          onChange={handleInputChange}
        />
        <SettingsInput
          id="max_workers"
          label="Max Workers"
          type="number"
          value={settings.max_workers || ''}
          onChange={handleInputChange}
        />
        <SettingsInput
          id="batch_size"
          label="Batch Size"
          type="number"
          value={settings.batch_size || ''}
          onChange={handleInputChange}
        />
        <SettingsInput
          id="yolo_confidence"
          label="YOLO Confidence"
          type="number"
          step="0.05"
          value={settings.yolo_confidence || ''}
          onChange={handleInputChange}
          min={0}
          max={1}
        />
        <SettingsInput
          id="yolo_iou"
          label="YOLO IOU"
          type="number"
          step="0.05"
          value={settings.yolo_iou || ''}
          onChange={handleInputChange}
          min={0}
          max={1}
        />
        <SettingsInput
          id="yolo_model"
          label="YOLO Model"
          type="text"
          value={settings.yolo_model || ''}
          onChange={handleInputChange}
        />
        <SettingsInput
          id="output_dir"
          label="Output Directory"
          type="text"
          value={settings.output_dir || ''}
          onChange={handleInputChange}
        />
        <SettingsSwitch
          id="resize_to_1080p"
          label="Resize to 720p"
          checked={settings.resize_to_1080p || false}
          onCheckedChange={(checked) => handleSwitchChange('resize_to_1080p', checked)}
        />
      </SettingsSection>
      <Button onClick={handleSaveSettings}>Save Settings</Button>
    </div>
  );
};