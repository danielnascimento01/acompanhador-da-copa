import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useStore } from '../lib/store';
import {
  countScheduled,
  getPermissionGranted,
  requestPermission,
  rescheduleAll,
  sendTestNotification,
} from '../lib/notifications';
import { openKofi, openSuggestion } from '../lib/links';
import { billingAvailable, purchaseRemoveAds, restorePurchases } from '../lib/billing';
import { ADS_ENABLED } from '../lib/ads';
import { getCurrentIconKey } from '../lib/appIcon';
import { APP_ICONS, DEFAULT_ICON_KEY } from '../data/appIcons';
import { AppIconSheet } from './AppIconSheet';
import { colors, fonts, gradients, radius, spacing } from '../lib/theme';

const LEAD_OPTIONS = [5, 10, 15, 30, 60];

export function SettingsScreen() {
  const { settings, updateSettings, selected, matches } = useStore();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState<number>(0);
  const [iconOpen, setIconOpen] = useState(false);
  const [iconKey, setIconKey] = useState<string>(DEFAULT_ICON_KEY);

  useEffect(() => {
    setIconKey(getCurrentIconKey());
  }, [iconOpen]);

  const currentIcon = APP_ICONS.find((i) => i.key === iconKey) ?? APP_ICONS[0];

  const handleRemoveAds = async () => {
    if (!billingAvailable()) {
      Alert.alert('Indisponível na pré-visualização', 'A compra funciona no app instalado da loja.');
      return;
    }
    const ok = await purchaseRemoveAds();
    if (!ok) Alert.alert('Não foi possível abrir a compra', 'Tente novamente em instantes.');
    // Sucesso: o listener concede e liga a flag (os anúncios somem sozinhos).
  };

  const handleRestore = async () => {
    if (!billingAvailable()) {
      Alert.alert('Indisponível na pré-visualização', 'A restauração funciona no app instalado da loja.');
      return;
    }
    const owns = await restorePurchases();
    if (owns) {
      updateSettings({ adsRemoved: true });
      Alert.alert('Pronto!', 'Sua compra foi restaurada — anúncios removidos.');
    } else {
      Alert.alert('Nenhuma compra encontrada', 'Não achamos uma compra de "Remover anúncios" nesta conta.');
    }
  };

  const refresh = async () => {
    setGranted(await getPermissionGranted());
    setScheduled(await countScheduled());
  };

  useEffect(() => {
    refresh();
  }, [settings, selected]);

  const handleEnable = async () => {
    const ok = await requestPermission();
    setGranted(ok);
    if (ok) {
      await rescheduleAll(matches, [...selected], settings);
      await refresh();
    }
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(12) }}
    >
      <Text style={styles.title}>Avisos</Text>

      {/* Permissão */}
      {granted ? (
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.permCard}>
          <Text style={styles.permTitle}>✅ Notificações ativas</Text>
          <Text style={styles.permTextLight}>
            {scheduled} {scheduled === 1 ? 'aviso agendado' : 'avisos agendados'} para as suas seleções.
          </Text>
          <Pressable
            style={styles.ghostBtn}
            onPress={sendTestNotification}
            accessibilityRole="button"
            accessibilityLabel="Enviar uma notificação de teste"
          >
            <Text style={styles.ghostBtnText}>Enviar um teste</Text>
          </Pressable>
        </LinearGradient>
      ) : (
        <View style={[styles.card, styles.cardWarn]}>
          <Text style={styles.cardTitle}>🔔 Ative as notificações</Text>
          <Text style={styles.cardText}>Precisamos da sua permissão para te avisar dos jogos.</Text>
          <Pressable style={styles.cta} onPress={handleEnable} accessibilityRole="button" accessibilityLabel="Ativar notificações">
            <Text style={styles.ctaText}>ATIVAR NOTIFICAÇÕES</Text>
          </Pressable>
        </View>
      )}

      {/* Resumo diário */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>📅 Resumo do dia</Text>
            <Text style={styles.cardText}>Pela manhã, os jogos das suas seleções naquele dia.</Text>
          </View>
          <Switch
            value={settings.dailyDigest}
            onValueChange={(v) => updateSettings({ dailyDigest: v })}
            trackColor={{ true: colors.accentDeep, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
        {settings.dailyDigest && (
          <View style={styles.stepperRow}>
            <Text style={styles.cardText}>Horário do resumo</Text>
            <Stepper
              label={`${String(settings.dailyDigestHour).padStart(2, '0')}:00`}
              onMinus={() => updateSettings({ dailyDigestHour: (settings.dailyDigestHour + 23) % 24 })}
              onPlus={() => updateSettings({ dailyDigestHour: (settings.dailyDigestHour + 1) % 24 })}
            />
          </View>
        )}
      </View>

      {/* Jogo começando */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>⏰ Jogo começando</Text>
            <Text style={styles.cardText}>Um lembrete antes de cada jogo das suas seleções.</Text>
          </View>
          <Switch
            value={settings.matchStart}
            onValueChange={(v) => updateSettings({ matchStart: v })}
            trackColor={{ true: colors.accentDeep, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
        {settings.matchStart && (
          <View style={styles.chipsRow}>
            {LEAD_OPTIONS.map((min) => {
              const active = settings.matchStartLeadMinutes === min;
              return (
                <Pressable
                  key={min}
                  onPress={() => updateSettings({ matchStartLeadMinutes: min })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Avisar ${min} minutos antes`}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{min} min</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Text style={styles.note}>
        Os avisos são agendados direto no seu aparelho e funcionam mesmo sem internet.
      </Text>

      {/* Ícone do app */}
      <Pressable
        style={[styles.card, styles.iconCard]}
        onPress={() => setIconOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Trocar o ícone do app. Atual: ${currentIcon.label}`}
      >
        <Image source={currentIcon.thumb} style={styles.iconPreview} />
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>🎨 Ícone do app</Text>
          <Text style={styles.cardText}>Personalize como o app aparece na tela inicial.</Text>
        </View>
        <Text style={styles.iconChevron}>›</Text>
      </Pressable>

      {/* Remover anúncios (IAP) — só aparece quando os ads estão ligados;
          no lançamento (ADS_ENABLED=false) não há o que remover, então fica oculto. */}
      {ADS_ENABLED &&
        (settings.adsRemoved ? (
        <View style={[styles.card, styles.adsDoneCard]}>
          <Text style={styles.cardTitle}>✅ Anúncios removidos</Text>
          <Text style={styles.cardText}>Obrigado por apoiar o app! Você não verá mais anúncios.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚫 Remover anúncios</Text>
          <Text style={styles.cardText}>
            Tire os anúncios para sempre com uma compra única. Sem assinatura.
          </Text>
          <Pressable style={styles.cta} onPress={handleRemoveAds} accessibilityRole="button" accessibilityLabel="Remover anúncios para sempre">
            <Text style={styles.ctaText}>REMOVER ANÚNCIOS</Text>
          </Pressable>
          <Pressable onPress={handleRestore} accessibilityRole="button" accessibilityLabel="Restaurar compra" hitSlop={8}>
            <Text style={styles.restoreLink}>Restaurar compra</Text>
          </Pressable>
        </View>
        ))}

      {/* Apoio / sugestões */}
      <View style={[styles.card, styles.supportCard]}>
        <Text style={styles.cardTitle}>☕ Apoie o app</Text>
        <Text style={styles.cardText}>
          Projeto independente. Se ele te ajuda, apoie ou mande uma ideia pra melhorar.
        </Text>
        <View style={styles.supportRow}>
          <Pressable style={styles.supportPrimary} onPress={openKofi} accessibilityRole="button" accessibilityLabel="Apoiar nosso app">
            <Text style={styles.supportPrimaryText}>Apoiar nosso app</Text>
          </Pressable>
          <Pressable style={styles.supportGhost} onPress={openSuggestion} accessibilityRole="button" accessibilityLabel="Enviar sugestão">
            <Text style={styles.supportGhostText}>Sugestão</Text>
          </Pressable>
        </View>
      </View>
      </ScrollView>

      <AppIconSheet visible={iconOpen} onClose={() => setIconOpen(false)} />
    </>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={onMinus} accessibilityRole="button" accessibilityLabel="Uma hora antes">
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable style={styles.stepBtn} onPress={onPlus} accessibilityRole="button" accessibilityLabel="Uma hora depois">
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 34, marginBottom: spacing(3) },
  permCard: { borderRadius: radius.lg, padding: spacing(5), marginBottom: spacing(3) },
  permTitle: { color: colors.white, fontFamily: fonts.bold, fontSize: 18 },
  permTextLight: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.regular, fontSize: 14, marginTop: 4 },
  ghostBtn: {
    marginTop: spacing(4),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    alignItems: 'center',
  },
  ghostBtnText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  cardWarn: { borderColor: colors.accent },
  cardTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  cardText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 4, lineHeight: 20 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing(4),
    alignItems: 'center',
    marginTop: spacing(4),
  },
  ctaText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  flex1: { flex: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing(4) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.text, fontFamily: fonts.bold, fontSize: 24 },
  stepLabel: { color: colors.text, fontFamily: fonts.display, fontSize: 22, minWidth: 64, textAlign: 'center' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(4) },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 14 },
  chipTextActive: { color: colors.ink, fontFamily: fonts.bold },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing(2) },
  iconCard: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginTop: spacing(4) },
  iconPreview: { width: 52, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  iconChevron: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 28, marginTop: -4 },
  adsDoneCard: { borderColor: colors.accentDeep },
  restoreLink: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13, textAlign: 'center', marginTop: spacing(3), textDecorationLine: 'underline' },
  supportCard: { marginTop: spacing(4) },
  supportRow: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(4) },
  supportPrimary: {
    flex: 1,
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    alignItems: 'center',
  },
  supportPrimaryText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 15 },
  supportGhost: {
    paddingHorizontal: spacing(5),
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supportGhostText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
});

