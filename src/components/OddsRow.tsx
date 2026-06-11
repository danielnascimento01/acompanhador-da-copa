import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../lib/store';
import { Match, isFinished } from '../data/fixtures';
import { teamName } from '../data/teams';
import { oddsFor } from '../data/odds';
import { BOOKMAKERS, ODDS_ENABLED, buildAffiliateUrl } from '../lib/odds';
import { openUrl } from '../lib/links';
import { colors, fonts, radius, spacing } from '../lib/theme';

/**
 * Seção de cotações no detalhe do jogo. Contida e discreta — só aparece se o módulo
 * está ligado (kill-switch por canal) e o usuário é 18+. Para quem ainda não
 * respondeu a idade, mostra um age-gate inline. Para menores, não aparece nada.
 */
export function OddsRow({ match }: { match: Match }) {
  const { settings, updateSettings } = useStore();

  // Kill-switch (OFF em produção) ou jogo já encerrado → nada de odds.
  if (!ODDS_ENABLED || isFinished(match)) return null;

  // Age-gate: menor declarado → nada. Ainda não respondeu → pergunta inline.
  if (settings.is18Plus === false) return null;
  if (settings.is18Plus !== true) {
    return (
      <View style={styles.card}>
        <Text style={styles.gateEmoji}>🔞</Text>
        <Text style={styles.gateTitle}>Conteúdo para maiores de 18 anos</Text>
        <Text style={styles.gateText}>Você tem 18 anos ou mais?</Text>
        <View style={styles.gateRow}>
          <Pressable
            style={[styles.gateBtn, styles.gateYes]}
            onPress={() => updateSettings({ is18Plus: true })}
            accessibilityRole="button"
            accessibilityLabel="Sim, tenho 18 anos ou mais"
          >
            <Text style={styles.gateYesText}>Sim, tenho 18+</Text>
          </Pressable>
          <Pressable
            style={styles.gateBtn}
            onPress={() => updateSettings({ is18Plus: false })}
            accessibilityRole="button"
            accessibilityLabel="Não, sou menor de idade"
          >
            <Text style={styles.gateNoText}>Não</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 18+ confirmado → cotações das casas.
  const homeShort = teamName(match.home);
  const awayShort = teamName(match.away);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>📊 Cotações</Text>
        <View style={styles.adTag}>
          <Text style={styles.adTagText}>Publicidade</Text>
        </View>
      </View>

      <View style={styles.colHead}>
        <Text style={styles.colSpacer} />
        <Text style={styles.colLabel} numberOfLines={1}>{homeShort}</Text>
        <Text style={styles.colLabel}>Empate</Text>
        <Text style={styles.colLabel} numberOfLines={1}>{awayShort}</Text>
      </View>

      {BOOKMAKERS.map((b) => {
        const o = oddsFor(match, b.id);
        const open = () => openUrl(buildAffiliateUrl(b, match));
        return (
          <View key={b.id} style={styles.bookRow}>
            <View style={styles.bookName}>
              <View style={[styles.dot, { backgroundColor: b.color }]} />
              <Text style={styles.bookText}>{b.name}</Text>
            </View>
            <OddCell value={o.home} onPress={open} label={`Apostar em ${homeShort} na ${b.name}`} />
            <OddCell value={o.draw} onPress={open} label={`Apostar no empate na ${b.name}`} />
            <OddCell value={o.away} onPress={open} label={`Apostar em ${awayShort} na ${b.name}`} />
          </View>
        );
      })}

      <Text style={styles.disclaimer}>
        Publicidade de parceiros. Cotações ilustrativas. +18 · Jogue com responsabilidade.
      </Text>
    </View>
  );
}

function OddCell({ value, onPress, label }: { value: number; onPress: () => void; label: string }) {
  return (
    <Pressable style={styles.oddCell} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.oddValue}>{value.toFixed(2)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(3) },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  adTag: { backgroundColor: colors.surface2, borderRadius: radius.sm, paddingHorizontal: spacing(2), paddingVertical: 2, borderWidth: 1, borderColor: colors.border },
  adTagText: { color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  colHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing(1) },
  colSpacer: { flex: 1.3 },
  colLabel: { flex: 1, color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 11, textAlign: 'center' },

  bookRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(2), gap: spacing(2) },
  bookName: { flex: 1.3, flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bookText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },

  oddCell: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.sm,
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  oddValue: { color: colors.accent, fontFamily: fonts.bold, fontSize: 15 },

  disclaimer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: spacing(3) },

  // Age-gate
  gateEmoji: { fontSize: 30, textAlign: 'center' },
  gateTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, textAlign: 'center', marginTop: spacing(1) },
  gateText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginTop: 2, marginBottom: spacing(3) },
  gateRow: { flexDirection: 'row', gap: spacing(2) },
  gateBtn: { flex: 1, paddingVertical: spacing(3), borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  gateYes: { backgroundColor: colors.accent, borderColor: colors.accent },
  gateYesText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 14 },
  gateNoText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 14 },
});
