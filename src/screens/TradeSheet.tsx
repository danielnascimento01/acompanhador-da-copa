import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useStore } from '../lib/store';
import { duplicateCodes, missingCodes } from '../data/stickers';
import {
  buildTradeText,
  computeMatches,
  exportCollection,
  importCollection,
  parseTradeText,
  type TradeMatch,
} from '../lib/albumTrade';
import { colors, fonts, radius, spacing } from '../lib/theme';

export function TradeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { album, replaceAlbum } = useStore();

  const dupCount = useMemo(() => new Set(duplicateCodes(album)).size, [album]);
  const missCount = useMemo(() => missingCodes(album).length, [album]);

  const [friendText, setFriendText] = useState('');
  const [match, setMatch] = useState<TradeMatch | null>(null);
  const [restoreText, setRestoreText] = useState('');

  const shareText = (message: string) => Share.share({ message }).catch(() => {});

  const handleSeeMatches = () => {
    const parsed = parseTradeText(friendText);
    if (parsed.duplicates.length === 0 && parsed.missing.length === 0) {
      Alert.alert('Não entendi a lista', 'Cole o texto de troca que seu amigo compartilhou pelo app.');
      return;
    }
    setMatch(computeMatches(album, parsed));
  };

  const handleRestore = () => {
    const col = importCollection(restoreText);
    if (!col) {
      Alert.alert('Código inválido', 'Cole um código de backup gerado pelo app (começa com ACB1).');
      return;
    }
    const n = Object.keys(col).length;
    Alert.alert(
      'Restaurar coleção?',
      `Isso substitui a sua coleção atual por ${n} figurinha(s) do backup.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            replaceAlbum(col);
            setRestoreText('');
            Alert.alert('Pronto!', 'Sua coleção foi restaurada.');
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>TROCAR FIGURINHAS</Text>
            <Text style={styles.subtitle}>
              Você tem {dupCount} repetida(s) e precisa de {missCount}. Tudo de graça, sem login.
            </Text>

            {/* 1. Compartilhar minha troca */}
            <Text style={styles.sectionLabel}>1 · Compartilhe a sua lista</Text>
            <Pressable style={styles.primaryBtn} onPress={() => shareText(buildTradeText(album))} accessibilityRole="button" accessibilityLabel="Compartilhar minha troca">
              <Text style={styles.primaryText}>📤  Compartilhar minha troca</Text>
            </Pressable>
            <View style={styles.miniRow}>
              <Pressable style={styles.miniBtn} onPress={() => shareText(`Repetidas: ${[...new Set(duplicateCodes(album))].join(', ') || '—'}`)}>
                <Text style={styles.miniText}>Copiar repetidas</Text>
              </Pressable>
              <Pressable style={styles.miniBtn} onPress={() => shareText(`Faltam: ${missingCodes(album).join(', ') || '—'}`)}>
                <Text style={styles.miniText}>Copiar faltantes</Text>
              </Pressable>
            </View>

            {/* 2. Ver matches com um amigo */}
            <Text style={styles.sectionLabel}>2 · Veja as trocas com um amigo</Text>
            <TextInput
              value={friendText}
              onChangeText={setFriendText}
              placeholder="Cole aqui a lista de troca que o seu amigo enviou…"
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.textArea}
              accessibilityLabel="Lista de troca do amigo"
            />
            <Pressable style={styles.secondaryBtn} onPress={handleSeeMatches} accessibilityRole="button" accessibilityLabel="Ver trocas">
              <Text style={styles.secondaryText}>🔁  Ver trocas possíveis</Text>
            </Pressable>

            {match && (
              <View style={styles.matchBox}>
                <MatchList title="🎁 Você dá" subtitle="suas repetidas que ele precisa" codes={match.iGive} color={colors.accent} />
                <MatchList title="📥 Você recebe" subtitle="repetidas dele que você precisa" codes={match.iReceive} color={colors.teal} />
              </View>
            )}

            {/* 3. Backup */}
            <Text style={styles.sectionLabel}>3 · Backup da coleção</Text>
            <Pressable style={styles.secondaryBtn} onPress={() => shareText(exportCollection(album))} accessibilityRole="button" accessibilityLabel="Copiar código de backup">
              <Text style={styles.secondaryText}>💾  Gerar código de backup</Text>
            </Pressable>
            <TextInput
              value={restoreText}
              onChangeText={setRestoreText}
              placeholder="Cole um código de backup (ACB1…) para restaurar"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.restoreInput}
              accessibilityLabel="Código de backup para restaurar"
            />
            <Pressable style={styles.ghostBtn} onPress={handleRestore} accessibilityRole="button" accessibilityLabel="Restaurar backup">
              <Text style={styles.ghostText}>Restaurar coleção</Text>
            </Pressable>

            <Text style={styles.footer}>App não oficial · sem vínculo com a FIFA/Panini</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MatchList({ title, subtitle, codes, color }: { title: string; subtitle: string; codes: string[]; color: string }) {
  return (
    <View style={styles.matchColumn}>
      <Text style={[styles.matchTitle, { color }]}>{title} · {codes.length}</Text>
      <Text style={styles.matchSub}>{subtitle}</Text>
      {codes.length === 0 ? (
        <Text style={styles.matchEmpty}>Nenhuma dessa vez.</Text>
      ) : (
        <View style={styles.chips}>
          {codes.map((c) => (
            <View key={c} style={[styles.chip, { borderColor: color }]}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    paddingBottom: spacing(4),
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  closeBtn: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 1 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  scroll: { paddingBottom: spacing(8) },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.5 },
  subtitle: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 4, marginBottom: spacing(4), lineHeight: 20 },

  sectionLabel: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing(5), marginBottom: spacing(2) },

  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center' },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  miniRow: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) },
  miniBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing(3), alignItems: 'center' },
  miniText: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13 },

  textArea: {
    minHeight: 84,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  secondaryBtn: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(2) },
  secondaryText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },

  matchBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(4), marginTop: spacing(3), gap: spacing(4) },
  matchColumn: {},
  matchTitle: { fontFamily: fonts.bold, fontSize: 16 },
  matchSub: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, marginTop: 1, marginBottom: spacing(2) },
  matchEmpty: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  chip: { paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radius.sm, borderWidth: 1, backgroundColor: colors.surface2 },
  chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },

  restoreInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(3),
    height: 48,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: spacing(2),
  },
  ghostBtn: { paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(1) },
  ghostText: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 14, textDecorationLine: 'underline' },

  footer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing(6) },
});
