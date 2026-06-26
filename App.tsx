import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SairaCondensed_800ExtraBold } from '@expo-google-fonts/saira-condensed';
import {
  SairaSemiCondensed_400Regular,
  SairaSemiCondensed_500Medium,
  SairaSemiCondensed_600SemiBold,
  SairaSemiCondensed_700Bold,
  SairaSemiCondensed_800ExtraBold,
} from '@expo-google-fonts/saira-semi-condensed';

import { StoreProvider, useStore } from './src/lib/store';
import { configureNotificationHandler, ensureAndroidChannel } from './src/lib/notifications';
import { initAds } from './src/lib/ads';
import { Backdrop } from './src/components/Backdrop';
import { TeamsScreen } from './src/screens/TeamsScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { FunScreen } from './src/screens/FunScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SupportSheet } from './src/screens/SupportScreen';
import { AnnouncementSheet } from './src/screens/AnnouncementSheet';
import { RatePrompt } from './src/screens/RatePrompt';
import { fonts, spacing } from './src/lib/theme';
import { ThemeProvider, useTheme, useThemedStyles, type ThemeTokens } from './src/lib/theme-context';

type TabKey = 'schedule' | 'standings' | 'teams' | 'fun' | 'settings';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'schedule', label: 'Jogos', icon: 'football-outline' },
  { key: 'standings', label: 'Grupos', icon: 'stats-chart-outline' },
  { key: 'teams', label: 'Seleções', icon: 'globe-outline' },
  { key: 'fun', label: 'Diversão', icon: 'game-controller-outline' },
  { key: 'settings', label: 'Avisos', icon: 'notifications-outline' },
];

function Shell() {
  const { ready, onboarded, completeOnboarding } = useStore();
  const [tab, setTab] = useState<TabKey>('schedule');
  const styles = useThemedStyles(makeStyles);
  const { c, g } = useTheme();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => setTab('schedule'));
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>⚽</Text>
        <ActivityIndicator color={c.accent} />
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
        {tab === 'fun' && <FunScreen />}
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
                  colors={g.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabIndicator}
                />
              )}
              <Ionicons
                name={t.icon}
                size={23}
                color={active ? c.accent : c.textDim}
                style={!active && styles.tabInactive}
              />
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabInactive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AnnouncementSheet />
      <RatePrompt />
    </View>
  );
}

function Root() {
  const [supportOpen, setSupportOpen] = useState(false);
  const styles = useThemedStyles(makeStyles);
  const { c, scheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    SairaCondensed_800ExtraBold,
    SairaSemiCondensed_400Regular,
    SairaSemiCondensed_500Medium,
    SairaSemiCondensed_600SemiBold,
    SairaSemiCondensed_700Bold,
    SairaSemiCondensed_800ExtraBold,
    // Fonte dos ícones de linha — carregada no boot para nunca renderizar vazio
    // (importante porque pode chegar via OTA num binário que ainda não a tinha).
    ...Ionicons.font,
  });

  useEffect(() => {
    configureNotificationHandler();
    ensureAndroidChannel();
    initAds();
  }, []);

  // Não trava o app se a fonte falhar (ex.: ícone não baixou via OTA): segue
  // sem ela (ícones podem ficar vazios, mas o app abre — labels continuam).
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.bootRoot}>
        <Text style={styles.bootLogo}>⚽</Text>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    // O gradiente (Backdrop) fica FULL-BLEED na raiz; o SafeAreaView vai DENTRO e
    // transparente, só recuando o conteúdo do notch/indicador. Assim a cor do app
    // chega às bordas (sem as "bandas" chapadas de c.bg no topo e na base).
    <View style={styles.root}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Backdrop>
        <SafeAreaView style={styles.safe}>
          <View style={styles.brandBar}>
            <Text style={styles.brandMark}>⚽</Text>
            <Text style={styles.brand}>ACOMPANHADOR DA COPA</Text>
            <View style={styles.brandYearWrap}>
              <Text style={styles.brandYear}>26</Text>
            </View>
            <View style={styles.brandSpacer} />
            <Pressable
              style={styles.supportBtn}
              onPress={() => setSupportOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Ajuda e sugestões"
              hitSlop={8}
            >
              <Text style={styles.supportBtnText}>💬</Text>
            </Pressable>
          </View>
          <StoreProvider>
            <Shell />
          </StoreProvider>
        </SafeAreaView>
        <SupportSheet visible={supportOpen} onClose={() => setSupportOpen(false)} />
      </Backdrop>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  safe: { flex: 1, backgroundColor: 'transparent' },
  bootRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, gap: spacing(4) },
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
  brand: { color: c.text, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },
  brandYearWrap: { backgroundColor: c.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  brandYear: { color: c.ink, fontFamily: fonts.display, fontSize: 13 },
  brandSpacer: { flex: 1 },
  supportBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
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
    backgroundColor: c.bgElev,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingBottom: spacing(2),
    paddingTop: spacing(1),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, gap: 3, paddingTop: spacing(2) },
  tabIndicator: { position: 'absolute', top: 0, width: 36, height: 3, borderRadius: 2 },
  tabLabel: { fontFamily: fonts.bold, fontSize: 11 },
  tabLabelActive: { color: c.accent },
  tabInactive: { opacity: 0.45, color: c.textDim },
});
