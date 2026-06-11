/**
 * Wrapper seguro de IAP (react-native-iap v15 / API Nitro) para o "Remover anúncios".
 *
 * ⚠️ Só dá pra VALIDAR num build com o produto cadastrado nas lojas:
 *   - App Store Connect: IAP não-consumível com Product ID = `remove_ads`.
 *   - Google Play Console: produto in-app (gerenciado) com ID = `remove_ads`.
 * Aqui é tudo no-op gracioso (try/catch + require preguiçoso) — não quebra no Expo Go.
 *
 * Fluxo: purchaseRemoveAds() inicia a compra; o GRANT real chega pelo listener
 * (purchaseUpdated) → chama o callback registrado em setOnAdsRemoved (liga a flag).
 */
export const REMOVE_ADS_SKU = 'remove_ads';

type IapModule = any;

let iap: IapModule | null | undefined;
let onGrant: (() => void) | null = null;
let started = false;

function load(): IapModule | null {
  if (iap !== undefined) return iap;
  try {
    iap = require('react-native-iap');
  } catch {
    iap = null;
  }
  return iap;
}

/** O módulo nativo existe? (false no Expo Go / web) */
export function billingAvailable(): boolean {
  return !!load();
}

/** Registra o que fazer quando a compra/restauração for concedida (ligar `adsRemoved`). */
export function setOnAdsRemoved(cb: () => void) {
  onGrant = cb;
}

/** Abre conexão com a loja e escuta as atualizações de compra. Idempotente, seguro. */
export async function initBilling(): Promise<void> {
  const m = load();
  if (!m || started) return;
  started = true;
  try {
    await m.initConnection();
    m.purchaseUpdatedListener(async (purchase: any) => {
      try {
        if (matchesRemoveAds(purchase)) onGrant?.();
        await m.finishTransaction({ purchase, isConsumable: false });
      } catch {
        // ignora — a flag local já reflete a posse; restaurar resolve depois.
      }
    });
    m.purchaseErrorListener(() => {
      // erro/cancelamento — nada a fazer; a UI mostra o estado.
    });
  } catch {
    // Sem conexão com a loja agora; tenta de novo no próximo init.
  }
}

/** Inicia a compra do "Remover anúncios". Retorna false se indisponível/erro ao abrir o fluxo. */
export async function purchaseRemoveAds(): Promise<boolean> {
  const m = load();
  if (!m) return false;
  try {
    await m.requestPurchase({
      request: {
        apple: { sku: REMOVE_ADS_SKU },
        google: { skus: [REMOVE_ADS_SKU] },
      },
      type: 'in-app',
    });
    return true; // o grant definitivo chega pelo listener
  } catch {
    return false;
  }
}

/** Restaura compras: true se o usuário já possui o "Remover anúncios". */
export async function restorePurchases(): Promise<boolean> {
  const m = load();
  if (!m) return false;
  try {
    const purchases: any[] = (await m.getAvailablePurchases()) ?? [];
    return purchases.some(matchesRemoveAds);
  } catch {
    return false;
  }
}

/** Casa um objeto de compra com o nosso SKU (tolerante aos campos da v15). */
function matchesRemoveAds(p: any): boolean {
  if (!p) return false;
  return (
    p.productId === REMOVE_ADS_SKU ||
    p.id === REMOVE_ADS_SKU ||
    (Array.isArray(p.ids) && p.ids.includes(REMOVE_ADS_SKU))
  );
}
