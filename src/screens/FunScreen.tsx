import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { QuizGame } from './QuizGame';
import { Embaixadinhas } from './Embaixadinhas';
import { colors, fonts, radius, spacing } from '../lib/theme';

/**
 * Aba "Quiz e Jogos" — diversão entre as consultas: o Quiz da Copa (3 modos) e o
 * mini-game de embaixadinhas. Cada card abre seu próprio sheet.
 */
export function FunScreen() {
  const [quizOpen, setQuizOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
        <Text style={styles.kicker}>DIVERSÃO DA COPA</Text>
        <Text style={styles.title}>Quiz e Jogos</Text>
        <Text style={styles.subtitle}>Teste seus conhecimentos e desafie os amigos.</Text>

        <Pressable style={styles.card} onPress={() => setQuizOpen(true)} accessibilityRole="button" accessibilityLabel="Abrir o Quiz da Copa">
          <Text style={styles.cardEmoji}>🧠</Text>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Quiz da Copa</Text>
            <Text style={styles.cardDesc}>Brasil, história das Copas ou Copa 2026. Acerte o máximo e desafie a galera!</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => setGameOpen(true)} accessibilityRole="button" accessibilityLabel="Abrir o jogo de embaixadinhas">
          <Text style={styles.cardEmoji}>⚽</Text>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Embaixadinhas</Text>
            <Text style={styles.cardDesc}>Arraste o dedo, cabeceie a bola e bata seu recorde. Entra pro ranking deste aparelho!</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.note}>Tudo offline e de graça — pra passar o tempo entre um jogo e outro. 🇧🇷</Text>
      </ScrollView>

      <QuizGame visible={quizOpen} onClose={() => setQuizOpen(false)} />
      <Embaixadinhas visible={gameOpen} onClose={() => setGameOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  kicker: { color: colors.accent, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 36, letterSpacing: 0.3 },
  subtitle: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 14, marginTop: 2, marginBottom: spacing(4) },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(4), marginBottom: spacing(3) },
  cardEmoji: { fontSize: 36 },
  cardTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  cardDesc: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  chevron: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 24 },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, marginTop: spacing(2), textAlign: 'center' },
});
