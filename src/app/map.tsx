import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { MapSurface } from '@/components/map/MapSurface';
import type { MapEvent, MapLine, MapSurfaceHandle } from '@/components/map/shared';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-state';
import { demoRoute, formatDistance, formatDuration, pathLengthM, speedMs } from '@/lib/geo';
import { startGpsWatch, type WatchHandle } from '@/lib/watch';
import type { TrackPoint } from '@/lib/types';
import { Bar, Btn, Card, Chip, Field, Input, MiniTrack, Notice, Row, Screen, SectionTitle, Segmented, Stat } from '@/ui/kit';

type Kind = 'idle' | 'gps' | 'demo';

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MapScreen() {
  const { routes, saveRoute, deleteRoute, addDemoRoute } = useApp();
  const theme = useTheme();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const mapRef = useRef<MapSurfaceHandle | null>(null);

  const [kind, setKind] = useState<Kind>('idle');
  const [live, setLive] = useState<TrackPoint[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'simple'>('map');
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const watchRef = useRef<WatchHandle | null>(null);
  const demoIndexRef = useRef(0);
  const demoPointsRef = useRef<TrackPoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recording = kind !== 'idle';

  const append = useCallback((p: TrackPoint) => {
    setLive((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.lat - p.lat) < 1e-7 && Math.abs(last.lng - p.lng) < 1e-7) return prev;
      const next = [...prev, p];
      mapRef.current?.send({ type: 'append', id: 'live', lat: p.lat, lng: p.lng, color: '#0f766e' });
      return next;
    });
  }, []);

  const stopWatch = useCallback(() => {
    watchRef.current?.stop();
    watchRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const begin = useCallback(
    async (next: Kind) => {
      setMessage(null);
      if (next === 'idle') {
        stopWatch();
        setKind('idle');
        return;
      }
      if (next === 'gps') {
        const handle = await startGpsWatch(
          (p) => append(p),
          (msg) => setMessage(msg),
        );
        watchRef.current = handle;
        setKind('gps');
        if (startedAt == null) setStartedAt(Date.now());
        if (!name) setName(`مسار ${stamp()}`);
        return;
      }
      // وضع المحاكاة: يفيد حين يكون GPS محجوباً (متصفح، محاكي، أو بدون إذن)
      demoPointsRef.current = demoRoute(Math.floor(Math.random() * 900));
      demoIndexRef.current = 0;
      setKind('demo');
      if (startedAt == null) setStartedAt(Date.now());
      if (!name) setName(`مسار محاكى ${stamp()}`);
      timerRef.current = setInterval(() => {
        const pts = demoPointsRef.current;
        const i = demoIndexRef.current;
        if (i < pts.length) {
          append({ ...pts[i], at: Date.now() });
          demoIndexRef.current = i + 1;
        } else {
          stopWatch();
          setKind('idle');
          setMessage('انتهت المحاكاة — احفظ المسار أو أعد التشغيل.');
        }
      }, 700);
    },
    [append, name, startedAt, stopWatch],
  );

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => () => stopWatch(), [stopWatch]);

  const discard = useCallback(() => {
    stopWatch();
    setKind('idle');
    setLive([]);
    setStartedAt(null);
    setName('');
    setNote('');
  }, [stopWatch]);

  const save = useCallback(async () => {
    if (live.length < 2) {
      setMessage('تحتاج نقطتين على الأقل لحفظ المسار.');
      return;
    }
    stopWatch();
    const run = await saveRoute({
      name: name.trim() || `مسار ${stamp()}`,
      startedAt: startedAt ?? live[0].at,
      endedAt: live[live.length - 1].at,
      points: live,
      source: kind === 'demo' ? 'demo' : 'gps',
      note: note.trim() || undefined,
    });
    setKind('idle');
    setLive([]);
    setStartedAt(null);
    setName('');
    setNote('');
    setShown((prev) => ({ ...prev, [run.id]: true }));
    setMessage(`تمّ حفظ ${run.points.length} نقطة بمسافة ${formatDistance(run.distanceM)}.`);
  }, [kind, live, name, note, saveRoute, startedAt, stopWatch]);

  const shownIds = useMemo(() => {
    const keys = Object.keys(shown).filter((k) => shown[k]);
    return keys;
  }, [shown]);

  const lines = useMemo(() => {
    const list: MapLine[] = routes
      .filter((r) => shownIds.includes(r.id))
      .map((r, i) => ({
        id: r.id,
        color: ['#1D4ED8', '#B45309', '#15803D', '#7C3AED', '#0EA5E9'][i % 5],
        points: r.points.map((p) => [p.lat, p.lng] as [number, number]),
      }));
    if (live.length > 0) {
      list.push({ id: 'live', color: '#0f766e', points: live.map((p) => [p.lat, p.lng] as [number, number]) });
    }
    return list;
  }, [live, routes, shownIds]);

  useEffect(() => {
    mapRef.current?.send({ type: 'render', lines, fit: true });
  }, [lines]);

  const stats = useMemo(() => {
    const distance = pathLengthM(live);
    const duration = startedAt ? now - startedAt : 0;
    const lastTwo = live.length >= 2 ? speedMs(live[live.length - 2], live[live.length - 1]) : null;
    const avgSpeed = duration > 0 ? distance / (duration / 1000) : null;
    return { distance, duration, lastTwo, avgSpeed };
  }, [live, now, startedAt]);

  const onMapEvent = useCallback((event: MapEvent) => {
    if (event.type === 'click') {
      // نقرة على الخريطة = نقطة يدوية (تنفع للمحاكاة أو لتصحيح المسار)
      append({ lat: event.lat, lng: event.lng, at: Date.now(), sim: true });
    }
  }, [append]);

  const totalRecordedPoints = routes.reduce((s, r) => s + r.points.length, 0);
  const totalDistance = routes.reduce((s, r) => s + r.distanceM, 0);

  return (
    <Screen>
      <SectionTitle
        eyebrow="خريطة المسار"
        title="سجّل كل الخطوط التي مررت بها"
        sub="كل نقطة موقع تُحفظ في مسار، وتُرسم كخط متصل. الخريطة من OpenStreetMap بدون مفتاح، وتحتاج إنترنت لعرض البلاط فقط."
      />
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'map', label: 'الخريطة' },
          { value: 'simple', label: 'عرض مبسّط (بدون إنترنت)' },
        ]}
      />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>
            {kind === 'idle' ? 'غير مسجَّل' : kind === 'gps' ? 'تسجيل GPS مباشر' : 'وضع المحاكاة'}
          </Text>
          <Chip label={`${live.length} نقطة`} tone={live.length > 0 ? 'info' : 'neutral'} />
        </Row>
        <View style={styles.grid}>
          <Stat label="المسافة" value={formatDistance(stats.distance)} />
          <Stat label="المدة" value={formatDuration(stats.duration)} />
          <Stat label="متوسط السرعة" value={stats.avgSpeed ? `${(stats.avgSpeed * 3.6).toFixed(1)} كم/س` : '—'} />
        </View>
        <Bar value={Math.min(live.length, 400)} max={400} tone="info" />
        <Text style={{ color: theme.textSecondary, fontSize: 11.5 }}>
          يُخزَّن المسار مبسَّطاً حتى 400 نقطة (خوارزمية Douglas–Peucker) لتقليل الحجم.
        </Text>
        {message ? <Notice tone="warn" title={message} /> : null}

        <Row gap={Spacing.two}>
          {kind === 'idle' ? (
            <>
              <Btn label="ابدأ تسجيل GPS" onPress={() => void begin('gps')} />
              <Btn label="وضع المحاكاة" variant="soft" onPress={() => void begin('demo')} />
            </>
          ) : (
            <>
              <Btn label="إيقاف وحفظ" onPress={() => void save()} />
              <Btn label="إيقاف مؤقت" variant="soft" onPress={() => void begin('idle')} />
              <Btn label="تجاهل" variant="danger" onPress={discard} />
            </>
          )}
        </Row>

        {recording ? (
          <View style={{ gap: Spacing.two }}>
            <Field label="اسم المسار">
              <Input value={name} onChangeText={setName} placeholder="مثال: مشي الحرم ← مكتبة الملك عبدالله" />
            </Field>
            <Field label="ملاحظة">
              <Input value={note} onChangeText={setNote} placeholder="ماذا تعلّمت في هذا الطريق؟" />
            </Field>
          </View>
        ) : null}
      </Card>

      {view === 'map' ? (
        <Card style={{ padding: Spacing.two }}>
          <MapSurface ref={mapRef} dark={dark} height={340} onEvent={onMapEvent} />
          <Text style={{ color: theme.textSecondary, fontSize: 11.5, paddingHorizontal: Spacing.two }}>
            انقر على الخريطة لإضافة نقطة يدوية. نقاط المسار الحيّ تظهر فوراً باللون الفيروزي.
          </Text>
        </Card>
      ) : (
        <Card>
          <SectionTitle eyebrow="عرض مبسّط" title="الخطوط بدون بلاط خريطة" />
          <MiniTrack points={live.length > 1 ? live : routes[0]?.points ?? []} height={240} />
        </Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <SectionTitle eyebrow="مساراتي" title={`${routes.length} مسار (${totalRecordedPoints} نقطة)`} />
          <Chip label={`إجمالي ${formatDistance(totalDistance)}`} tone="neutral" />
        </Row>

        {routes.length === 0 ? (
          <>
            <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
              لا شيء بعد. جرّب زر «مسار تجريبي» لتوليد خطوط حقيقية تُرسم على الخريطة، أو ابدأ GPS.
            </Text>
            <Row>
              <Btn label="أضف مساراً تجريبياً" variant="soft" onPress={() => void addDemoRoute()} />
            </Row>
          </>
        ) : (
          routes.map((r) => {
            const isShown = !!shown[r.id];
            return (
              <View key={r.id} style={[styles.routeRow, { borderColor: theme.border }]}>
                <Row gap={Spacing.two}>
                  <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '700', flex: 1 }} numberOfLines={2}>
                    {r.name}
                  </Text>
                  <Chip label={r.source === 'demo' ? 'محاكاة' : 'GPS'} tone={r.source === 'demo' ? 'warn' : 'success'} />
                </Row>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {new Date(r.startedAt).toLocaleString('ar-SA')} • {formatDistance(r.distanceM)} •{' '}
                  {formatDuration(r.endedAt - r.startedAt)} • {r.points.length} نقطة
                </Text>
                {r.note ? (
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontStyle: 'italic' }}>“{r.note}”</Text>
                ) : null}
                <Row gap={Spacing.two}>
                  <Chip
                    label={isShown ? 'مُظهَر على الخريطة' : 'أظهره'}
                    selected={isShown}
                    onPress={() => setShown((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  />
                  <Btn label="حذف" variant="ghost" onPress={() => deleteRoute(r.id)} />
                </Row>
                <MiniTrack
                  points={r.points}
                  height={150}
                  color={isShown ? '#0f766e' : undefined}
                  showGrid={false}
                />
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

const styles = {
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: Spacing.two },
  routeRow: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
};
