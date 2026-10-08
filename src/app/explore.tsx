import * as Linking from 'expo-linking';
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Spacing, STATUS_LABELS, STATUS_TONE, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-state';
import { Bar, Btn, Card, Chip, Field, Input, Notice, Row, Screen, SectionTitle, Segmented, toneColors } from '@/ui/kit';

type Mode = 'tracks' | 'projects' | 'resources' | 'dev';

export default function ExploreScreen() {
  const [mode, setMode] = useState<Mode>('tracks');
  return (
    <Screen>
      <SectionTitle eyebrow="استكشاف" title="المسارات والمشاريع والمصادر" sub="كل شيء مقروء من ملفات JSON في مجلد content، ويمكن للسيرفر تحديثه." />
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'tracks', label: 'المسارات' },
          { value: 'projects', label: 'المشاريع' },
          { value: 'resources', label: 'المصادر' },
          { value: 'dev', label: 'التطوير' },
        ]}
      />
      {mode === 'tracks' ? <Tracks /> : null}
      {mode === 'projects' ? <Projects /> : null}
      {mode === 'resources' ? <Resources /> : null}
      {mode === 'dev' ? <Dev /> : null}
    </Screen>
  );
}

function Tracks() {
  const { content, progress } = useApp();
  const theme = useTheme();
  return (
    <>
      {content.tracks.map((t) => {
        const courses = t.courses.map((id) => content.courses.find((c) => c.id === id)).filter(Boolean);
        const done = courses.filter((c) => progress[c!.id]?.status === 'done').length;
        const inProgress = courses.filter((c) => progress[c!.id]?.status === 'in_progress').length;
        const pct = courses.length ? Math.round(((done + inProgress * 0.5) / courses.length) * 100) : 0;
        return (
          <Card key={t.id}>
            <SectionTitle eyebrow={t.semesters.map((s) => `فصل ${s}`).join(' • ')} title={t.name} sub={t.summary} />
            <View style={{ gap: Spacing.two }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                تقدّمك في مواد المسار: {done}/{courses.length} منجزة{inProgress ? ` • ${inProgress} قيد الدراسة` : ''}
              </Text>
              <Bar value={pct} max={100} tone={pct >= 80 ? 'success' : 'info'} />
            </View>
            <View style={{ gap: Spacing.two }}>
              {courses.map((c) => {
                const rec = progress[c!.id] ?? { status: 'todo' as const };
                const tone: Tone = STATUS_TONE[rec.status];
                const c2 = toneColors(theme, tone);
                return (
                  <Row key={c!.id} gap={Spacing.two} style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.text, fontSize: 13.5, flex: 1 }}>
                      {c!.id} • {c!.name}
                    </Text>
                    <Text style={{ color: c2.fg, fontSize: 11.5, fontWeight: '800' }}>{STATUS_LABELS[rec.status]}</Text>
                  </Row>
                );
              })}
            </View>
            <Row gap={Spacing.two}>
              {t.tools.map((tool) => (
                <Chip key={tool} label={tool} tone="neutral" />
              ))}
            </Row>
            {t.resources.length > 0 ? (
              <Row gap={Spacing.two}>
                {t.resources.map((url) => (
                  <Btn
                    key={url}
                    label={url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}
                    variant="soft"
                    onPress={() => void Linking.openURL(url)}
                  />
                ))}
              </Row>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

function Projects() {
  const { content } = useApp();
  const theme = useTheme();
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const sorted = useMemo(() => [...content.projects].sort((a, b) => a.level - b.level), [content.projects]);
  return (
    <>
      {sorted.map((p) => (
        <Card key={p.id}>
          <Row gap={Spacing.two} style={{ justifyContent: 'space-between' }}>
            <SectionTitle eyebrow={`مستوى ${p.level}`} title={p.title} />
            <Chip label={`${p.steps?.length ?? 0} خطوة`} tone="neutral" />
          </Row>
          <Text style={{ color: theme.textSecondary, fontSize: 13.5, lineHeight: 21 }}>{p.summary}</Text>
          <Row gap={Spacing.two}>
            {p.tools.map((t) => (
              <Chip key={t} label={t} tone="info" />
            ))}
          </Row>
          <View style={{ gap: Spacing.two }}>
            <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '800' }}>المخرجات المطلوبة</Text>
            {p.deliverables.map((d) => (
              <Row key={d} gap={Spacing.two}>
                <Text style={{ color: theme.primary, fontSize: 13 }}>•</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{d}</Text>
              </Row>
            ))}
          </View>
          {p.steps && p.steps.length > 0 ? (
            <>
              <Btn
                label={openSteps[p.id] ? 'إخفاء الخطوات' : 'اعرض خطوات التنفيذ'}
                variant="ghost"
                onPress={() => setOpenSteps((s) => ({ ...s, [p.id]: !s[p.id] }))}
              />
              {openSteps[p.id] ? (
                <View style={{ gap: Spacing.two }}>
                  {p.steps.map((s, i) => (
                    <Row key={s} gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
                      <Text style={{ color: theme.primary, fontSize: 12.5, fontWeight: '800', minWidth: 18 }}>{i + 1}.</Text>
                      <Text style={{ color: theme.text, fontSize: 13, lineHeight: 20, flex: 1 }}>{s}</Text>
                    </Row>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function Resources() {
  const { content } = useApp();
  const theme = useTheme();
  return (
    <>
      {content.resources.map((g) => (
        <Card key={g.id}>
          <SectionTitle eyebrow="مصدر موثوق" title={g.name} sub={g.summary} />
          <View style={{ gap: Spacing.two }}>
            {g.links.map((l) => (
              <Row key={l.url} gap={Spacing.three} style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: theme.text, fontSize: 13.5, flex: 1 }} numberOfLines={1}>
                  {l.label}
                </Text>
                <Btn label="افتح" variant="soft" onPress={() => void Linking.openURL(l.url)} />
              </Row>
            ))}
          </View>
        </Card>
      ))}
    </>
  );
}

function Dev() {
  const theme = useTheme();
  const [ask, setAsk] = useState('');
  const prompts = [
    'اشرح مادة التعلم العميق مع أمثلة بسيطة.',
    'كيف أبدأ مشروع خدمة توصية مقررات باستخدام FastAPI؟',
    'اربط لي موارد معالجة اللغة العربية وأفضل الأدوات.',
  ];
  const openAssistant = (question: string) => {
    const q = encodeURIComponent(question.trim() || prompts[0]);
    void Linking.openURL(`https://chatgpt.com/?q=${q}`);
  };
  return (
    <>
      <Card>
        <SectionTitle eyebrow="الأوامر" title="تشغيل التطبيق والسيرفر" />
        <View style={{ gap: Spacing.three }}>
          {[
            ['npm run web', 'تشغيل نسخة الويب للمعاينة السريعة'],
            ['npm run android', 'تشغيله على جوال أو محاكي أندرويد'],
            ['npm run ios', 'تشغيله على iOS (يتطلب macOS)'],
            ['npm run server', 'تشغيل سيرفر المحتوى + لوحة التحكم'],
            ['npm run typecheck', 'فحص الأنواع بدون بناء'],
            ['npm run build:apk', 'بناء نسخة أندرويد للنشر (EAS)'],
          ].map(([cmd, desc]) => (
            <View key={cmd} style={{ gap: 2 }}>
              <Text style={{ color: theme.primary, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: '700' }}>
                {cmd}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{desc}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle
          eyebrow="هيكل المشروع"
          title="أين تعيش الأشياء"
          sub="content/*.json للمحتوى • src/app للشاشات • src/lib للمنطق (GPA، الخريطة، المزامنة) • server/ للوحة التحكم."
        />
        <Notice
          tone="info"
          title="المتابعة تعمل بدون إنترنت"
          detail="التقديرات والمسارات تُخزَّن على الجهاز مباشرة. المزامنة اختيارية وتُستخدم لتحديث المحتوى من لوحة التحكم."
        />
      </Card>

      <Card>
        <SectionTitle eyebrow="المساعد الذكي" title="اسأل عن أي مقرر أو مشروع" sub="يُفتح ChatGPT بسؤالك جاهزاً — بدون مفتاح API ولا سيرفر." />
        <View style={{ gap: Spacing.two }}>
          {prompts.map((p) => (
            <Chip key={p} label={p} tone="neutral" onPress={() => openAssistant(p)} />
          ))}
        </View>
        <Field label="سؤالك للمساعد" hint="اكتب سؤالك ثم افتح المحادثة — لا يُخزَّن أي شيء داخل التطبيق.">
          <Input value={ask} onChangeText={setAsk} placeholder="مثال: كيف أجهّز عرض مشروع التخرج؟" onSubmitEditing={() => openAssistant(ask)} returnKeyType="go" />
        </Field>
        <Btn label="افتح المحادثة" onPress={() => openAssistant(ask)} />
      </Card>
    </>
  );
}
