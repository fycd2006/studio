"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zh from '@/locales/zh';
import en from '@/locales/en';

type Language = 'zh' | 'en';

type Translations = typeof zh;

interface I18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh');

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Language;
    if (saved && (saved === 'zh' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_lang', lang);
  };

  const t = (key: keyof Translations, values?: Record<string, string | number>): string => {
    const translations = language === 'zh' ? zh : en;
    let text = translations[key] || zh[key] || key;
    
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
