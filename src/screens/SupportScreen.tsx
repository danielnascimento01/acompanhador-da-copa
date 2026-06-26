import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FadeInUp } from '../components/Motion';
import { LINKS, openPrivacy, openSuggestion } from '../lib/links';
import { fonts, radius, spacing, elevation } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';

export function SupportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { g } = useTheme();
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
              colors={g.amber}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconBadge, elevation(2)]}
            >
              <Text style={styles.iconEmoji}>💬</Text>
            </LinearGradient>

            <Text style={styles.title}>CURTINDO O APP?</Text>
            <Text style={styles.body}>
              Este é um projeto independente, feito com carinho pra você não perder nenhum jogo das
              suas seleções. Tem uma ideia ou achou algum problema? Manda pra gente — sua opinião
              ajuda a melhorar o app.
            </Text>

            <Pressable
              onPress={openSuggestion}
              accessibilityRole="button"
              accessibilityLabel="Enviar uma sugestão"
              style={({ pressed }) => pressed && styles.pressed}
            >
              <LinearGradient
                colors={g.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, elevation(1)]}
              >
                <Text style={styles.primaryText}>💬  ENVIAR UMA SUGESTÃO</Text>
              </LinearGradient>
            </Pressable>

            {LINKS.privacy ? (
              <Pressable onPress={openPrivacy} accessibilityRole="link" accessibilityLabel="Política de privacidade">
                <Text style={styles.privacyLink}>Política de privacidade</Text>
              </Pressable>
            ) : null}

            <Text style={styles.footer}>App não oficial · sem vínculo com entidades ou competições oficiais</Text>
          </FadeInUp>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: c.bgElev,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing(6),
    paddingTop: spacing(3),
    paddingBottom: spacing(10),
    alignItems: 'center',
  },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, marginBottom: spacing(4) },
  closeBtn: { position: 'absolute', top: spacing(4), right: spacing(5) },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
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
  title: { color: c.text, fontFamily: fonts.display, fontSize: 28, textAlign: 'center', letterSpacing: 0.5 },
  body: {
    color: c.textDim,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing(3),
    marginBottom: spacing(6),
  },
  primaryBtn: { borderRadius: radius.lg, paddingVertical: spacing(4), alignItems: 'center' },
  primaryText: { color: c.ink, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },
  secondaryBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing(4),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: c.border,
    marginTop: spacing(3),
  },
  secondaryText: { color: c.text, fontFamily: fonts.bold, fontSize: 15 },
  privacyLink: { color: c.textDim, fontFamily: fonts.semibold, fontSize: 13, textAlign: 'center', marginTop: spacing(5), textDecorationLine: 'underline' },
  footer: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing(3) },
  pressed: { opacity: 0.8 },
});
