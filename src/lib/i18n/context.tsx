'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['en'];
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_hr_lang', 'en');
    }
  }, []);

  const setLanguage = (_lang: Language) => {
    setLanguageState('en');
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_hr_lang', 'en');
    }
  };

  const toggleLanguage = () => {
    setLanguageState('en');
  };

  const t = translations.en;

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
