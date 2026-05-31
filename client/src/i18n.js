import { createI18n } from 'vue-i18n';
import { watch } from 'vue';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const supportedLocales = ['en', 'zh-CN'];
const savedLocale = localStorage.getItem('litetrack.locale');
const browserLocale = navigator.language?.startsWith('zh') ? 'zh-CN' : 'en';
const initialLocale = supportedLocales.includes(savedLocale) ? savedLocale : browserLocale;

const i18n = createI18n({
  legacy: false, // Use Composition API
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN
  }
});

watch(
  i18n.global.locale,
  (locale) => {
    localStorage.setItem('litetrack.locale', locale);
    document.documentElement.lang = locale;
  },
  { immediate: true }
);

export default i18n;
