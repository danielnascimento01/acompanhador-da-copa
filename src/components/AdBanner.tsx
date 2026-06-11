import React from 'react';
import { View, StyleSheet } from 'react-native';

import { useStore } from '../lib/store';
import { adsAvailable, bannerUnitId } from '../lib/ads';
import { colors, spacing } from '../lib/theme';

/**
 * Banner discreto, ancorado. Só aparece se:
 *  - os ads estão ligados e o módulo nativo existe (não no Expo Go), e
 *  - o usuário NÃO comprou "Remover anúncios".
 * Nunca colocar em cima de tabela/álbum — só em telas de feed.
 */
export function AdBanner() {
  const { settings } = useStore();
  if (settings.adsRemoved || !adsAvailable()) return null;

  // require preguiçoso: importar no topo quebraria no Expo Go (módulo nativo).
  let BannerAd: any;
  let BannerAdSize: any;
  try {
    const m = require('react-native-google-mobile-ads');
    BannerAd = m.BannerAd;
    BannerAdSize = m.BannerAdSize;
  } catch {
    return null;
  }
  if (!BannerAd) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={bannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElev,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing(1),
    minHeight: 50,
  },
});
