import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Flag } from '../components/Flag';
import { fetchLiveScorers, type LiveScorer } from '../lib/liveScorers';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';

export function ScorersSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTheme();
  const [scorers, setScorers] = useState<LiveScorer[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    fetchLiveScorers().then((data) => {
      if (cancelled) return;
      setScorers(data);
      // Data SEMPRE do servidor (fonte real). Sem dado → sem data falsa.
      const serverDate = data[0]?.updatedAt;
      setUpdatedAt(serverDate ? formatUpdatedAt(serverDate) : '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [visible]);

  const ranked = scorers.map((s, i) => ({ ...s, rank: i + 1 }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>ARTILHEIROS</Text>
          <Text style={styles.subtitle}>Chuteira de Ouro da Copa 2026</Text>

          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={c.accent} size="large" />
            </View>
          ) : ranked.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🥅</Text>
              <Text style={styles.emptyTitle}>A artilharia começa com o 1º gol</Text>
              <Text style={styles.emptyText}>
                Assim que a bola balançar a rede, a lista dos goleadores aparece aqui — atualizada
                durante toda a Copa.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              {ranked.map((s) => (
                <View key={`${s.player}-${s.rank}`} style={[styles.row, s.rank === 1 && styles.rowLeader]}>
                  <Text style={[styles.rank, s.rank === 1 && styles.rankLeader]}>{s.rank}</Text>
                  {s.teamId ? (
                    <Flag teamId={s.teamId} size={34} radius={10} />
                  ) : (
                    <Text style={styles.flag}>{s.flag}</Text>
                  )}
                  <View style={styles.flex1}>
                    <Text style={styles.player}>{s.player}</Text>
                    <Text style={styles.team}>{s.teamName}</Text>
                  </View>
                  <View style={styles.goalsBox}>
                    <Text style={styles.goals}>{s.goals}</Text>
                    <Text style={styles.goalsLabel}>{s.goals === 1 ? 'gol' : 'gols'}</Text>
                  </View>
                </View>
              ))}
              {updatedAt ? <Text style={styles.updated}>Atualizado em {updatedAt}</Text> : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** "23/06/2026 15:42" a partir de ISO 8601, no fuso local. */
function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return iso;
  }
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    maxHeight: '85%',
    backgroundColor: c.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    paddingBottom: spacing(6),
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  closeBtn: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 1 },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.5 },
  subtitle: { color: c.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 2, marginBottom: spacing(4) },

  empty: { alignItems: 'center', paddingVertical: spacing(8), paddingHorizontal: spacing(4) },
  emptyEmoji: { fontSize: 52, marginBottom: spacing(3) },
  emptyTitle: { color: c.text, fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' },
  emptyText: { color: c.textDim, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: spacing(2) },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  rowLeader: { borderColor: c.amber },
  rank: { color: c.textDim, fontFamily: fonts.display, fontSize: 20, width: 28, textAlign: 'center' },
  rankLeader: { color: c.amber },
  flag: { fontSize: 28 },
  flex1: { flex: 1 },
  player: { color: c.text, fontFamily: fonts.bold, fontSize: 16 },
  team: { color: c.textDim, fontFamily: fonts.regular, fontSize: 13, marginTop: 1 },
  goalsBox: { alignItems: 'center', minWidth: 44 },
  goals: { color: c.text, fontFamily: fonts.display, fontSize: 24 },
  goalsLabel: { color: c.textFaint, fontFamily: fonts.semibold, fontSize: 11 },
  updated: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing(3) },
});
