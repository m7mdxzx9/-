import React, { useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Spacing, type ThemeColor, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { boundsOf } from '@/lib/geo';
import type { TrackPoint } from '@/lib/types';

export function toneColors(theme: typeof Colors.light, tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'success':
      return { bg: theme.successSoft, fg: theme.success };
    case 'warn':
      return { bg: theme.warnSoft, fg: theme.warn };
    case 'danger':
      return { bg: theme.dangerSoft, fg: theme.danger };
    case 'info':
      return { bg: theme.infoSoft, fg: theme.info };
    default:
      return { bg: theme.backgroundSelected, fg: theme.textSecondary };
  }
}

export function Screen({
  children,
  scrollable = true,
  footer,
}: {
  children: ReactNode;
  scrollable?: boolean;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const body = scrollable ? (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.content}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.fill, styles.content, { padding: Spacing.four, gap: Spacing.four }]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.fill, { backgroundColor: theme.background }]}>
      {body}
      {footer ? <View style={{ backgroundColor: theme.background }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.one }}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text>
      ) : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {sub ? <Text style={[styles.sub, { color: theme.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style, tone, onPress }: ViewProps & { tone?: Tone; onPress?: () => void }) {
  const theme = useTheme();
  const toneBg = tone ? toneColors(theme, tone).bg : theme.card;
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: toneBg, borderColor: theme.border },
        onPress ? { opacity: 1 } : null,
        style,
      ]}>
      {children}
    </Wrapper>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: Tone }) {
  const theme = useTheme();
  const t = tone ? toneColors(theme, tone) : null;
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: t?.fg ?? theme.text }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.statSub, { color: theme.textSecondary }]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  tone = 'neutral',
  onPress,
  selected,
}: {
  label: string;
  tone?: Tone;
  onPress?: () => void;
  selected?: boolean;
}) {
  const theme = useTheme();
  const t = toneColors(theme, tone);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : t.bg,
          borderColor: selected ? theme.primary : 'transparent',
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : t.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
  tone,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  disabled?: boolean;
  tone?: Tone;
  style?: ViewProps['style'];
}) {
  const theme = useTheme();
  const t = tone ? toneColors(theme, tone) : null;
  const bg =
    variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : t?.bg ?? theme.backgroundSelected;
  const fg = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : t?.fg ?? theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: theme.border,
        },
        style,
      ]}>
      <Text style={[styles.btnText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentedItem, active ? { backgroundColor: theme.primary } : null]}>
            <Text style={[styles.segmentedText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Bar({ value, max = 1, tone = 'info' }: { value: number; max?: number; tone?: Tone }) {
  const theme = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: toneColors(theme, tone).fg }]} />
    </View>
  );
}

export function Notice({ tone = 'neutral', title, detail }: { tone?: Tone; title: string; detail?: string }) {
  const theme = useTheme();
  const t = toneColors(theme, tone);
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.fg }]}>
      <Text style={[styles.noticeTitle, { color: t.fg }]}>{title}</Text>
      {detail ? (
        <Text style={[styles.noticeDetail, { color: theme.text }]}>{detail}</Text>
      ) : null}
    </View>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
      {hint ? (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Input({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }, style]}
      {...rest}
    />
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '700' }}>إغلاق</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four }}
            style={{ maxHeight: 560 }}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Row({ children, style, gap = Spacing.two }: ViewProps & { gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: 'wrap' }, style]}>{children}</View>;
}

/**
 * عارض المسار بدون أي اعتماد على بلاط خريطة أو إنترنت:
 * يرسم الخطوط فعلياً كمقاطع متصلة، فيشتغل داخل المعاينة وفي الجوال.
 */
export function MiniTrack({
  points,
  height = 220,
  color,
  showGrid = true,
}: {
  points: TrackPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const stroke = color ?? theme.map;

  const geometry = useMemo(() => {
    if (points.length < 2 || width <= 0) return null;
    const bounds = boundsOf(points);
    if (!bounds) return null;
    const pad = 14;
    const spanLat = Math.max(bounds.maxLat - bounds.minLat, 1e-5);
    const spanLng = Math.max(bounds.maxLng - bounds.minLng, 1e-5);
    const scale = Math.min((width - pad * 2) / spanLng, (height - pad * 2) / spanLat);
    const offsetX = (width - pad * 2 - spanLng * scale) / 2;
    const offsetY = (height - pad * 2 - spanLat * scale) / 2;
    const xy = points.map((p) => ({
      x: pad + offsetX + (p.lng - bounds.minLng) * scale,
      y: height - (pad + offsetY + (p.lat - bounds.minLat) * scale),
    }));
    const segments = [];
    for (let i = 1; i < xy.length; i += 1) {
      const a = xy[i - 1];
      const b = xy[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.5) continue;
      segments.push({
        key: i,
        left: a.x + dx / 2 - len / 2,
        top: a.y + dy / 2 - 1.5,
        len,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      });
    }
    return { xy, segments, start: xy[0], end: xy[xy.length - 1] };
  }, [points, width, height]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { height, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {showGrid
        ? [0.25, 0.5, 0.75].map((f) => (
            <View key={`v${f}`} style={[styles.gridLine, { left: `${f * 100}%`, backgroundColor: theme.border }]} />
          ))
        : null}
      {showGrid
        ? [0.25, 0.5, 0.75].map((f) => (
            <View key={`h${f}`} style={[styles.gridLineH, { top: `${f * 100}%`, backgroundColor: theme.border }]} />
          ))
        : null}
      {geometry ? (
        <>
          {geometry.segments.map((s) => (
            <View
              key={s.key}
              style={{
                position: 'absolute',
                left: s.left,
                top: s.top,
                width: s.len,
                height: 3,
                borderRadius: 3,
                backgroundColor: stroke,
                transform: [{ rotate: `${s.angle}deg` }],
              }}
            />
          ))}
          {geometry.xy.map((p, i) =>
            i % 6 === 0 ? (
              <View key={`d${i}`} style={[styles.dot, { left: p.x - 2.5, top: p.y - 2.5, backgroundColor: stroke }]} />
            ) : null,
          )}
          <View style={[styles.marker, { left: geometry.start.x - 6, top: geometry.start.y - 6, backgroundColor: theme.success }]} />
          <View style={[styles.marker, { left: geometry.end.x - 6, top: geometry.end.y - 6, backgroundColor: theme.danger }]} />
        </>
      ) : (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            {points.length < 2 ? 'ابدأ التسجيل أو أضف مساراً لعرض الخطوط هنا' : 'جارٍ الرسم…'}
          </Text>
        </View>
      )}
    </View>
  );
}

export function useColors() {
  const theme = useTheme();
  return theme;
}

export const spacing = Spacing;
export const radius = Radius;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 30 },
  sub: { fontSize: 14, lineHeight: 21 },
  card: { padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.three },
  stat: { flex: 1, minWidth: 120, padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.one },
  statLabel: { fontSize: 11.5, fontWeight: '600' },
  statValue: { fontSize: 19, fontWeight: '800' },
  statSub: { fontSize: 11.5 },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: 1 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  btn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 14.5, fontWeight: '800' },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: Radius.md, borderWidth: 1, gap: 4 },
  segmentedItem: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.sm, alignItems: 'center' },
  segmentedText: { fontSize: 12.5, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.pill },
  notice: { padding: Spacing.three, borderRadius: Radius.md, borderLeftWidth: 4, gap: Spacing.one },
  noticeTitle: { fontSize: 14, fontWeight: '800' },
  noticeDetail: { fontSize: 13, lineHeight: 20 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 14.5,
    minHeight: 44,
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(4,12,20,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '88%' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', flex: 1, marginEnd: Spacing.three },
  track: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  dot: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
  marker: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
