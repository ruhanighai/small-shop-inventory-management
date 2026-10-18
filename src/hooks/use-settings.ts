import { useEffect, useState } from 'react';
import type { Currency } from '@/types';

const STORAGE_KEY = 'shopstock-settings';

export type Settings = {
  currency: Currency;
  theme: 'light' | 'dark';
};

const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
  theme: 'light',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      currency: parsed.currency ?? DEFAULT_SETTINGS.currency,
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return { settings, update };
}
