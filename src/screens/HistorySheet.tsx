import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EDITIONS, RECORDS, TITLES } from '../data/worldCupHistory';
import { colors, fonts, radius, spacing } from '../lib/theme';

export function HistorySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>HISTÓRIA DA COPA</Text>
          <Text style={styles.subtitle}>Campeões, recordes e curiosidades</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
            {/* Recordes */}
            <Text style={styles.sectionLabel}>Recordes & curiosidades</Text>
            {RECORDS.map((r) => (
              <View key={r.label} style={styles.recordRow}>
                <Text style={styles.recordEmoji}>{r.emoji}</Text>
                <View style={styles.flex1}>
                  <Text style={styles.recordLabel}>{r.label}</Text>
                  <Text style={styles.recordValue}>{r.value}</Text>
                </View>
              </View>
            ))}

            {/* Maiores campeões */}
            <Text style={styles.sectionLabel}>Maiores campeões</Text>
            {TITLES.map((t) => (
              <View key={t.team} style={styles.titleRow}>
                <Text style={styles.titleFlag}>{t.flag}</Text>
                <View style={styles.flex1}>
                  <Text style={styles.titleTeam}>{t.team}</Text>
                  <Text style={styles.titleYears}>{t.years}</Text>
                </View>
                <View style={styles.starsBox}>
                  <Text style={styles.stars}>{'★'.repeat(t.titles)}</Text>
                  <Text style={styles.titlesNum}>{t.titles}</Text>
                </View>
              </View>
            ))}

            {/* Todos os campeões */}
            <Text style={styles.sectionLabel}>Todos os campeões</Text>
            {EDITIONS.map((e) => (
              <View key={e.year} style={styles.editionRow}>
                <Text style={styles.year}>{e.year}</Text>
                <Text style={styles.editionFlag}>{e.championFlag}</Text>
                <View style={styles.flex1}>
                  <Text style={styles.editionChampion}>{e.champion}</Text>
                  <Text style={styles.editionMeta}>
                    {e.score} vs {e.runnerUp} · {e.host}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    paddingBottom: spacing(6),
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  closeBtn: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 1 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.5 },
  subtitle: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 2, marginBottom: spacing(2) },

  sectionLabel: {
    color: colors.textFaint,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing(5),
    marginBottom: spacing(2),
  },
  flex1: { flex: 1 },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  recordEmoji: { fontSize: 24, width: 30, textAlign: 'center' },
  recordLabel: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 12 },
  recordValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(2), paddingHorizontal: spacing(2) },
  titleFlag: { fontSize: 26 },
  titleTeam: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  titleYears: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  starsBox: { alignItems: 'flex-end' },
  stars: { color: colors.amber, fontSize: 13 },
  titlesNum: { color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 11 },

  editionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(2), paddingHorizontal: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.border },
  year: { color: colors.textDim, fontFamily: fonts.display, fontSize: 16, width: 44 },
  editionFlag: { fontSize: 22 },
  editionChampion: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  editionMeta: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
});
