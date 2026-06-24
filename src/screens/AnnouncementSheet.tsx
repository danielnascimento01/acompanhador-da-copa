import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useStore } from '../lib/store';
import { openSuggestion } from '../lib/links';
import { colors, fonts, gradients, radius, spacing } from '../lib/theme';

/**
 * Popup de novidade — aparece UMA vez para quem já usava o app, anunciando os
 * avisos de gol e convidando a mandar sugestões. Controlado pelo store
 * (announceVisible / dismissAnnounce).
 */
export function AnnouncementSheet() {
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
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>⚽ NOVIDADE</Text>
          </LinearGradient>

          <Text style={styles.title}>Avisos de gol ao vivo</Text>

          <Text style={styles.body}>
            Agora o app te avisa na hora que sai gol — <Text style={styles.bold}>mesmo fechado!</Text>{' '}
            Por padrão, você recebe os gols das suas seleções e da sua favorita.
          </Text>
          <Text style={styles.body}>
            Dá para ajustar em <Text style={styles.bold}>Avisos</Text>, ou seguir um jogo específico
            tocando no 🔔 dentro do jogo.
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(6),
  },
  card: {
    width: '100%',
    backgroundColor: colors.bgElev,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(6),
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    marginBottom: spacing(3),
  },
  badgeText: { color: colors.ink, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.5 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.3, marginBottom: spacing(3) },
  body: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginBottom: spacing(3) },
  bold: { color: colors.text, fontFamily: fonts.bold },
  feedbackBox: {
    backgroundColor: 'rgba(20,224,138,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(20,224,138,0.25)',
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  feedback: { color: colors.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing(4),
    alignItems: 'center',
  },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  ghostBtn: { paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(1) },
  ghostText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 15 },
});
