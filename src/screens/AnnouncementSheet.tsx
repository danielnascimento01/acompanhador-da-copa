import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useStore } from '../lib/store';
import { openSuggestion } from '../lib/links';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';

/**
 * Popup de novidade — aparece UMA vez para quem já usava o app, anunciando os
 * avisos de gol e convidando a mandar sugestões. Controlado pelo store
 * (announceVisible / dismissAnnounce).
 */
export function AnnouncementSheet() {
  const styles = useThemedStyles(makeStyles);
  const { g } = useTheme();
  const { announceVisible, dismissAnnounce } = useStore();

  const onSuggestion = () => {
    dismissAnnounce();
    openSuggestion();
  };

  return (
    <Modal visible={announceVisible} animationType="fade" transparent onRequestClose={dismissAnnounce}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <LinearGradient
            colors={g.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>🔔 NOVIDADES</Text>
          </LinearGradient>

          <Text style={styles.title}>Avisos de gol e fim de jogo</Text>

          <View style={styles.featRow}>
            <Text style={styles.featIcon}>⚽</Text>
            <Text style={styles.featText}>
              <Text style={styles.bold}>Gol ao vivo</Text> — te avisamos na hora que sai gol,{' '}
              <Text style={styles.bold}>mesmo com o app fechado</Text>.
            </Text>
          </View>
          <View style={styles.featRow}>
            <Text style={styles.featIcon}>🏁</Text>
            <Text style={styles.featText}>
              <Text style={styles.bold}>Fim de jogo (novo!)</Text> — o placar final assim que o juiz apita.
              Ex.: “🇧🇷 Brasil 1 x 0 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escócia”.
            </Text>
          </View>

          <Text style={styles.body}>
            Escolha em <Text style={styles.bold}>Avisos</Text>: só as suas seleções ou todos os jogos —
            você no controle. Dá para seguir um jogo específico tocando no 🔔 dentro do jogo.
          </Text>

          <View style={styles.feedbackBox}>
            <Text style={styles.feedback}>
              Está curtindo o app? Conta pra gente! Sua opinião e suas ideias ajudam demais a melhorar. 💚
            </Text>
          </View>

          <Pressable
            style={styles.primaryBtn}
            onPress={onSuggestion}
            accessibilityRole="button"
            accessibilityLabel="Enviar sugestão ou opinião"
          >
            <Text style={styles.primaryText}>Enviar opinião / sugestão</Text>
          </Pressable>
          <Pressable
            style={styles.ghostBtn}
            onPress={dismissAnnounce}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Text style={styles.ghostText}>Boa, entendi!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ c, st }: ThemeTokens) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(6),
  },
  card: {
    width: '100%',
    backgroundColor: c.bgElev,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing(6),
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    marginBottom: spacing(3),
  },
  badgeText: { color: c.ink, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.5 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.3, marginBottom: spacing(3) },
  body: { color: c.textDim, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginBottom: spacing(3) },
  bold: { color: c.text, fontFamily: fonts.bold },
  featRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3), marginBottom: spacing(3) },
  featIcon: { fontSize: 22, lineHeight: 24 },
  featText: { flex: 1, color: c.textDim, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21 },
  feedbackBox: {
    backgroundColor: st.favoriteBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: st.favoriteBorder,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  feedback: { color: c.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: c.accent,
    borderRadius: radius.md,
    paddingVertical: spacing(4),
    alignItems: 'center',
  },
  primaryText: { color: c.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  ghostBtn: { paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(1) },
  ghostText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 15 },
});
