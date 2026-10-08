import React, { useCallback, useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useApp } from '@/lib/app-state';
import { useTheme } from '@/hooks/use-theme';
import { Btn, Card, Chip, Field, Input, Notice, Row, Screen, SectionTitle, Stat } from '@/ui/kit';

export default function SettingsScreen() {
  const {
    content,
    settings,
    updateSettings,
    syncNow,
    restoreBundled,
    pushBackup,
    exportBackup,
    importBackup,
    wipeAll,
    totals,
    routes,
    scale,
  } = useApp();
  const theme = useTheme();
  const [apiBase, setApiBase] = useState(settings.apiBase);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'success' | 'warn' | 'danger'>('info');
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [health, setHealth] = useState<string | null>(null);

  useEffect(() => setApiBase(settings.apiBase), [settings.apiBase]);

  const say = (text: string, t: 'info' | 'success' | 'warn' | 'danger' = 'info') => {
    setMessage(text);
    setTone(t);
  };

  const testConnection = useCallback(async () => {
    setBusy(true);
    setHealth(null);
    const base = apiBase.trim().replace(/\/+$/, '');
    if (!base) {
      say('اكتب رابط السيرفر أولاً، مثال: http://localhost:8787', 'warn');
      setBusy(false);
      return;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}/api/health`, { signal: controller.signal as RequestInit['signal'] });
      clearTimeout(timer);
      const json = (await res.json()) as { ok?: boolean; version?: string; keys?: string[] };
      setHealth(`صحي: ${json.ok ? 'نعم' : 'غير معروف'} • إصدار ${json.version ?? '؟'} • ${json.keys?.length ?? 0} ملف محتوى`);
      updateSettings({ apiBase: base });
      say('تمّ الاتصال بالسيرفر وحفظ رابطه.', 'success');
    } catch {
      setHealth(null);
      say('السيرفر لا يرد. شغّله بـ npm run server، وتأكد أن الرابط من جهازك لا من المتصفح.', 'danger');
    } finally {
      setBusy(false);
    }
  }, [apiBase, updateSettings]);

  const doSync = useCallback(async () => {
    setBusy(true);
    say(await syncNow(), 'info');
    setBusy(false);
  }, [syncNow]);

  const doRestore = useCallback(async () => {
    setBusy(true);
    say(await restoreBundled(), 'success');
    setBusy(false);
  }, [restoreBundled]);

  const doWipe = useCallback(async () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      say('اضغط مرة أخرى للتأكيد: سيُحذف كل تقدّم ومسار محفوظ على هذا الجهاز.', 'danger');
      return;
    }
    await wipeAll();
    setConfirmWipe(false);
    say('تمّ مسح بياناتك المحلية.', 'warn');
  }, [confirmWipe, wipeAll]);

  return (
    <Screen>
      <SectionTitle eyebrow="الإعدادات" title="السيرفر، المقياس، وبياناتك" />

      <Card>
        <SectionTitle eyebrow="لوحة التحكم" title="ربط التطبيق بالسيرفر" sub="المزامنة تجلب المحتوى (مواد/مسارات/مشاريع/مصادر) من السيرفر وتخزّنه على الجهاز." />
        <Field label="رابط السيرفر" hint="على الجوال استخدم IP الجهاز بدل localhost.">
          <Input value={apiBase} onChangeText={setApiBase} autoCapitalize="none" placeholder="http://localhost:8787" />
        </Field>
        <Row gap={Spacing.three} style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, flex: 1 }}>
            مزامنة تلقائية للمحتوى عند فتح التطبيق (يحتاج سيرفر يعمل).
          </Text>
          <Switch
            value={settings.autoSync}
            onValueChange={(v) => updateSettings({ autoSync: v })}
            trackColor={{ true: theme.primary }}
          />
        </Row>
        {health ? <Notice tone="success" title={health} /> : null}
        <Row gap={Spacing.two}>
          <Btn label={busy ? 'جارٍ…' : 'اختبار الاتصال'} onPress={() => void testConnection()} disabled={busy} />
          <Btn label="مزامنة المحتوى" variant="soft" onPress={() => void doSync()} disabled={busy || !apiBase.trim()} />
          <Btn label="استرجاع محتوى التطبيق" variant="ghost" onPress={() => void doRestore()} disabled={busy} />
        </Row>
        <View style={styles.grid}>
          <Stat label="مصدر المحتوى" value={content.source === 'server' ? 'سيرفر' : 'مضمّن'} tone={content.source === 'server' ? 'success' : 'neutral'} />
          <Stat label="إصدار المحتوى" value={content.version} />
          <Stat label="آخر مزامنة" value={content.fetchedAt ? new Date(content.fetchedAt).toLocaleString('ar-SA') : 'لم يحدث'} />
        </View>
        {message ? <Notice tone={tone} title={message} /> : null}
      </Card>

      <Card>
        <SectionTitle eyebrow="حساب المعدل" title="اختر مقياس جامعتك" sub="التقديرات المتاحة تتغيّر حسب المقياس، وأرقام الرئيسية تُعاد حسابها فوراً." />
        <Row gap={Spacing.two}>
          {Object.entries(content.program.gpaScales ?? {}).map(([key, value]) => (
            <Chip
              key={key}
              label={value.label}
              selected={settings.scaleKey === key}
              onPress={() => updateSettings({ scaleKey: key })}
            />
          ))}
        </Row>
        <Row gap={Spacing.two}>
          {(scale?.grades ?? []).map((g) => (
            <Chip key={g.key} label={`${g.key} ${g.points.toFixed(2)}`} tone="neutral" />
          ))}
        </Row>
        <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 19 }}>
          راجع لائحة كليتك: الأرقام هنا قابلة للتعديل في content/program.json أو من لوحة التحكم.
        </Text>
      </Card>

      <Card>
        <SectionTitle eyebrow="نسخ احتياطي" title="تصدير واستيراد بياناتك" sub="الملف يشمل تقدّمك ومساراتك وإعداداتك — لا يشمل محتوى الخطة." />
        <Row gap={Spacing.two}>
          <Btn label={showExport ? 'إخفاء النص' : 'اعرض نسخة للاستنساخ'} variant="soft" onPress={() => setShowExport((v) => !v)} />
          <Chip label={`معرّف الجهاز: ${settings.deviceId.slice(0, 12)}…`} tone="neutral" />
        </Row>
        {showExport ? (
          <Text selectable style={{ color: theme.text, fontSize: 11.5, fontFamily: 'var(--font-mono)', lineHeight: 17 }}>
            {exportBackup()}
          </Text>
        ) : null}
        <Field label="الصق نسخة للاستيراد" hint="يقبل ملف ai-uqu-backup كاملاً، أو كائن تقدّم فقط.">
          <Input value={importText} onChangeText={setImportText} multiline style={{ minHeight: 110, textAlignVertical: 'top' }} autoCapitalize="none" />
        </Field>
        <Row gap={Spacing.two}>
          <Btn label="رفع نسخة للسيرفر" variant="soft" onPress={async () => say(await pushBackup(), 'info')} disabled={!settings.apiBase} />
          <Btn
            label="استيراد"
            onPress={async () => {
              const res = await importBackup(importText);
              say(res, importText.trim() ? 'success' : 'warn');
            }}
            disabled={!importText.trim()}
          />
          <Btn label="مسح بياناتي" variant="danger" onPress={() => void doWipe()} />
        </Row>
      </Card>

      <Card>
        <SectionTitle eyebrow="ملخص ما عندك" title="بياناتك الآن" />
        <View style={styles.grid}>
          <Stat label="ساعات منجزة" value={`${totals.earnedHours}/${totals.totalHours}`} tone="success" />
          <Stat label="مواد مسجَّلة" value={`${totals.inProgressCount}`} tone="info" />
          <Stat label="مسارات محفوظة" value={`${routes.length}`} />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="ملاحظات صريحة" title="قبل ما تعتمد على الأرقام" />
        <Notice tone="warn" title="الخطة توضيحية" detail={content.program.disclaimer || 'المحتوى مستخرج من منصة سابقة وغير معتمد رسمياً.'} />
        <Notice tone="info" title="الاتجاه RTL" detail="على الويب مضبوط تلقائياً. على الجوال فعّل لغة النظام العربية، أو ابنِ نسخة بمحاذاة ثابتة." />
        <Notice tone="neutral" title="الخصوصية" detail="كل شيء يبقى على جهازك إلا لو ربطت سيرفر. التطبيق لا يرسل موقعك لأي مكان." />
      </Card>
    </Screen>
  );
}

const styles = {
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: Spacing.two },
};
