import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Radius, Spacing, STATUS_LABELS, STATUS_TONE, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-state';
import type { CourseStatus } from '@/lib/types';
import { Bar, Btn, Card, Chip, Field, Input, Notice, Row, Screen, SectionTitle, Segmented, Sheet, toneColors } from '@/ui/kit';

type Mode = 'track' | 'plan' | 'graph';
type Filter = 'all' | 'in_progress' | 'done' | 'issue';

const STATUSES: CourseStatus[] = ['todo', 'in_progress', 'done', 'failed', 'deferred', 'withdrawn'];

export default function PlanScreen() {
  const { content, views, semesters, setRecord, scale } = useApp();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('track');
  const [filter, setFilter] = useState<Filter>('all');
  const [openSemesters, setOpenSemesters] = useState<Record<number, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = views.find((v) => v.course.id === editingId) ?? null;
  const byId = useMemo(() => new Map(content.courses.map((c) => [c.id, c])), [content.courses]);
  const grouped = useMemo(() => {
    const map = new Map<number, typeof views>();
    for (const v of views) {
      const list = map.get(v.course.semester) ?? [];
      list.push(v);
      map.set(v.course.semester, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [views]);

  const hasIssue = (id: string) => {
    const v = views.find((x) => x.course.id === id);
    if (!v) return false;
    return v.prereqState !== 'ready' || ((v.record.status === 'done' || v.record.status === 'failed') && v.points == null);
  };

  const visible = useMemo(() => {
    if (filter === 'all') return undefined;
    if (filter === 'issue') return undefined;
    return filter;
  }, [filter]);

  const semesterList = (list: typeof views) =>
    list.filter((v) => {
      if (visible && v.record.status !== visible) return false;
      if (filter === 'issue') return hasIssue(v.course.id);
      return true;
    });

  const toggleAll = (list: typeof views, status: CourseStatus) => {
    list.forEach((v) => {
      const same = v.record.status === status;
      setRecord(v.course.id, { status: same ? 'todo' : status });
    });
  };

  return (
    <Screen>
      <SectionTitle
        eyebrow="الخطة والمتابعة"
        title="سجّل حالتك الحقيقية مادة بمادة"
        sub="الحالة والتقدير والساعات تُحفظ على جهازك فوراً، وتُبنى عليها كل الأرقام في الرئيسية."
      />
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'track', label: 'المتابعة' },
          { value: 'plan', label: 'الخطة' },
          { value: 'graph', label: 'شجرة المتطلبات' },
        ]}
      />

      {mode === 'track' ? (
        <>
          <Row>
            {(
              [
                ['all', 'الكل'],
                ['in_progress', 'مسجَّلة الآن'],
                ['done', 'منجزة'],
                ['issue', 'فيها مشكلة'],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <Chip key={key} label={label} selected={filter === key} onPress={() => setFilter(key)} />
            ))}
          </Row>

          {grouped.map(([sem, list]) => {
            const open = openSemesters[sem] ?? true;
            const summary = semesters.find((s) => s.semester === sem);
            const filtered = semesterList(list);
            const issues = list.filter((v) => hasIssue(v.course.id)).length;
            return (
              <Card key={sem}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>الفصل {sem}</Text>
                  <Row gap={Spacing.two}>
                    {issues > 0 ? <Chip label={`${issues} ملاحظة`} tone="warn" /> : null}
                    {summary?.gpa != null ? <Chip label={`SGPA ${summary.gpa.toFixed(2)}`} tone="success" /> : null}
                  </Row>
                </Row>
                <Bar
                  value={summary?.doneCredits ?? 0}
                  max={Math.max(1, summary?.plannedCredits ?? 1)}
                  tone={summary && summary.doneCredits >= (summary?.plannedCredits ?? 0) ? 'success' : 'info'}
                />
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  منجَز {summary?.doneCredits ?? 0}/{summary?.plannedCredits ?? 0} ساعة
                  {summary && summary.inProgressCredits > 0 ? ` • مسجَّل ${summary.inProgressCredits}` : ''}
                </Text>

                {open ? (
                  <View style={{ gap: Spacing.two }}>
                    {filtered.length === 0 ? (
                      <Text style={{ color: theme.textSecondary, fontSize: 12.5 }}>
                        لا مواد مطابقة للفلتر الحالي في هذا الفصل.
                      </Text>
                    ) : (
                      filtered.map((v) => {
                        const tone: Tone = STATUS_TONE[v.record.status];
                        const c = toneColors(theme, tone);
                        return (
                          <PressRow
                            key={v.course.id}
                            onPress={() => setEditingId(v.course.id)}
                            borderColor={theme.border}
                            background={theme.backgroundElement}>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                                {v.course.name}
                              </Text>
                              <Text style={{ color: theme.textSecondary, fontSize: 11.5 }}>
                                {v.course.id} • {v.hours} ساعة • {v.course.group}
                                {v.record.status === 'in_progress' && v.prereqState !== 'ready'
                                  ? v.prereqState === 'repeat'
                                    ? ' • متطلب لم يُنجَح'
                                    : ' • متطلب معلّق'
                                  : ''}
                              </Text>
                            </View>
                            <View style={{ gap: 3, alignItems: 'flex-end' }}>
                              <Text style={{ color: c.fg, fontSize: 11.5, fontWeight: '800' }}>
                                {STATUS_LABELS[v.record.status]}
                              </Text>
                              {v.record.grade ? (
                                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                                  {v.record.grade}
                                </Text>
                              ) : null}
                            </View>
                          </PressRow>
                        );
                      })
                    )}
                    <Row gap={Spacing.two}>
                      <Btn label="علّم المتبقي مسجَّلاً" variant="soft" onPress={() => toggleAll(list, 'in_progress')} />
                      <Btn label="تفريغ الفصل" variant="ghost" onPress={() => toggleAll(list, 'todo')} />
                    </Row>
                  </View>
                ) : null}
                <Btn label={open ? 'طيّ الفصل' : 'توسيع الفصل'} variant="ghost" onPress={() => setOpenSemesters((p) => ({ ...p, [sem]: !open }))} />
              </Card>
            );
          })}
        </>
      ) : null}

      {mode === 'plan' ? (
        grouped.map(([sem, list]) => (
          <Card key={sem}>
            <SectionTitle eyebrow={`الفصل ${sem}`} title={`${list.length} مقررات`} />
            <View style={{ gap: Spacing.three }}>
              {list.map((v) => (
                <View key={v.course.id} style={{ gap: 3 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                    {v.course.name}
                    <Text style={{ color: theme.textSecondary, fontWeight: '500' }}>  ({v.course.id} • {v.hours} س)</Text>
                  </Text>
                  {v.course.outcomes.length > 0 ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
                      المخرجات: {v.course.outcomes.join('، ')}
                    </Text>
                  ) : null}
                  {v.course.prereqs.length > 0 ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 11.5 }}>
                      المتطلبات: {v.course.prereqs.join('، ')}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Card>
        ))
      ) : null}

      {mode === 'graph' ? (
        <>
          <Notice
            tone="info"
            title="كيف تُقرأ الشجرة؟"
            detail="أخضر: منجز. أزرق: مسجَّل. برتقالي: لم يبدأ. أحمر: متطلب لم يُنجَح ويجب إعادته. الفروع تُبنى من حقل prereqs في الخطة."
          />
          {grouped.map(([sem, list]) => (
            <Card key={sem}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>الفصل {sem}</Text>
                <Chip label={`${list.length} مواد`} tone="neutral" />
              </Row>
              {list.map((v) => (
                <TreeView
                  key={v.course.id}
                  id={v.course.id}
                  depth={0}
                  byId={byId}
                  statusOf={(id) => views.find((x) => x.course.id === id)?.record.status ?? 'todo'}
                  failedOf={(id) => views.find((x) => x.course.id === id)?.prereqState === 'repeat'}
                />
              ))}
            </Card>
          ))}
        </>
      ) : null}

      <Sheet visible={!!editing} onClose={() => setEditingId(null)} title={editing?.course.name ?? ''}>
        {editing ? (
          <Editor
            key={editing.course.id}
            initial={editing}
            grades={scale?.grades ?? []}
            onSave={(patch) => {
              setRecord(editing.course.id, patch);
              setEditingId(null);
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

function PressRow({
  children,
  onPress,
  borderColor,
  background,
}: {
  children: React.ReactNode;
  onPress: () => void;
  borderColor: string;
  background: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor,
        backgroundColor: background,
        opacity: pressed ? 0.8 : 1,
      })}>
      {children}
    </Pressable>
  );
}

function Editor({
  initial,
  grades,
  onSave,
}: {
  initial: { course: { name: string; prereqs: string[] }; record: { status: CourseStatus; grade?: string; note?: string; hoursOverride?: number }; hours: number; pendingPrereqs: string[]; failedPrereqs: string[] };
  grades: { key: string; points: number }[];
  onSave: (patch: { status: CourseStatus; grade?: string; note?: string; hoursOverride?: number }) => void;
}) {
  const theme = useTheme();
  const [status, setStatus] = useState<CourseStatus>(initial.record.status);
  const [grade, setGrade] = useState<string | undefined>(initial.record.grade);
  const [hours, setHours] = useState(String(initial.hours));
  const [note, setNote] = useState(initial.record.note ?? '');
  const needsGrade = status === 'done' || status === 'failed';

  return (
    <View style={{ gap: Spacing.four }}>
      {initial.pendingPrereqs.length > 0 || initial.failedPrereqs.length > 0 ? (
        <Notice
          tone={initial.failedPrereqs.length > 0 ? 'danger' : 'warn'}
          title={
            initial.failedPrereqs.length > 0
              ? `متطلبات لم تُنجَح: ${initial.failedPrereqs.join('، ')}`
              : `متطلبات معلّقة: ${initial.pendingPrereqs.join('، ')}`
          }
          detail="التسجيل قبل استيفاء المتطلب قد يُرفض في الحذف والإضافة. راجع المرشد الأكاديمي."
        />
      ) : (
        <Text style={{ color: theme.textSecondary, fontSize: 12.5 }}>كل المتطلبات مستوفاة لهذا المقرر.</Text>
      )}

      <Field label="الحالة">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {STATUSES.map((s) => (
            <Chip key={s} label={STATUS_LABELS[s]} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </View>
      </Field>

      {needsGrade ? (
        <Field label="التقدير" hint="بدون تقدير لا يدخل المادة في حساب المعدل.">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {grades.map((g) => (
              <Chip
                key={g.key}
                label={`${g.key} (${g.points.toFixed(2)})`}
                selected={grade === g.key}
                tone="neutral"
                onPress={() => setGrade(grade === g.key ? undefined : g.key)}
              />
            ))}
          </View>
        </Field>
      ) : null}

      <Field label="ساعات معتمدة" hint="اغيّرها لو خطتك الفعلية تختلف عن الخطة المعروضة.">
        <Input
          value={hours}
          keyboardType="numeric"
          onChangeText={(t) => setHours(t.replace(/[^0-9.]/g, ''))}
        />
      </Field>

      <Field label="ملاحظة">
        <Input value={note} multiline onChangeText={setNote} placeholder="دكتور، شعبة، شرط… " style={{ minHeight: 80, textAlignVertical: 'top' }} />
      </Field>

      <Row>
        <Btn
          label="حفظ"
          onPress={() =>
            onSave({
              status,
              grade: needsGrade ? grade : undefined,
              note: note.trim() || undefined,
              hoursOverride: Number(hours) === initial.hours ? undefined : Number(hours) || undefined,
            })
          }
        />
        <Btn
          label="تصفير المادة"
          variant="danger"
          onPress={() => onSave({ status: 'todo', grade: undefined, note: undefined, hoursOverride: undefined })}
        />
      </Row>
    </View>
  );
}

function TreeView({
  id,
  depth,
  byId,
  statusOf,
  failedOf,
}: {
  id: string;
  depth: number;
  byId: Map<string, { id: string; name: string; prereqs: string[] }>;
  statusOf: (id: string) => CourseStatus;
  failedOf: (id: string) => boolean;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(depth < 1);
  const course = byId.get(id);
  if (!course) return null;
  const status = statusOf(id);
  const tone: Tone = failedOf(id) ? 'danger' : STATUS_TONE[status];
  const c = toneColors(theme, tone);

  return (
    <View style={{ marginInlineStart: depth * 10 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.two,
          paddingVertical: 5,
          paddingInlineStart: depth === 0 ? 0 : Spacing.three,
        }}>
        {depth > 0 ? <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: c.fg, borderRadius: 1 }} /> : null}
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.fg }} />
        <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: depth === 0 ? '700' : '500', flex: 1 }}>
          {course.name}
        </Text>
        <Text style={{ color: c.fg, fontSize: 11.5, fontWeight: '800' }}>{STATUS_LABELS[status]}</Text>
      </View>
      {course.prereqs.length > 0 ? (
        expanded ? (
          <View>
            {course.prereqs.map((p) => (
              <TreeView key={p} id={p} depth={depth + 1} byId={byId} statusOf={statusOf} failedOf={failedOf} />
            ))}
          </View>
        ) : (
          <Text onPress={() => setExpanded(true)} style={{ color: theme.primary, fontSize: 12, marginInlineStart: 18 }}>
            + عرض {course.prereqs.length} متطلب
          </Text>
        )
      ) : null}
    </View>
  );
}
