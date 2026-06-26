/**
 * AdMob — configuração central e leve dos anúncios (só banner; NUNCA intersticial).
 *
 * IMPORTANTE (precisa de BUILD NATIVO — não vai por OTA):
 *  1. Trocar os App IDs de TESTE no app.json (androidAppId/iosAppId) pelos REAIS
 *     do AdMob (formato ca-app-pub-3514963763580625~XXXXXXXXXX).
 *  2. Preencher REAL_BANNER abaixo com os IDs dos blocos de banner (formato
 *     ca-app-pub-3514963763580625/XXXXXXXXXX), um por plataforma.
 *  3. No console do AdMob → Controles de bloqueio → BLOQUEAR "Apostas e jogos de
 *     azar" (o filtro de bets é feito lá; aqui só limitamos a classificação).
 *
 * Em desenvolvimento (__DEV__) sempre usa unidades de TESTE do Google (anúncios
 * de teste), pra validar o layout sem violar política. Em produção usa os reais;
 * se estiverem vazios, o banner simplesmente não aparece (nunca quebra o app).
 */
import { Platform } from 'react-native';
import mobileAds, { MaxAdContentRating, TestIds } from 'react-native-google-mobile-ads';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

/** Liga/desliga geral dos anúncios. */
export const ADS_ENABLED = true;

// === IDs REAIS DOS BLOCOS DE BANNER (preencher antes do build de produção) ===
const REAL_BANNER: { ios: string; android: string } = {
  ios: '',     // TODO: ca-app-pub-3514963763580625/XXXXXXXXXX  (banner iOS)
  android: '', // TODO: ca-app-pub-3514963763580625/XXXXXXXXXX  (banner Android)
};

const realBanner = (Platform.OS === 'ios' ? REAL_BANNER.ios : REAL_BANNER.android) || '';

/** Unidade de banner a usar: teste em dev; real em produção (vazio → sem anúncio). */
export function bannerUnitId(): string | null {
  if (!ADS_ENABLED) return null;
  if (__DEV__) return TestIds.ADAPTIVE_BANNER;
  return realBanner || null;
}

// Anúncios não-personalizados por padrão (privacidade). Vira personalizado só se
// o usuário autorizar o rastreamento (ATT) no iOS.
let attGranted = false;
export const requestNonPersonalizedAdsOnly = (): boolean => !attGranted;

let initialized = false;

/** Inicializa o SDK uma vez (no boot). Pede ATT no iOS antes. Nunca lança. */
export async function initAds(): Promise<void> {
  if (!ADS_ENABLED || initialized) return;
  initialized = true;
  try {
    if (Platform.OS === 'ios') {
      const current = await getTrackingPermissionsAsync();
      const status = current.status === 'undetermined'
        ? (await requestTrackingPermissionsAsync()).status
        : current.status;
      attGranted = status === 'granted';
    }
    await mobileAds().setRequestConfiguration({
      // Sem conteúdo adulto. (Apostas/bets são bloqueadas no console do AdMob.)
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
  } catch {
    /* anúncios nunca podem quebrar o app */
  }
}
