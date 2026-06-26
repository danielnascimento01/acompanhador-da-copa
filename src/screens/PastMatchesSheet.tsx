import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MatchCard } from '../components/MatchCard';
import { Match, hasStarted, isFinished, isLive, kickoff } from '../data/fixtures';
import { localDayKey, relativeDayLabel } from '../lib/format';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';

type Props = {
  visible: boolean;
  matches: Match[];
  selected: Set<string>;
  primaryTeam?: string | null;
  onClose: () => void;
  onSelectMatch: (m: Match) => void;
};

type DayGroup = { key: string; title: string; data: Match[] };

/**
 * "Jogos passados": só os jogos já realizados/encerrados, agrupados por dia com
 * os mais recentes no topo. Mesmo MatchCard das outras telas; usa os dados que o
 * store já tem (sem fetch novo). Acesso rápido pelo botão no topo da aba Jogos.
 */
export function PastMatchesSheet({ visible, matches, selected, primaryTeam, onClose, onSelectMatch }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { groups, total } = useMemo(() => {
    const now = new Date();
    const past = matches.filter((m) => isFinished(m) || (hasStarted(m, now) && !isLive(m, now)));

    const byDay = new Map<string, Match[]>();
    for (const m of past) {
      const key = localDayKey(kickoff(m));
      const arr = byDay.get(key);
      if (arr) arr.push(m);
      else byDay.set(key, [m]);
    }

    const list: DayGroup[] = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // dias mais recentes primeiro
      .map(([key, data]) => ({
        key,
        title: relativeDayLabel(kickoff(data[0])),
        data: data.sort((a, b) => b.utc.localeCompare(a.utc)), // último jogo do dia no topo
      }));

    return { groups: list, total: past.length };
  }, [matches]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>Jogos passados</Text>
          <Text style={styles.sub}>
            {total === 0
              ? 'Nenhum jogo encerrado ainda'
              : `${total} ${total === 1 ? 'jogo já realizado' : 'jogos já realizados'} · mais recentes no topo`}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(6) }}>
            {total === 0 ? (
              <Text style={styles.empty}>Assim que os primeiros jogos terminarem, eles aparecem aqui. ⚽</Text>
            ) : (
              groups.map((g) => (
                <View key={g.key}>
                  <Text style={styles.day}>{g.title}</Text>
                  {g.data.map((m) => (
                    <MatchCard key={m.id} match={m} selected={selected} primaryTeam={primaryTeam} onPress={() => onSelectMatch(m)} />
                  ))}
                </View>
              ))
            )}
          </ScrollView>
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
    maxHeight: '88%',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(2) },
  empty: { color: c.textDim, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', paddingVertical: spacing(8), lineHeight: 22 },
  day: {
    color: c.textFaint,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: spacing(4),
    marginBottom: spacing(2),
    textTransform: 'uppercase',
  },
});
