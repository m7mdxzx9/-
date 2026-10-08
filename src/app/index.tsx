import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { MaxContentWidth, Radius, Spacing, STATUS_LABELS } from '@/constants/theme';
import {
  Bar,
  Btn,
  Card,
  Chip,
  Notice,
  Row,
  Screen,
  SectionTitle,
  Stat,
  toneColors,
} from '@/ui/kit';
import { useApp } from '@/lib/app-state';
import { neededForTarget, suggestNextSemester } from '@/lib/gpa';
import { formatDistance } from '@/lib/geo';
import { useTheme } from '@/hooks/use-theme';

export default function Dashboard() {
  const { content, totals, alerts, semesters, routes, settings, views, setRecord, syncNow, scale } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestion = useMemo(() => suggestNextSemester(views, content), [views, content]);
  const gpa = totals.cumulativeGpa;
  const maxPoints = Math.max(...(scale?.grades.map((g) => g.points) ?? [5]));
  const need = useMemo(
    () => neededForTarget(totals, scale, maxPoints * 0.8),
    [totals, scale, maxPoints],
  );
  const inProgressNames = views.filter((v) => v.record.status === 'in_progress').map((v) => v.course.name);
  const recentRoutes = routes.slice(0, 3);

  const onSync = useCallback(async () => {
    setBusy(true);
    setSyncMsg(await syncNow());
    setBusy(false);
  }, [syncNow]);

  const registerSuggestion = useCallback(() => {
    if (!suggestion) return;
    suggestion.readyCourses.forEach((v) => setRecord(v.course.id, { status: 'in_progress' }));
  }, [suggestion, setRecord]);

  return (
    <Screen>
      <View style={{ gap: Spacing.two }}>
        <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>
          {content.program.university}
        </Text>
        <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', lineHeight: 32 }}>
          {content.program.program}
        </Text>
        <Row gap={Spacing.two}>
          <Chip
            label={content.source === 'server' ? 'محتوى من السيرفر' : 'محتوى مضمّن'}
            tone={content.source === 'server' ? 'success' : 'neutral'}
          />
          <Chip label={`إصدار ${content.version}`} tone="neutral" />
          {content.fetchedAt ? (
            <Chip label={`آخر مزامنة ${new Date(content.fetchedAt).toLocaleDateString('ar-SA')}`} tone="info" />
          ) : null}
        </Row>
      </View>

      {content.program.disclaimer ? <Notice tone="warn" title={content.program.disclaimer} /> : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>المعدل التراكمي</Text>
            <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800', lineHeight: 40 }}>
              {gpa == null ? '—' : gpa.toFixed(2)}
              <Text style={{ fontSize: 15, color: theme.textSecondary }}> / {maxPoints.toFixed(1)}</Text>
            </Text>
          </View>
          <Chip label={scale?.label ?? ''} tone="neutral" />
        </Row>
        <Bar value={totals.percent} max={100} tone={totals.percent > 60 ? 'success' : 'info'} />
        <Text style={{ color: theme.textSecondary, fontSize: 12.5 }}>
          {totals.earnedHours} ساعة منجزة من {totals.totalHours} ({totals.percent}٪ من الخطة)
          {totals.inProgressHours > 0 ? ` • ${totals.inProgressHours} ساعة قيد الدراسة` : ''}
        </Text>
        <View style={styles.grid}>
          <Stat label="مواد منجزة" value={`${totals.doneCount}`} tone="success" />
          <Stat label="مسجَّلة الآن" value={`${totals.inProgressCount}`} tone="info" />
          <Stat label="معدولة / راسب" value={`${totals.failedCount}`} tone={totals.failedCount > 0 ? 'danger' : 'neutral'} />
        </View>
        {totals.attemptedHours > 0 ? (
          <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
            {need.feasible
              ? `للوصول إلى ${maxPoints === 5 ? '4.00' : '3.20'} تحتاج متوسط ${need.neededAverage.toFixed(2)} نقطة في المتبقي${need.nearestGrade ? ` (تقدير ${need.nearestGrade} أو أعلى)` : ''}.`
              : `الهدف غير قابل للتحقق: أفضل نتيجة ممكنة ${need.bestCase.toFixed(2)}.`}
          </Text>
        ) : null}
      </Card>

      <View style={{ gap: Spacing.three }}>
        <SectionTitle eyebrow="تنبيهات الخطة" title={`${alerts.length} ملاحظة تحتاج قرارك`} />
        {alerts.length === 0 ? (
          <Notice tone="success" title="ما فيه تنبيهات — خطتك متسقة مع المتطلبات." />
        ) : (
          alerts.map((a) => (
            <Notice key={a.id} tone={a.tone} title={a.title} detail={a.detail} />
          ))
        )}
      </View>

      {suggestion ? (
        <Card>
          <SectionTitle eyebrow="تسجيل الفصل القادم" title={`الفصل ${suggestion.semester} جاهز`} />
          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
            {suggestion.readyCourses.length} مادة مستوفاة المتطلبات ({suggestion.hours} ساعة){' '}
            {suggestion.blockedCourses.length > 0
              ? `— و${suggestion.blockedCourses.length} معلّقة على متطلب.`
              : '— كلها جاهزة.'}
          </Text>
          <View style={{ gap: Spacing.two }}>
            {suggestion.readyCourses.map((v) => (
              <Row key={v.course.id} style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '600', flex: 1 }}>
                  {v.course.id} • {v.course.name}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{v.hours} س</Text>
              </Row>
            ))}
          </View>
          <Row>
            <Btn label="سجّل هذه المواد" onPress={registerSuggestion} />
            <Btn label="افتح المتابعة" variant="ghost" onPress={() => router.push('/plan')} />
          </Row>
        </Card>
      ) : null}

      <Card>
        <SectionTitle eyebrow="معدل كل فصل" title="SGPA حسب الفصل" />
        {semesters.filter((s) => s.gpa != null).length === 0 ? (
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            سجّل تقديرات المواد المنجزة ليظهر معدل كل فصل.
          </Text>
        ) : (
          <View style={styles.semRow}>
            {semesters.map((s) => (
              <View key={s.semester} style={[styles.semCell, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>فصل {s.semester}</Text>
                <Text style={{ color: s.gpa == null ? theme.textSecondary : theme.text, fontSize: 15, fontWeight: '800' }}>
                  {s.gpa == null ? '—' : s.gpa.toFixed(2)}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 10.5 }}>
                  {s.doneCredits}/{s.plannedCredits} س
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <SectionTitle eyebrow="خطوطك المسجَّلة" title={`${routes.length} مسار محفوظ`} />
          <Btn label="افتح الخريطة" variant="soft" onPress={() => router.push('/map')} />
        </Row>
        {recentRoutes.length === 0 ? (
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            ابدأ تسجيلاً جديداً من تبويب الخريطة، أو أضف مساراً تجريبياً لتجربة الميزة.
          </Text>
        ) : (
          recentRoutes.map((r) => (
            <Row key={r.id} style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: theme.text, fontSize: 13.5, flex: 1 }} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12.5 }}>
                {formatDistance(r.distanceM)} • {r.points.length} نقطة
              </Text>
            </Row>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle eyebrow="الحِمل الحالي" title="المواد المسجَّلة الآن" />
        {inProgressNames.length === 0 ? (
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>لا توجد مواد قيد الدراسة.</Text>
        ) : (
          <Row>
            {inProgressNames.map((n) => (
              <Chip key={n} label={n} tone="info" />
            ))}
          </Row>
        )}
        <Row>
          <Chip label={STATUS_LABELS.done} tone="success" />
          <Chip label={STATUS_LABELS.deferred} tone="warn" />
          <Chip label={STATUS_LABELS.withdrawn} tone="warn" />
        </Row>
      </Card>

      <Card>
        <SectionTitle eyebrow="المزامنة" title={settings.apiBase ? 'المزامنة مع السيرفر' : 'التخزين محلي فقط'} />
        <Text style={{ color: theme.textSecondary, fontSize: 12.5, lineHeight: 19 }}>
          {settings.apiBase
            ? `السيرفر: ${settings.apiBase}`
            : 'لم يُضبط رابط السيرفر. كل شيء محفوظ على جهازك، وقد تحدّث لوحة التحكم المحتوى عند ربط السيرفر.'}
        </Text>
        {syncMsg ? <Notice tone="info" title={syncMsg} /> : null}
        <Row>
          <Btn label={busy ? 'جارٍ…' : 'مزامنة المحتوى'} onPress={onSync} disabled={busy || !settings.apiBase} />
          <Btn label="الإعدادات" variant="ghost" onPress={() => router.push('/settings')} />
        </Row>
      </Card>
    </Screen>
  );
}

const styles = {
  grid: {
    flexDirection: 'row' as const,
    gap: Spacing.two,
    flexWrap: 'wrap' as const,
    maxWidth: MaxContentWidth,
  },
  semRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.two,
  },
  semCell: {
    minWidth: 74,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center' as const,
    gap: 1,
  },
};
