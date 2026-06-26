import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MatchCard } from '../components/MatchCard';
import { Match, isLive, kickoff } from '../data/fixtures';
import { localDayKey } from '../lib/format';
import { shareMatches } from '../lib/share';
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

/**
 * "Tela do dia": TODOS os jogos de hoje (de todos os grupos) num lugar só, ao
 * vivo no topo. Replica o split da TV nos dias de maior uso. Usa os jogos que o
 * store já tem (sem fetch novo) e o mesmo MatchCard das outras telas.
 */
export function DayMatchesSheet({ visible, matches, selected, primaryTeam, onClose, onSelectMatch }: Props) {
  const styles = useThemedStyles(makeStyles);
  const today = useMemo(() => {
    const key = localDayKey(new Date());
    return matches
      .filter((m) => localDayKey(kickoff(m)) === key)
      .sort((a, b) => Number(isLive(b)) - Number(isLive(a)) || a.utc.localeCompare(b.utc));
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

          <Text style={styles.title}>Jogos de hoje</Text>
          <Text style={styles.sub}>
            {today.length === 0
              ? 'Sem jogos hoje'
              : `${today.length} ${today.length === 1 ? 'jogo' : 'jogos'} · ao vivo no topo`}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(6) }}>
            {today.length === 0 ? (
              <Text style={styles.empty}>Nenhum jogo programado para hoje. Volte amanhã! ⚽</Text>
            ) : (
              today.map((m) => (
                <MatchCard key={m.id} match={m} selected={selected} primaryTeam={primaryTeam} onPress={() => onSelectMatch(m)} />
              ))
            )}
          </ScrollView>

          {today.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
              onPress={() => shareMatches('⚽ Jogos de hoje na Copa:', today)}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar todos os jogos de hoje"
            >
              <Text style={styles.shareText}>↗ Compartilhar todos no WhatsApp</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ c, st }: ThemeTokens) => StyleSheet.create({
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
  sub: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(4) },
  empty: { color: c.textDim, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', paddingVertical: spacing(8), lineHeight: 22 },
  shareBtn: {
    marginVertical: spacing(3),
    paddingVertical: spacing(3),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: st.favoriteBg,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
  shareText: { color: c.accent, fontFamily: fonts.bold, fontSize: 14 },
});
