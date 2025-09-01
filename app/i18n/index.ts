import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import he from './locales/he.json';

// Polyfills for Hermes (safe no-ops if already present)
try {
  if (typeof Intl === 'undefined' || !('PluralRules' in Intl)) {
    require('@formatjs/intl-locale/polyfill');
    require('@formatjs/intl-pluralrules/polyfill');
  }
} catch {}

const resources = {
  he: { translation: he },
  en: { translation: en }
};

// Initialize i18n synchronously with default values to prevent crashes
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'he', // Default language
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Load saved language asynchronously after initial setup
const loadSavedLanguage = async () => {
  try {
    const stored = await AsyncStorage.getItem('app_language');
    if (stored && (stored === 'he' || stored === 'en')) {
      await i18n.changeLanguage(stored);
    }
  } catch (error) {
    console.log('Error loading saved language:', error);
    // Continue with default language
  }
};

export const changeLanguage = async (language: string) => {
  try {
    if (language === 'he' || language === 'en') {
      await AsyncStorage.setItem('app_language', language);
      await i18n.changeLanguage(language);
    }
  } catch (error) {
    console.log('Error saving language:', error);
  }
};

// Load saved language after initialization
loadSavedLanguage();

export default i18n;