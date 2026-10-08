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
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppTabs />
    </>
  );
}
