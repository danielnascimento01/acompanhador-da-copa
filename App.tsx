import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';

import { StoreProvider, useStore } from './src/lib/store';
import { configureNotificationHandler, ensureAndroidChannel } from './src/lib/notifications';
import { Backdrop } from './src/components/Backdrop';
import { TeamsScreen } from './src/screens/TeamsScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SupportSheet } from './src/screens/SupportScreen';
import { colors, fonts, gradients, spacing } from './src/lib/theme';

type TabKey = 'schedule' | 'standings' | 'teams' | 'album' | 'settings';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'schedule', label: 'Jogos', icon: '⚽' },
  { key: 'standings', label: 'Grupos', icon: '📊' },
  { key: 'teams', label: 'Seleções', icon: '🌎' },
  { key: 'album', label: 'Álbum', icon: '🃏' },
  { key: 'settings', label: 'Avisos', icon: '🔔' },
];

function Shell() {
  const { ready, onboarded, completeOnboarding } = useStore();
  const [tab, setTab] = useState<TabKey>('schedule');

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => setTab('schedule'));
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>🏆</Text>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        onStart={() => {
          completeOnboarding();
          setTab('teams');
        }}
      />
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        {tab === 'schedule' && <ScheduleScreen />}
        {tab === 'standings' && <StandingsScreen />}
        {tab === 'teams' && <TeamsScreen />}
        {tab === 'album' && <AlbumScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={styles.tab}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.label}
            >
              {active && (
                <LinearGradient
                  colors={gradients.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabIndicator}
                />
              )}
              <Text style={[styles.tabIcon, !active && styles.tabInactive]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabInactive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [supportOpen, setSupportOpen] = useState(false);
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  useEffect(() => {
    configureNotificationHandler();
    ensureAndroidChannel();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.bootRoot}>
        <Text style={styles.bootLogo}>🏆</Text>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <Backdrop>
        <View style={styles.brandBar}>
          <Text style={styles.brandMark}>🏆</Text>
          <Text style={styles.brand}>ACOMPANHADOR DA COPA</Text>
          <View style={styles.brandYearWrap}>
            <Text style={styles.brandYear}>26</Text>
          </View>
          <View style={styles.brandSpacer} />
          <Pressable
            style={styles.supportBtn}
            onPress={() => setSupportOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Apoiar o app e enviar sugestões"
            hitSlop={8}
          >
            <Text style={styles.supportBtnText}>☕</Text>
          </Pressable>
        </View>
        <StoreProvider>
          <Shell />
        </StoreProvider>
        <SupportSheet visible={supportOpen} onClose={() => setSupportOpen(false)} />
      </Backdrop>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bootRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: spacing(4) },
  bootLogo: { fontSize: 60 },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
  },
  brandMark: { fontSize: 18 },
  brand: { color: colors.text, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },
  brandYearWrap: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  brandYear: { color: colors.ink, fontFamily: fonts.display, fontSize: 13 },
  brandSpacer: { flex: 1 },
  supportBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportBtnText: { fontSize: 18 },
  shell: { flex: 1 },
  content: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(4) },
  loadingLogo: { fontSize: 56 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgElev,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing(2),
    paddingTop: spacing(1),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, gap: 3, paddingTop: spacing(2) },
  tabIndicator: { position: 'absolute', top: 0, width: 36, height: 3, borderRadius: 2 },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontFamily: fonts.bold, fontSize: 11 },
  tabLabelActive: { color: colors.accent },
  tabInactive: { opacity: 0.45, color: colors.textDim },
});
