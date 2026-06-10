import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FadeInUp } from '../components/Motion';
import { LINKS, openKofi, openPrivacy, openSuggestion } from '../lib/links';
import { colors, fonts, gradients, radius, spacing, elevation } from '../lib/theme';

export function SupportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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

          <FadeInUp offset={16}>
            <LinearGradient
              colors={gradients.amber}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconBadge, elevation(2)]}
            >
              <Text style={styles.iconEmoji}>☕</Text>
            </LinearGradient>

            <Text style={styles.title}>CURTINDO O APP?</Text>
            <Text style={styles.body}>
              Este é um projeto independente, feito com carinho pra você não perder nenhum jogo das
              suas seleções. Se ele te ajuda, considere apoiar — ajuda a manter o app de pé e a
              melhorar.
            </Text>

            <Pressable
              onPress={openKofi}
              accessibilityRole="button"
              accessibilityLabel="Apoiar nosso app"
              style={({ pressed }) => pressed && styles.pressed}
            >
              <LinearGradient
                colors={gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, elevation(1)]}
              >
                <Text style={styles.primaryText}>APOIAR NOSSO APP ☕</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={openSuggestion}
              accessibilityRole="button"
              accessibilityLabel="Enviar uma sugestão"
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>💬  Enviar uma sugestão</Text>
            </Pressable>

            {LINKS.privacy ? (
              <Pressable onPress={openPrivacy} accessibilityRole="link" accessibilityLabel="Política de privacidade">
                <Text style={styles.privacyLink}>Política de privacidade</Text>
              </Pressable>
            ) : null}

            <Text style={styles.footer}>App não oficial · sem vínculo com a FIFA</Text>
          </FadeInUp>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(6),
    paddingTop: spacing(3),
    paddingBottom: spacing(10),
    alignItems: 'center',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, marginBottom: spacing(4) },
  closeBtn: { position: 'absolute', top: spacing(4), right: spacing(5) },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing(4),
  },
  iconEmoji: { fontSize: 40 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, textAlign: 'center', letterSpacing: 0.5 },
  body: {
    color: colors.textDim,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing(3),
    marginBottom: spacing(6),
  },
  primaryBtn: { borderRadius: radius.lg, paddingVertical: spacing(4), alignItems: 'center' },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },
  secondaryBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing(4),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing(3),
  },
  secondaryText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  privacyLink: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13, textAlign: 'center', marginTop: spacing(5), textDecorationLine: 'underline' },
  footer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing(3) },
  pressed: { opacity: 0.8 },
});
