import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Match } from '../data/fixtures';
import { teamFlag } from '../data/teams';
import { MAX_PREDICTION_GOALS, Prediction } from '../lib/storage';
import { colors, fonts, radius, spacing } from '../lib/theme';

type Props = {
  match: Match;
  prediction: Prediction | undefined;
  onChange: (p: Prediction) => void;
};

/**
 * Linha compacta de palpite rápido (usada na aba Grupos, modo simulação):
 * 🇧🇷 [− 2 +] × [− 0 +] 🇲🇦 — permite preencher um grupo inteiro em segundos.
 */
export const QuickPredictRow = React.memo(function QuickPredictRow({ match, prediction, onChange }: Props) {
  const bump = (side: 'home' | 'away', delta: 1 | -1) => {
    if (!prediction && delta === -1) return; // "−" sem palpite não cria 0×0
    const base = prediction ?? { home: 0, away: 0 };
    onChange({
      ...base,
      [side]: Math.min(MAX_PREDICTION_GOALS, Math.max(0, base[side] + delta)),
    });
  };

  return (
    <View style={styles.row}>
      <Text style={styles.flag}>{teamFlag(match.home)}</Text>
      <MiniStepper
        value={prediction?.home}
        onMinus={() => bump('home', -1)}
        onPlus={() => bump('home', 1)}
      />
      <Text style={styles.x}>×</Text>
      <MiniStepper
        value={prediction?.away}
        onMinus={() => bump('away', -1)}
        onPlus={() => bump('away', 1)}
      />
      <Text style={styles.flag}>{teamFlag(match.away)}</Text>
    </View>
  );
});

function MiniStepper({
  value,
  onMinus,
  onPlus,
}: {
  value: number | undefined;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View
      style={styles.stepper}
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ text: value == null ? 'sem palpite' : `${value} gols` }}
    >
      <Pressable style={styles.btn} onPress={onMinus} accessibilityRole="button" accessibilityLabel="Menos um gol" hitSlop={4}>
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={[styles.value, value == null && styles.valueEmpty]}>{value ?? '–'}</Text>
      <Pressable style={styles.btn} onPress={onPlus} accessibilityRole="button" accessibilityLabel="Mais um gol" hitSlop={4}>
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2), paddingVertical: spacing(1) },
  flag: { fontSize: 22 },
  x: { color: colors.textFaint, fontFamily: fonts.display, fontSize: 14 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  value: {
    color: colors.amber,
    fontFamily: fonts.display,
    fontSize: 18,
    minWidth: 26,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  valueEmpty: { color: colors.textFaint },
});
