import { useState, useEffect, useCallback } from 'react';
import { SettingsConfig } from '@/lib/types/settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<Partial<SettingsConfig>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const fetchedSettings = await window.conveyor.app.getSettings();
        setSettings(fetchedSettings);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    }));
  }, []);

  const handleSwitchChange = useCallback((id: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [id]: checked }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    try {
      await window.conveyor.app.saveSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please check the console for details.');
    }
  }, [settings]);

  return {
    settings,
    handleInputChange,
    handleSwitchChange,
    handleSaveSettings,
  };
};
