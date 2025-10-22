import React from 'react';
import { Switch } from '@/app/components/ui/Switch';
import { Label } from '@/app/components/ui/Label';

interface SettingsSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({ id, label, checked, onCheckedChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
};
