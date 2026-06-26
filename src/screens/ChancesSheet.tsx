import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Flag } from '../components/Flag';
import { teamName } from '../data/teams';
import { simulateChances, type GroupChance } from '../data/chances';
import { useStore } from '../lib/store';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';

/** Rótulo + cor honestos a partir da chance (%). */
function label(pct: number, c: ThemeTokens['c']): { text: string; color: string } {
  if (pct >= 100) return { text: 'Classificado', color: c.accent };
  if (pct <= 0) return { text: 'Eliminado', color: c.textFaint };
  if (pct >= 99.5) return { text: '>99%', color: c.accent };
  if (pct <= 0.5) return { text: '<1%', color: c.live };
  const v = Math.round(pct);
  const color = v >= 60 ? c.accent : v >= 30 ? c.amber : c.live;
  return { text: `${v}%`, color };
}

/**
 * "Chance de classificação" — simulação de Monte Carlo neutra (chances.ts). Mostra,
 * por grupo, a % de cada seleção avançar (1º/2º + 8 melhores 3ºs). É HONESTO: o
 * número não é palpite de força, e sim em quantos cenários possíveis o time passa.
 */
export function ChancesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTheme();
  const { matches, selected } = useStore();
  const [groups, setGroups] = useState<GroupChance[] | null>(null);

  useEffect(() => {
    if (!visible) {
      setGroups(null);
      return;
    }
    setGroups(null);
    // Adia 1 frame p/ o spinner pintar antes do cálculo (roda ~0,3-0,5s).
    const t = setTimeout(() => setGroups(simulateChances(matches, 5000)), 30);
    return () => clearTimeout(t);
  }, [visible, matches]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>Chance de classificação</Text>
          <Text style={styles.sub}>Probabilidade de avançar às oitavas</Text>

          {!groups ? (
            <View style={styles.loading}>
              <ActivityIndicator color={c.accent} />
              <Text style={styles.loadingText}>Simulando milhares de cenários…</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              <View style={styles.banner}>
                <Text style={styles.bannerText}>
                  <Text style={styles.bannerBold}>Estimativa</Text> por milhares de simulações: cada jogo restante é
                  sorteado pela <Text style={styles.bannerBold}>força das seleções</Text> (o favorito vence mais, como
                  na vida real). Conta em quantos cenários cada time passa — 1º/2º do grupo ou entre os 8 melhores
                  terceiros. Não é garantia; quanto mais jogos faltam, mais incerto.
                </Text>
              </View>

              {groups.map((g) => (
                <View key={g.group} style={styles.groupBlock}>
                  <View style={styles.groupHead}>
                    <View style={styles.groupTag}>
                      <Text style={styles.groupTagText}>{g.group}</Text>
                    </View>
                    <Text style={styles.groupLabel}>Grupo {g.group}</Text>
                  </View>
                  {g.teams.map((t) => {
                    const lab = label(t.pct, c);
                    const mine = selected.has(t.teamId);
                    return (
                      <View key={t.teamId} style={styles.row}>
                        <Flag teamId={t.teamId} size={24} radius={7} />
                        <Text style={[styles.team, mine && styles.teamMine]} numberOfLines={1}>
                          {teamName(t.teamId)}
                          {mine ? '  ★' : ''}
                        </Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${Math.max(2, t.pct)}%`, backgroundColor: lab.color }]} />
                        </View>
                        <Text style={[styles.pct, { color: lab.color }]}>{lab.text}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}

              <Text style={styles.footer}>
                Avançam os 2 primeiros de cada grupo + os 8 melhores terceiros. Times já garantidos aparecem como
                "Classificado"; sem chance, como "Eliminado".
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: c.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    maxHeight: '90%',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(4) },
  loading: { paddingVertical: spacing(10), alignItems: 'center', gap: spacing(3) },
  loadingText: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13 },
  banner: {
    backgroundColor: 'rgba(21,194,214,0.10)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(21,194,214,0.30)',
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  bannerText: { color: c.textDim, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18 },
  bannerBold: { color: c.text, fontFamily: fonts.bold },
  groupBlock: { marginBottom: spacing(4) },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(2) },
  groupTag: { width: 24, height: 24, borderRadius: 7, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  groupTagText: { color: c.ink, fontFamily: fonts.display, fontSize: 13 },
  groupLabel: { color: c.text, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(2) },
  team: { color: c.text, fontFamily: fonts.semibold, fontSize: 14, width: 120 },
  teamMine: { color: c.accent, fontFamily: fonts.bold },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surface2, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pct: { fontFamily: fonts.display, fontSize: 14, width: 92, textAlign: 'right', fontVariant: ['tabular-nums'] },
  footer: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing(2), textAlign: 'center' },
});
