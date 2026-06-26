import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { QUIZ, QUIZ_MODES, shuffle, type QuizMode, type Question } from '../data/quiz';
import { loadQuizBest, saveQuizBest } from '../lib/funStorage';
import { colors, fonts, radius, spacing } from '../lib/theme';

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.danielnascimento.copa2026';

/** Embaralha as opções de uma pergunta e recalcula o índice da correta. */
function prepare(qs: Question[]): Question[] {
  return shuffle(qs).map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      q: q.q,
      options: order.map((i) => q.options[i]),
      answer: order.indexOf(q.answer),
    };
  });
}

type Phase = 'menu' | 'playing' | 'result';

export function QuizGame({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('menu');
  const [mode, setMode] = useState<QuizMode>('brasil');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [best, setBest] = useState<Partial<Record<QuizMode, number>>>({});

  useEffect(() => {
    if (visible) loadQuizBest().then(setBest);
    else setPhase('menu');
  }, [visible]);

  const start = (m: QuizMode) => {
    setMode(m);
    setQuestions(prepare(QUIZ[m]));
    setIdx(0);
    setScore(0);
    setPicked(null);
    setPhase('playing');
  };

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[idx].answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      // fim — salva recorde
      const prev = best[mode] ?? 0;
      if (score > prev) {
        const nb = { ...best, [mode]: score };
        setBest(nb);
        saveQuizBest(nb);
      }
      setPhase('result');
    } else {
      setIdx((n) => n + 1);
      setPicked(null);
    }
  };

  const modeMeta = QUIZ_MODES.find((m) => m.key === mode)!;

  const shareResult = () => {
    Share.share({
      message: `🧠 Fiz ${score}/${questions.length} no Quiz ${modeMeta.label} da Copa! Consegue mais? Baixa o Acompanhador da Copa 2026 e me desafia:\n${APP_LINK}`,
    }).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {phase === 'menu' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              <Text style={styles.title}>Quiz da Copa</Text>
              <Text style={styles.sub}>Escolha um modo e mostre que você manja 🧠</Text>
              {QUIZ_MODES.map((m) => (
                <Pressable key={m.key} style={styles.modeCard} onPress={() => start(m.key)} accessibilityRole="button" accessibilityLabel={`Jogar quiz ${m.label}`}>
                  <Text style={styles.modeEmoji}>{m.emoji}</Text>
                  <View style={styles.flex1}>
                    <Text style={styles.modeLabel}>{m.label}</Text>
                    <Text style={styles.modeDesc}>{m.desc}</Text>
                  </View>
                  {best[m.key] != null && <Text style={styles.modeBest}>🏅 {best[m.key]}/{QUIZ[m.key].length}</Text>}
                </Pressable>
              ))}
            </ScrollView>
          )}

          {phase === 'playing' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{modeMeta.emoji} {modeMeta.label}</Text>
                <Text style={styles.progressText}>{idx + 1}/{questions.length} · ✓ {score}</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${((idx + 1) / questions.length) * 100}%` }]} />
              </View>

              <Text style={styles.question}>{questions[idx].q}</Text>
              {questions[idx].options.map((opt, i) => {
                const isAnswer = i === questions[idx].answer;
                const reveal = picked !== null;
                const wrongPick = reveal && i === picked && !isAnswer;
                return (
                  <Pressable
                    key={i}
                    style={[styles.opt, reveal && isAnswer && styles.optRight, wrongPick && styles.optWrong]}
                    onPress={() => pick(i)}
                    disabled={reveal}
                    accessibilityRole="button"
                    accessibilityLabel={opt}
                  >
                    <Text style={[styles.optText, reveal && isAnswer && styles.optTextRight, wrongPick && styles.optTextWrong]}>
                      {reveal && isAnswer ? '✓ ' : wrongPick ? '✕ ' : ''}{opt}
                    </Text>
                  </Pressable>
                );
              })}

              {picked !== null && (
                <Pressable style={styles.nextBtn} onPress={next} accessibilityRole="button" accessibilityLabel="Próxima pergunta">
                  <Text style={styles.nextText}>{idx + 1 >= questions.length ? 'Ver resultado' : 'Próxima'}</Text>
                </Pressable>
              )}
            </ScrollView>
          )}

          {phase === 'result' && (
            <View style={styles.result}>
              <Text style={styles.resultEmoji}>{score >= questions.length * 0.8 ? '🏆' : score >= questions.length * 0.5 ? '👏' : '💪'}</Text>
              <Text style={styles.resultScore}>{score}/{questions.length}</Text>
              <Text style={styles.resultMsg}>
                {score === questions.length ? 'Perfeito! Você é craque!' : score >= questions.length * 0.7 ? 'Muito bom! Quase tudo certo.' : score >= questions.length * 0.4 ? 'Boa! Dá pra melhorar.' : 'Bora estudar a Copa e tentar de novo!'}
              </Text>
              {best[mode] != null && <Text style={styles.resultBest}>Seu recorde no modo {modeMeta.label}: 🏅 {best[mode]}/{questions.length}</Text>}

              <Pressable style={styles.primaryBtn} onPress={shareResult} accessibilityRole="button" accessibilityLabel="Compartilhar resultado e desafiar amigos">
                <Text style={styles.primaryText}>Desafiar amigos 📲</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={() => start(mode)} accessibilityRole="button" accessibilityLabel="Jogar de novo">
                <Text style={styles.ghostText}>Jogar de novo</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={() => setPhase('menu')} accessibilityRole="button" accessibilityLabel="Trocar de modo">
                <Text style={styles.ghostText}>Trocar de modo</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: colors.bgElev, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(5), paddingTop: spacing(3), maxHeight: '90%', minHeight: '55%' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  flex1: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(4) },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(4), marginBottom: spacing(3) },
  modeEmoji: { fontSize: 30 },
  modeLabel: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  modeDesc: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12.5, marginTop: 1 },
  modeBest: { color: colors.amber, fontFamily: fonts.bold, fontSize: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(2) },
  progressText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 13 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden', marginBottom: spacing(4) },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  question: { color: colors.text, fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, marginBottom: spacing(4) },
  opt: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing(3.5), paddingHorizontal: spacing(4), marginBottom: spacing(2.5) },
  optRight: { backgroundColor: 'rgba(20,224,138,0.14)', borderColor: colors.accent },
  optWrong: { backgroundColor: 'rgba(255,77,94,0.14)', borderColor: colors.live },
  optText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  optTextRight: { color: colors.accent, fontFamily: fonts.bold },
  optTextWrong: { color: colors.live, fontFamily: fonts.bold },
  nextBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(2) },
  nextText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  result: { alignItems: 'center', paddingVertical: spacing(6) },
  resultEmoji: { fontSize: 56 },
  resultScore: { color: colors.text, fontFamily: fonts.display, fontSize: 52, marginTop: spacing(2) },
  resultMsg: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 15, textAlign: 'center', marginTop: spacing(2), marginBottom: spacing(2) },
  resultBest: { color: colors.amber, fontFamily: fonts.bold, fontSize: 13, marginBottom: spacing(4) },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), paddingHorizontal: spacing(8), alignItems: 'center', alignSelf: 'stretch' },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  ghostBtn: { paddingVertical: spacing(3), alignItems: 'center', alignSelf: 'stretch' },
  ghostText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 14 },
});
