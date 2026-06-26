import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FadeInUp } from '../components/Motion';
import { requestPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { fonts, radius, spacing, elevation } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';

const FEATURES = [
  { icon: '🔔', title: 'Avisos das suas seleções', text: 'Marque os times pra ser avisado dos jogos deles.' },
  { icon: '📅', title: 'Resumo do dia', text: 'De manhã, os jogos das suas seleções naquele dia.' },
  { icon: '⏰', title: 'Jogo começando', text: 'Um lembrete pouco antes de cada partida.' },
];

export function OnboardingScreen({ onStart }: { onStart: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { g } = useTheme();
  const [busy, setBusy] = useState(false);
  const { registerForGoalPush } = useStore();

  const handleStart = async () => {
    setBusy(true);
    try {
      const ok = await requestPermission();
      if (ok) registerForGoalPush(); // registra o push de gol já na concessão
    } catch {
      // Sem permissão agora — pode ativar depois em Avisos.
    } finally {
      onStart();
    }
  };

  return (
    <View style={styles.container}>
      <FadeInUp offset={20}>
        <View style={styles.hero}>
          <LinearGradient
            colors={g.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.badge, elevation(2)]}
          >
            <Text style={styles.badgeEmoji}>⚽</Text>
          </LinearGradient>
          <Text style={styles.kicker}>EDIÇÃO 2026</Text>
          <Text style={styles.title}>ACOMPANHADOR{'\n'}DA COPA</Text>
          <Text style={styles.subtitle}>Não perca nenhum jogo das suas seleções.</Text>
        </View>
      </FadeInUp>

      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <FadeInUp key={f.title} delay={120 + i * 90}>
            <View style={styles.feature}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            </View>
          </FadeInUp>
        ))}
      </View>

      <FadeInUp delay={420}>
        <Pressable
          onPress={handleStart}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Começar e escolher suas seleções"
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <LinearGradient
            colors={g.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, elevation(2)]}
          >
            <Text style={styles.buttonText}>{busy ? 'UM SEGUNDO…' : 'COMEÇAR'}</Text>
          </LinearGradient>
        </Pressable>
        <Text style={styles.disclaimer}>
          App não oficial · sem vínculo com entidades ou competições oficiais. Dados de terceiros, sujeitos a alteração.
        </Text>
      </FadeInUp>
    </View>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, padding: spacing(6), justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing(9) },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(4),
  },
  badgeEmoji: { fontSize: 46 },
  kicker: { color: c.accent, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 3 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 50, textAlign: 'center', marginTop: spacing(2), paddingTop: spacing(1) },
  subtitle: { color: c.textDim, fontFamily: fonts.medium, fontSize: 16, marginTop: spacing(3), textAlign: 'center' },
  features: { gap: spacing(3), marginBottom: spacing(8) },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(4),
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: c.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: { fontSize: 26 },
  flex1: { flex: 1 },
  featureTitle: { color: c.text, fontFamily: fonts.bold, fontSize: 16 },
  featureText: { color: c.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 2 },
  button: { borderRadius: radius.lg, paddingVertical: spacing(4), alignItems: 'center' },
  buttonText: { color: c.ink, fontFamily: fonts.display, fontSize: 20, letterSpacing: 1 },
  pressed: { opacity: 0.85 },
  disclaimer: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', marginTop: spacing(4), lineHeight: 16 },
});
