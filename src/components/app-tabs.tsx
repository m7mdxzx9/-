import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TABS = [
  { name: 'الرئيسية', href: '/', icon: '◎' },
  { name: 'الخطة', href: '/plan', icon: '☰' },
  { name: 'الخريطة', href: '/map', icon: '◈' },
  { name: 'استكشاف', href: '/explore', icon: '✦' },
  { name: 'الإعدادات', href: '/settings', icon: '⚙' },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <Bar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.href} name={tab.name} href={tab.href as never} asChild>
              <TabButton icon={tab.icon} />
            </TabTrigger>
          ))}
        </Bar>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  icon,
  children,
  isFocused,
  ...rest
}: TabTriggerSlotProps & { icon: string }) {
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable {...rest} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <View
        style={[
          styles.inner,
          { backgroundColor: isFocused ? theme.primary : 'transparent', borderColor: isFocused ? theme.primary : theme.border },
        ]}>
        <Text style={[styles.icon, { color: isFocused ? '#FFFFFF' : theme.textSecondary }]}>{icon}</Text>
        <Text style={[styles.label, { color: isFocused ? '#FFFFFF' : theme.textSecondary }]} numberOfLines={1}>
          {typeof children === 'string' ? children : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function Bar(props: TabListProps) {
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View
      {...props}
      style={[
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}>
      <View style={styles.barInner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  bar: { borderTopWidth: StyleSheet.hairlineWidth, width: '100%', alignItems: 'center' },
  barInner: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  item: { flex: 1, minWidth: 60 },
  pressed: { opacity: 0.7 },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  icon: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '700' },
});
