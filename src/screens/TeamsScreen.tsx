import React, { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Flag } from '../components/Flag';
import { GROUPS, TEAMS, Team } from '../data/teams';
import { useStore } from '../lib/store';
import { colors, fonts, radius, spacing, state } from '../lib/theme';

export function TeamsScreen() {
  const { selected, toggleTeam, settings, updateSettings } = useStore();
  const primaryTeam = settings.primaryTeam;

  // Elege (ou desmarca) a seleção principal. Eleger garante que ela também esteja
  // marcada (para receber os avisos) — o foco do app passa a ser ela.
  const setPrimary = (id: string) => {
    if (primaryTeam === id) {
      updateSettings({ primaryTeam: null });
    } else {
      if (!selected.has(id)) toggleTeam(id);
      updateSettings({ primaryTeam: id });
    }
  };

  const sections = useMemo(
    () =>
      GROUPS.map((g) => ({
        title: g,
        data: TEAMS.filter((t) => t.group === g),
      })),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>RECEBA AVISOS</Text>
        <Text style={styles.title}>Seleções</Text>
        <Text style={styles.subtitle}>
          {selected.size === 0
            ? 'Marque as seleções para receber avisos dos jogos delas.'
            : `🔔 ${selected.size} ${selected.size === 1 ? 'seleção' : 'seleções'} · você será avisado dos jogos`}
        </Text>
        <Text style={styles.note}>
          Todos os jogos da Copa aparecem na aba Jogos. Aqui você escolhe só de quais quer ser lembrado.
          Toque na ⭐ para definir sua seleção principal — ela vira o foco do app.
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: spacing(10), paddingHorizontal: spacing(4) }}
        renderSectionHeader={({ section }) => (
          <View style={styles.groupRow}>
            <View style={styles.groupTag}>
              <Text style={styles.groupTagText}>{section.title}</Text>
            </View>
            <Text style={styles.groupLabel}>Grupo {section.title}</Text>
            <View style={styles.groupLine} />
          </View>
        )}
        renderItem={({ item }) => (
          <TeamRow
            team={item}
            active={selected.has(item.id)}
            primary={primaryTeam === item.id}
            onPress={() => toggleTeam(item.id)}
            onStar={() => setPrimary(item.id)}
          />
        )}
      />
    </View>
  );
}

function TeamRow({
  team,
  active,
  primary,
  onPress,
  onStar,
}: {
  team: Team;
  active: boolean;
  primary: boolean;
  onPress: () => void;
  onStar: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={team.name}
      hitSlop={6}
      style={({ pressed }) => [styles.row, primary && styles.rowPrimary, pressed && styles.rowPressed]}
    >
      <Flag teamId={team.id} size={40} radius={20} />
      <Text style={[styles.name, primary && styles.namePrimary]} numberOfLines={1}>
        {team.name}
      </Text>
      <Pressable
        onPress={onStar}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={primary ? `Remover ${team.name} como seleção principal` : `Definir ${team.name} como seleção principal`}
        style={({ pressed }) => [styles.star, pressed && styles.rowPressed]}
      >
        <Text style={[styles.starText, primary && styles.starActive]}>{primary ? '★' : '☆'}</Text>
      </Pressable>
      <View style={[styles.check, active && styles.checkActive]}>
        {active && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing(4), paddingTop: spacing(2), paddingBottom: spacing(3) },
  kicker: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 36, letterSpacing: 0.3 },
  subtitle: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 14, marginTop: 2 },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, marginTop: spacing(2) },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(5), marginBottom: spacing(2) },
  groupTag: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTagText: { color: colors.ink, fontFamily: fonts.display, fontSize: 14 },
  groupLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.5 },
  groupLine: { flex: 1, height: 1, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2.5),
    gap: spacing(3),
    minHeight: 62,
  },
  rowPrimary: { borderColor: state.favoriteBorder, backgroundColor: state.favoriteBg },
  rowPressed: { opacity: 0.6 },
  star: { paddingHorizontal: spacing(1), alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 20, color: colors.textFaint },
  starActive: { color: colors.amber },
  name: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, flex: 1 },
  namePrimary: { color: colors.accent, fontFamily: fonts.bold },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.ink, fontFamily: fonts.extrabold, fontSize: 15 },
});
