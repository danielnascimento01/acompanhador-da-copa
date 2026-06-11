import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Match } from '../data/fixtures';
import { teamFlag, teamName } from '../data/teams';
import { Prediction } from '../lib/storage';
import { colors, fonts, radius, spacing } from '../lib/theme';

const MAX_GOALS = 20;

type Props = {
  match: Match;
  prediction: Prediction | undefined;
  onChange: (p: Prediction) => void;
  onClear: () => void;
};

/**
 * Editor do palpite de um jogo: dois placares com botões +/-.
 * Só deve ser exibido para jogos SEM placar real.
 */
export function PredictionEditor({ match, prediction, onChange, onClear }: Props) {
  const current = prediction ?? null;

  const bump = (side: 'home' | 'away', delta: 1 | -1) => {
    const base = current ?? { home: 0, away: 0 };
    const next = { ...base, [side]: Math.min(MAX_GOALS, Math.max(0, base[side] + delta)) };
    onChange(next);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.title}>🔮 Seu palpite</Text>
        {current && (
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Limpar palpite" hitSlop={8}>
            <Text style={styles.clear}>Limpar</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <ScoreColumn
          label={teamName(match.home)}
          flag={teamFlag(match.home)}
          value={current?.home}
          onPlus={() => bump('home', 1)}
          onMinus={() => bump('home', -1)}
        />
        <Text style={styles.x}>×</Text>
        <ScoreColumn
          label={teamName(match.away)}
          flag={teamFlag(match.away)}
          value={current?.away}
          onPlus={() => bump('away', 1)}
          onMinus={() => bump('away', -1)}
        />
      </View>

      <Text style={styles.hint}>
        {current
          ? 'Palpite salvo no seu aparelho. Ele entra na aba Grupos no modo "Meus palpites".'
          : 'Toque em + para palpitar o placar. A tabela simulada fica na aba Grupos.'}
      </Text>
    </View>
  );
}

function ScoreColumn({
  label,
  flag,
  value,
  onPlus,
  onMinus,
}: {
  label: string;
  flag: string;
  value: number | undefined;
  onPlus: () => void;
  onMinus: () => void;
}) {
  return (
    <View style={styles.col}>
      <Text style={styles.team} numberOfLines={1}>
        {flag} {label}
      </Text>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepBtn}
          onPress={onMinus}
          accessibilityRole="button"
          accessibilityLabel={`Diminuir gols de ${label}`}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={[styles.score, value == null && styles.scoreEmpty]}>{value ?? '–'}</Text>
        <Pressable
          style={styles.stepBtn}
          onPress={onPlus}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar gols de ${label}`}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.amber,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(3) },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  clear: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  col: { flex: 1, alignItems: 'center', gap: spacing(2) },
  team: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13 },
  x: { color: colors.textFaint, fontFamily: fonts.display, fontSize: 18, paddingHorizontal: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  score: {
    color: colors.amber,
    fontFamily: fonts.display,
    fontSize: 28,
    minWidth: 36,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  scoreEmpty: { color: colors.textFaint },
  hint: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: spacing(3) },
});
