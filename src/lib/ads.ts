/**
 * AdMob — config central dos anúncios (só banner + premiado opt-in; NUNCA intersticial).
 *
 * CARREGAMENTO OPCIONAL: o módulo nativo (`react-native-google-mobile-ads`) é
 * carregado com proteção (require em try/catch). Assim o mesmo bundle roda por OTA
 * num binário SEM o módulo (ex.: 1.3.0) — aí os anúncios simplesmente não aparecem,
 * sem quebrar o app. No build nativo (1.3.1+), tudo ativa.
 *
 * Em __DEV__ usa unidades de TESTE; em produção usa os IDs reais abaixo.
 * Filtro de bets: feito no console do AdMob (Controles de bloqueio) + maxAdContentRating PG.
 */
import { Platform } from 'react-native';

// ⚠️ LIGAR (true) SÓ no build nativo 1.3.1 (junto com a versão 1.3.1 no app.json).
// Em OTA no binário 1.3.0 fica false → o módulo nativo do AdMob NUNCA é carregado,
// garantindo que a OTA não quebra o app antigo. (Banner/premiado só aparecem com o build.)
export const ADS_ENABLED = true;

const REAL_BANNER = { ios: 'ca-app-pub-3514963763580625/9773109893', android: 'ca-app-pub-3514963763580625/3736360755' };
const REAL_REWARDED = { ios: 'ca-app-pub-3514963763580625/1459084142', android: 'ca-app-pub-3514963763580625/5929233655' };
const realBanner = (Platform.OS === 'ios' ? REAL_BANNER.ios : REAL_BANNER.android) || '';
const realRewarded = (Platform.OS === 'ios' ? REAL_REWARDED.ios : REAL_REWARDED.android) || '';

// Módulo nativo carregado só se existir. Em OTA no binário antigo → null → no-op.
let _mod: any; let _tried = false;
function adsMod(): any {
  if (!_tried) {
    _tried = true;
    try { _mod = require('react-native-google-mobile-ads'); } catch { _mod = null; }
  }
  return _mod;
}

/** Componentes de banner do módulo (ou null se indisponível). Usado pelo AdBanner. */
export function bannerComponent(): { BannerAd: any; BannerAdSize: any } | null {
  const m = adsMod();
  return m ? { BannerAd: m.BannerAd, BannerAdSize: m.BannerAdSize } : null;
}

/** Unidade de banner: teste em dev; real em produção (vazio/sem módulo → null). */
export function bannerUnitId(): string | null {
  if (!ADS_ENABLED) return null;
  const m = adsMod();
  if (!m) return null;
  if (__DEV__) return m.TestIds.ADAPTIVE_BANNER;
  return realBanner || null;
}

function rewardedUnitId(): string | null {
  if (!ADS_ENABLED) return null;
  const m = adsMod();
  if (!m) return null;
  if (__DEV__) return m.TestIds.REWARDED;
  return realRewarded || null;
}

/** O premiado (rewarded) está disponível? (oculta o botão se não). */
export const rewardedAvailable = (): boolean => rewardedUnitId() !== null;

let attGranted = false;
export const requestNonPersonalizedAdsOnly = (): boolean => !attGranted;

let initialized = false;
/** Inicializa o SDK uma vez (no boot). Pede ATT no iOS. No-op sem módulo. Nunca lança. */
export async function initAds(): Promise<void> {
  if (!ADS_ENABLED || initialized) return;
  const m = adsMod();
  if (!m) return;
  initialized = true;
  try {
    if (Platform.OS === 'ios') {
      try {
        const att = require('expo-tracking-transparency');
        const cur = await att.getTrackingPermissionsAsync();
        const status = cur.status === 'undetermined' ? (await att.requestTrackingPermissionsAsync()).status : cur.status;
        attGranted = status === 'granted';
      } catch { /* sem ATT disponível */ }
    }
    await m.default().setRequestConfiguration({
      maxAdContentRating: m.MaxAdContentRating.PG, // bets bloqueadas no console
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await m.default().initialize();
  } catch { /* anúncios nunca podem quebrar o app */ }
}

/**
 * Mostra um anúncio premiado. Concede recompensa em 'earned' e em 'unavailable'
 * (não punir quem escolheu assistir e o anúncio não carregou); 'dismissed' = fechou
 * antes → sem recompensa.
 */
export async function showRewarded(): Promise<'earned' | 'dismissed' | 'unavailable'> {
  if (!ADS_ENABLED) return 'unavailable';
  const unitId = rewardedUnitId();
  const m = adsMod();
  if (!unitId || !m) return 'unavailable';
  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    const ad = m.RewardedAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: requestNonPersonalizedAdsOnly() });
    const subs: Array<() => void> = [];
    const finish = (r: 'earned' | 'dismissed' | 'unavailable') => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subs.forEach((u) => { try { u(); } catch { /* ignore */ } });
      resolve(r);
    };
    const timeout = setTimeout(() => finish('unavailable'), 12000);
    subs.push(ad.addAdEventListener(m.RewardedAdEventType.LOADED, () => {
      try { ad.show().catch(() => finish('unavailable')); } catch { finish('unavailable'); } // show() pode lançar síncrono
    }));
    subs.push(ad.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
    subs.push(ad.addAdEventListener(m.AdEventType.CLOSED, () => finish(earned ? 'earned' : 'dismissed')));
    subs.push(ad.addAdEventListener(m.AdEventType.ERROR, () => finish('unavailable')));
    try { ad.load(); } catch { finish('unavailable'); }
  });
}
