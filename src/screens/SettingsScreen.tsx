import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useStore } from '../lib/store';
import {
  countScheduled,
  getPermissionGranted,
  requestPermission,
  rescheduleAll,
  sendTestNotification,
} from '../lib/notifications';
import { openSuggestion, openSupport } from '../lib/links';
import { appVersion, otaStatus } from '../lib/appInfo';
import { getCurrentIconKey } from '../lib/appIcon';
import { APP_ICONS, DEFAULT_ICON_KEY } from '../data/appIcons';
import { AppIconSheet } from './AppIconSheet';
import { ApoioCard } from '../components/ApoioCard';
import { colors, fonts, gradients, radius, spacing } from '../lib/theme';

const LEAD_OPTIONS = [5, 10, 15, 30, 60];

const GOAL_PUSH_OPTIONS: { key: 'mine' | 'all' | 'off'; label: string }[] = [
  { key: 'mine', label: 'Minhas seleções' },
  { key: 'all', label: 'Todos os jogos' },
  { key: 'off', label: 'Desligado' },
];

export function SettingsScreen() {
  const { settings, updateSettings, selected, matches, registerForGoalPush } = useStore();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState<number>(0);
  const [iconOpen, setIconOpen] = useState(false);
  const [iconKey, setIconKey] = useState<string>(DEFAULT_ICON_KEY);

  useEffect(() => {
    setIconKey(getCurrentIconKey());
  }, [iconOpen]);

  const currentIcon = APP_ICONS.find((i) => i.key === iconKey) ?? APP_ICONS[0];

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
      registerForGoalPush(); // registra o push de gol JÁ (não só no próximo boot)
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

      {/* Push de gol (remoto, via servidor — funciona com o app fechado) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚽ Push de gol</Text>
        <Text style={styles.cardText}>
          Avisa na hora que sai gol, mesmo com o app fechado. Escolha de quais jogos quer receber.
        </Text>
        <View style={styles.chipsRow}>
          {GOAL_PUSH_OPTIONS.map((opt) => {
            const active = settings.goalPush === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => updateSettings({ goalPush: opt.key })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Push de gol: ${opt.label}`}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {settings.goalPush === 'mine' && selected.size === 0 && !settings.primaryTeam && (
          <Text style={styles.goalHint}>
            Você ainda não marcou seleções. Marque na aba Seleções para receber os gols delas — ou
            escolha “Todos os jogos”. Também dá para seguir um jogo específico tocando no 🔔 dentro do jogo.
          </Text>
        )}
        {settings.goalPush === 'mine' && (selected.size > 0 || settings.primaryTeam) && (
          <Text style={styles.goalHint}>
            Você recebe os gols das suas seleções e da sua favorita. Para um jogo fora da sua lista,
            toque no 🔔 dentro do jogo.
          </Text>
        )}
      </View>

      {/* Push de FIM DE JOGO (remoto, via servidor — independe do push de gol) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏁 Fim de jogo</Text>
        <Text style={styles.cardText}>
          Avisa o placar final assim que o jogo acaba — ex.: “Brasil 1 x 0 Escócia” — mesmo com o app fechado.
        </Text>
        <View style={styles.chipsRow}>
          {GOAL_PUSH_OPTIONS.map((opt) => {
            const active = settings.fullTimePush === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => updateSettings({ fullTimePush: opt.key })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Aviso de fim de jogo: ${opt.label}`}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {settings.fullTimePush === 'mine' && selected.size === 0 && !settings.primaryTeam && (
          <Text style={styles.goalHint}>
            Marque seleções na aba Seleções para receber o fim dos jogos delas — ou escolha “Todos os jogos”.
          </Text>
        )}
      </View>

      <Text style={styles.note}>
        Os avisos de jogo são agendados no seu aparelho e funcionam sem internet. O push de gol vem do
        nosso servidor — precisa de internet no momento do gol.
      </Text>

      <Text style={styles.title}>Dados</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>📶 Modo economia de dados</Text>
            <Text style={styles.cardText}>
              Desliga a atualização automática ao vivo. Você continua atualizando ao puxar a tela.
            </Text>
          </View>
          <Switch
            value={settings.dataSaver}
            onValueChange={(v) => updateSettings({ dataSaver: v })}
            trackColor={{ true: colors.accentDeep, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Ícone do app — troca de ícone só no iOS (a Apple permite ícones
          alternativos; no Android o recurso fica desativado por compliance
          da Play Store, então a opção nem aparece). */}
      {Platform.OS === 'ios' && (
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
      )}

      {/* Apoie o projeto (IAP opcional — some se indisponível ou já apoiou) */}
      <ApoioCard />

      {/* Ajuda / sugestões */}
      <View style={[styles.card, styles.supportCard]}>
        <Text style={styles.cardTitle}>💬 Ajuda & sugestões</Text>
        <Text style={styles.cardText}>
          Projeto independente. Achou um problema ou tem uma ideia? Fala com a gente.
        </Text>
        <View style={styles.supportRow}>
          <Pressable style={styles.supportPrimary} onPress={openSuggestion} accessibilityRole="button" accessibilityLabel="Enviar sugestão">
            <Text style={styles.supportPrimaryText}>Enviar sugestão</Text>
          </Pressable>
          <Pressable style={styles.supportGhost} onPress={openSupport} accessibilityRole="button" accessibilityLabel="Central de ajuda">
            <Text style={styles.supportGhostText}>Ajuda</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.versionLine}>
        Acompanhador da Copa · v{appVersion()} · {otaStatus()}
      </Text>
      </ScrollView>

      {Platform.OS === 'ios' && (
        <AppIconSheet visible={iconOpen} onClose={() => setIconOpen(false)} />
      )}
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
  goalHint: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: spacing(3) },
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
  versionLine: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', marginTop: spacing(5) },
});

