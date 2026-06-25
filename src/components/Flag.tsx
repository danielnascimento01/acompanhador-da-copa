import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { teamFlag } from '../data/teams';
import { colors } from '../lib/theme';

/**
 * Avatar de bandeira — quadrado arredondado (estilo "Elevação 2026").
 * FASE 1: usa o emoji da bandeira dentro do contêiner. FASE 2: trocar o miolo
 * por <Image> das bandeiras reais sem mudar a API (size/teamId) — as telas não
 * precisam mudar. Ver docs/design-system-2026.md.
 */
export function Flag({ teamId, size = 40, radius }: { teamId: string; size?: number; radius?: number }) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius ?? Math.round(size * 0.3) },
      ]}
    >
      <Text style={{ fontSize: Math.round(size * 0.66) }} allowFontScaling={false}>
        {teamFlag(teamId)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
