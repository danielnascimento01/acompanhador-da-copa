import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Flag } from './Flag';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';

/**
 * Foto real do jogador via ESPN — usa SÓ o próprio id do atleta (nunca um id
 * "parecido" ou de outra fonte): testamos que páginas da ESPN às vezes embutem o
 * id de OUTRO jogador num widget de "relacionados", então nunca fazemos scraping —
 * só esta URL determinística com o id que a própria ESPN atribui ao gol.
 */
function espnHeadshotUrl(athleteId?: string): string | null {
  return athleteId ? `https://a.espncdn.com/i/headshots/soccer/players/full/${athleteId}.png` : null;
}

/**
 * Avatar de jogador: foto real se a ESPN tiver uma pro id (nem todo jogador tem —
 * cai pra bandeira da seleção, e sem seleção, pro emoji). Nunca mostra foto errada:
 * qualquer falha de carregamento (404, rede) descarta a imagem pro resto da sessão.
 */
export function PlayerAvatar({
  athleteId,
  teamId,
  flag,
  size = 34,
  radius,
}: {
  athleteId?: string;
  teamId?: string;
  flag?: string;
  size?: number;
  radius?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const [failed, setFailed] = useState(false);
  const r = radius ?? Math.round(size * 0.3);
  const url = !failed ? espnHeadshotUrl(athleteId) : null;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.img, { width: size, height: size, borderRadius: r }]}
        onError={() => setFailed(true)}
      />
    );
  }
  if (teamId) return <Flag teamId={teamId} size={size} radius={r} />;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: r }]}>
      <Text style={{ fontSize: Math.round(size * 0.66) }} allowFontScaling={false}>
        {flag ?? '⚽'}
      </Text>
    </View>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  img: { backgroundColor: c.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  wrap: {
    backgroundColor: c.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
