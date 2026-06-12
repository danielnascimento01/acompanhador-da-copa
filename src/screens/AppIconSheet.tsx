import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { APP_ICONS, APP_ICON_GROUPS, AppIconDef } from '../data/appIcons';
import { changeAppIcon, getCurrentIconKey, ICON_CHANGE_NEEDS_RESTART } from '../lib/appIcon';
import { colors, fonts, radius, spacing } from '../lib/theme';

const COLS = 3;
const SHEET_PAD = spacing(5); // padding horizontal do sheet
const GRID_GAP = spacing(3);
const TILE = Math.floor((Dimensions.get('window').width - SHEET_PAD * 2 - GRID_GAP * (COLS - 1)) / COLS);

export function AppIconSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string>('brasil');
  // 'idle' | 'restart' (trocou no Android) | 'unavailable' (Expo Go / sem suporte)
  const [hint, setHint] = useState<'idle' | 'restart' | 'unavailable'>('idle');

  useEffect(() => {
    if (visible) {
      setSelected(getCurrentIconKey());
      setHint('idle');
    }
  }, [visible]);

  const handlePick = (icon: AppIconDef) => {
    if (icon.key === selected) return;
    const ok = changeAppIcon(icon.key);
    if (!ok) {
      setHint('unavailable');
      return;
    }
    setSelected(icon.key);
    setHint(ICON_CHANGE_NEEDS_RESTART ? 'restart' : 'idle');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={10}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>ÍCONE DO APP</Text>
          <Text style={styles.subtitle}>Escolha como o app aparece na sua tela inicial.</Text>

          {hint === 'restart' && (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                ✅ Ícone alterado! No Android, ele aparece depois de fechar e reabrir o app.
              </Text>
            </View>
          )}
          {hint === 'unavailable' && (
            <View style={[styles.hintBox, styles.hintWarn]}>
              <Text style={styles.hintText}>
                A troca de ícone só funciona no app instalado da loja, não na pré-visualização.
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {APP_ICON_GROUPS.map((group) => (
              <View key={group.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{group.title}</Text>
                <View style={styles.grid}>
                  {APP_ICONS.filter((i) => i.group === group.key).map((icon) => {
                    const active = icon.key === selected;
                    return (
                      <Pressable
                        key={icon.key}
                        style={styles.tile}
                        onPress={() => handlePick(icon)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Ícone ${icon.label}${active ? ', selecionado' : ''}`}
                      >
                        <View style={[styles.thumbWrap, active && styles.thumbWrapActive]}>
                          <Image source={icon.thumb} style={styles.thumb} />
                          {active && (
                            <View style={styles.check}>
                              <Text style={styles.checkText}>✓</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.tileLabel, active && styles.tileLabelActive]} numberOfLines={1}>
                          {icon.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <Text style={styles.footer}>App não oficial · sem vínculo com entidades ou competições oficiais</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const THUMB = TILE - spacing(2);

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
    paddingHorizontal: SHEET_PAD,
    paddingTop: spacing(3),
    paddingBottom: spacing(8),
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(4) },
  closeBtn: { position: 'absolute', top: spacing(4), right: spacing(5) },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.5 },
  subtitle: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 4, marginBottom: spacing(4) },
  hintBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  hintWarn: { borderColor: colors.amber },
  hintText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19 },
  scrollContent: { paddingBottom: spacing(4) },
  section: { marginBottom: spacing(5) },
  sectionTitle: {
    color: colors.textDim,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing(3),
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { width: TILE, alignItems: 'center' },
  thumbWrap: {
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrapActive: { borderColor: colors.accent },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.md },
  check: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgElev,
  },
  checkText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  tileLabel: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 12, marginTop: spacing(2), textAlign: 'center' },
  tileLabelActive: { color: colors.text },
  footer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing(2) },
});
