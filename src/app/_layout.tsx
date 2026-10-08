import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { AppProvider, useApp } from '@/lib/app-state';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { ready } = useApp();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // RTL على الجوال يعتمد على لغة النظام؛ نفعّله صراحةً لواجهة عربية
      try {
        if (!I18nManager.isRTL) I18nManager.allowRTL(true);
      } catch {
        // تجاهل: بعض البيئات لا تسمح بالتبديل أثناء التشغيل
      }
    }
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('lang', 'ar');
    root.setAttribute('dir', 'rtl');
    root.style.direction = 'rtl';
    document.title = 'مسار الطالب — الذكاء الاصطناعي بجامعة أم القرى';
    applyPwaTags();
  }, []);

/**
 * وسوم التثبيت (PWA) تُحقن وقت التشغيل لأن Expo مع Metro لا يولّد index.html مخصصاً.
 * الملفات نفسها موجودة في public/ وتُنسخ إلى جذر dist عند expo export.
 */
function applyPwaTags() {
  const base = (Constants.expoConfig?.extra?.baseUrl as string | undefined) ?? '';
  const ensureLink = (rel: string, href?: string, extra?: Record<string, string>) => {
    let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      document.head.appendChild(el);
    }
    if (href) el.href = href;
    if (extra) for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
  };
  const ensureMeta = (name: string, content: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  };
  ensureLink('manifest', `${base}/manifest.webmanifest`);
  ensureLink('apple-touch-icon', `${base}/apple-touch-icon.png`);
  ensureMeta('theme-color', '#0F766E');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  ensureMeta('apple-mobile-web-app-title', 'AI UQU');
}

  return (
    <>
      <StatusBar style="auto" />
      <AppTabs />
    </>
  );
}
