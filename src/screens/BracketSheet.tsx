import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../lib/theme';

/**
 * "Caminho até a final" — estrutura do mata-mata da Copa de 48 seleções.
 *
 * Honestidade de dados (regra: 100% correto): os CONFRONTOS do mata-mata só
 * existem depois que a fase de grupos termina e os 8 melhores terceiros são
 * definidos. O cruzamento exato vem de uma tabela oficial condicional — então
 * aqui NÃO inventamos confrontos. Mostramos a estrutura real (quantos jogos em
 * cada fase) e o app preenche os confrontos quando os dados oficiais saírem.
 */
const STAGES = [
  { key: 'r32', name: '32 avos de final', games: 16, note: '16 confrontos · 32 seleções' },
  { key: 'r16', name: 'Oitavas de final', games: 8, note: '8 confrontos · 16 seleções' },
  { key: 'qf', name: 'Quartas de final', games: 4, note: '4 confrontos · 8 seleções' },
  { key: 'sf', name: 'Semifinais', games: 2, note: '2 confrontos · 4 seleções' },
  { key: 'third', name: 'Disputa de 3º lugar', games: 1, note: 'Os perdedores das semis' },
  { key: 'final', name: 'Final', games: 1, note: 'Os 2 finalistas' },
] as const;

export function BracketSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>Caminho até a final</Text>
          <Text style={styles.sub}>O mata-mata da Copa, fase a fase</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                Os confrontos são definidos quando a fase de grupos terminar — incluindo os 8 melhores
                terceiros. Esta tela preenche sozinha com os jogos oficiais assim que saírem. Por
                enquanto, mostramos a estrutura de cada fase.
              </Text>
            </View>

            {STAGES.map((s, i) => (
              <View key={s.key}>
                <View style={[styles.stage, s.key === 'final' && styles.stageFinal]}>
                  <View style={[styles.badge, s.key === 'final' && styles.badgeFinal]}>
                    <Text style={[styles.badgeNum, s.key === 'final' && styles.badgeNumFinal]}>{s.games}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={[styles.stageName, s.key === 'final' && styles.stageNameFinal]}>{s.name}</Text>
                    <Text style={styles.stageNote}>{s.note}</Text>
                  </View>
                  <Text style={styles.tbd}>a definir</Text>
                </View>
                {i < STAGES.length - 1 && <View style={styles.connector} />}
              </View>
            ))}

            <Text style={styles.footer}>
              Formato de 48 seleções: os 2 primeiros de cada grupo e os 8 melhores terceiros avançam
              para os 32 avos de final.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    maxHeight: '88%',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(4) },
  banner: {
    backgroundColor: 'rgba(21,194,214,0.10)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(21,194,214,0.30)',
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  bannerText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
  },
  stageFinal: { borderColor: colors.accent, backgroundColor: 'rgba(20,224,138,0.07)' },
  badge: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  badgeFinal: { backgroundColor: colors.accent, borderColor: colors.accent },
  badgeNum: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  badgeNumFinal: { color: colors.ink },
  flex1: { flex: 1 },
  stageName: { color: colors.text, fontFamily: fonts.bold, fontSize: 15.5 },
  stageNameFinal: { color: colors.accent },
  stageNote: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  tbd: { color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 11.5, fontStyle: 'italic' },
  connector: { width: 2, height: spacing(3), backgroundColor: colors.border, alignSelf: 'center' },
  footer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing(4), textAlign: 'center' },
});
