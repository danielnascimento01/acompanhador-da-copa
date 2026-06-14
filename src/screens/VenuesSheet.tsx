import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HOSTS, TOTAL_VENUES } from '../data/venues';
import { colors, fonts, radius, spacing } from '../lib/theme';

export function VenuesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>SEDES & ESTÁDIOS</Text>
          <Text style={styles.subtitle}>{TOTAL_VENUES} estádios · 3 países · 1ª Copa com 3 sedes</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
            {HOSTS.map((host) => (
              <View key={host.country} style={styles.hostBlock}>
                <View style={styles.hostHead}>
                  <Text style={styles.hostFlag}>{host.flag}</Text>
                  <Text style={styles.hostName}>{host.country}</Text>
                  <Text style={styles.hostCount}>{host.venues.length}</Text>
                </View>
                {host.venues.map((v) => (
                  <View key={v.stadium} style={styles.venueRow}>
                    <Text style={styles.venuePin}>📍</Text>
                    <View style={styles.flex1}>
                      <Text style={styles.venueStadium}>{v.stadium}</Text>
                      <Text style={styles.venueCity}>{v.city}</Text>
                    </View>
                    {v.tag && (
                      <View style={[styles.tag, v.tag === 'final' ? styles.tagFinal : styles.tagOpen]}>
                        <Text style={styles.tagText}>{v.tag === 'final' ? '⭐ Final' : '🎉 Abertura'}</Text>
                      </View>
                    )}
                  </View>
                ))}
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

  hostBlock: { marginTop: spacing(4) },
  hostHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(2) },
  hostFlag: { fontSize: 22 },
  hostName: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, flex: 1 },
  hostCount: {
    color: colors.textDim,
    fontFamily: fonts.bold,
    fontSize: 13,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
    marginBottom: spacing(2),
  },
  venuePin: { fontSize: 16, width: 24, textAlign: 'center' },
  flex1: { flex: 1 },
  venueStadium: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  venueCity: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, marginTop: 1 },
  tag: { paddingHorizontal: spacing(2), paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1 },
  tagOpen: { borderColor: colors.accent, backgroundColor: 'rgba(20,224,138,0.1)' },
  tagFinal: { borderColor: colors.amber, backgroundColor: 'rgba(255,194,51,0.1)' },
  tagText: { color: colors.text, fontFamily: fonts.bold, fontSize: 11 },
});
