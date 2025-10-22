import React from 'react';
import { CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  return (
    <>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{children}</div>
      </CardContent>
    </>
  );
};
