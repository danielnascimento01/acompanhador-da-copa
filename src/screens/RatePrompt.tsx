import React from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useStore } from '../lib/store';
import { colors, fonts, gradients, radius, spacing } from '../lib/theme';

// Abre a loja certa para avaliar. Android = Play (foco do crescimento BR);
// iOS = App Store já na ação de escrever avaliação.
const PLAY_APP = 'market://details?id=com.danielnascimento.copa2026';
const PLAY_WEB = 'https://play.google.com/store/apps/details?id=com.danielnascimento.copa2026';
const APPSTORE = 'https://apps.apple.com/app/id6779020711?action=write-review';

function openStoreToRate() {
  if (Platform.OS === 'android') {
    Linking.openURL(PLAY_APP).catch(() => Linking.openURL(PLAY_WEB));
  } else {
    Linking.openURL(APPSTORE).catch(() => {});
  }
}

/**
 * Pedido de avaliação — aparece UMA vez, num momento de engajamento (3ª+ abertura),
 * nunca junto do popup de novidade. Avaliações sobem MUITO o ranking nas lojas.
 * Sem dependência nativa nova (abre a loja via Linking) → entregue por OTA.
 */
export function RatePrompt() {
  const { ratePromptVisible, dismissRatePrompt } = useStore();

  const rate = async () => {
    // Prefere o prompt NATIVO de avaliação (expo-store-review, in-app). Carregado
    // com proteção: se o módulo não existir neste binário, cai pra loja via link.
    try {
      const SR = require('expo-store-review');
      if (await SR.isAvailableAsync()) {
        await SR.requestReview();
        dismissRatePrompt();
        return;
      }
    } catch {
      /* segue pro fallback */
    }
    openStoreToRate();
    dismissRatePrompt();
  };

  return (
    <Modal visible={ratePromptVisible} animationType="fade" transparent onRequestClose={dismissRatePrompt}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
            <Text style={styles.badgeText}>💚 SUA OPINIÃO</Text>
          </LinearGradient>

          <Text style={styles.title}>Curtindo o app?</Text>
          <Text style={styles.body}>
            Uma avaliação sua faz o app aparecer pra <Text style={styles.bold}>muito mais</Text> torcedores
            na loja. Leva só 10 segundos. 💚
          </Text>

          <Pressable
            style={styles.primaryBtn}
            onPress={rate}
            accessibilityRole="button"
            accessibilityLabel="Avaliar o app na loja"
          >
            <Text style={styles.primaryText}>Avaliar na loja</Text>
          </Pressable>
          <Pressable
            style={styles.ghostBtn}
            onPress={dismissRatePrompt}
            accessibilityRole="button"
            accessibilityLabel="Agora não"
          >
            <Text style={styles.ghostText}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing(6) },
  card: { width: '100%', backgroundColor: colors.bgElev, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing(6) },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: spacing(1), marginBottom: spacing(3) },
  badgeText: { color: colors.ink, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.5 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.3, marginBottom: spacing(2) },
  body: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginBottom: spacing(5) },
  bold: { color: colors.text, fontFamily: fonts.bold },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center' },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  ghostBtn: { paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(1) },
  ghostText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 15 },
});
