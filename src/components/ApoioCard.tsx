import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../lib/store';
import { isBillingAvailable, fetchApoioProduct, purchaseApoio, restoreApoio } from '../lib/billing';
import { colors, fonts, radius, spacing } from '../lib/theme';

/**
 * Card "Apoie o projeto" — tip jar opcional. É APOIO, não paywall: nada do app
 * depende disso. Some quando o IAP não está disponível (Expo Go/web) e vira tela
 * de agradecimento depois que o usuário apoia.
 */
export function ApoioCard() {
  const { settings, grantSupporter } = useStore();
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isBillingAvailable() || settings.supporter) return;
    let alive = true;
    fetchApoioProduct().then((p) => {
      if (alive && p) setPrice(p.price);
    });
    return () => {
      alive = false;
    };
  }, [settings.supporter]);

  if (!isBillingAvailable()) return null;

  if (settings.supporter) {
    return (
      <View style={[styles.card, styles.thanksCard]}>
        <Text style={styles.thanksTitle}>💚 Você apoia o projeto!</Text>
        <Text style={styles.cardText}>
          Muito obrigado de verdade. O app continua grátis e sem propaganda no meio da tabela graças a quem,
          como você, decide retribuir.
        </Text>
      </View>
    );
  }

  const onBuy = async () => {
    setBusy(true);
    try {
      await purchaseApoio();
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      if (await restoreApoio()) grantSupporter();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, styles.apoioCard]}>
      <Text style={styles.cardTitle}>💚 Apoie o projeto</Text>
      <Text style={styles.cardText}>
        O Acompanhador é feito por uma pessoa só, sem propaganda atrapalhando. Se ele te ajuda a viver a Copa,
        você pode retribuir — uma vez só, opcional, e tudo no app continua liberado do mesmo jeito.
      </Text>
      <Pressable
        style={[styles.cta, busy && styles.ctaBusy]}
        onPress={onBuy}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Apoiar o projeto"
      >
        {busy ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={styles.ctaText}>{price ? `APOIAR · ${price}` : 'APOIAR O PROJETO'}</Text>
        )}
      </Pressable>
      <Pressable
        onPress={onRestore}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Já apoiei, restaurar compra"
        hitSlop={6}
      >
        <Text style={styles.restoreLink}>Já apoiei — restaurar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginTop: spacing(4),
    marginBottom: spacing(3),
  },
  apoioCard: { borderColor: colors.accentDeep },
  thanksCard: { borderColor: colors.accent, backgroundColor: 'rgba(20,224,138,0.08)' },
  cardTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  thanksTitle: { color: colors.accent, fontFamily: fonts.bold, fontSize: 17 },
  cardText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 4, lineHeight: 20 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing(4),
    alignItems: 'center',
    marginTop: spacing(4),
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  restoreLink: {
    color: colors.textDim,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing(3),
    textDecorationLine: 'underline',
  },
});
