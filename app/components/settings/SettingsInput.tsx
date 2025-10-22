import React from 'react';
import { Input } from '@/app/components/ui/Input';
import { Label } from '@/app/components/ui/Label';

interface SettingsInputProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
  min?: number;
  max?: number;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({ id, label, type = 'text', value, onChange, ...props }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} {...props} />
    </div>
  );
};
