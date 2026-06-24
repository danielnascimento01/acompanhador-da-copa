/**
 * IAP "Apoie o projeto" — tip jar NÃO-CONSUMÍVEL (compra única, vale pra sempre).
 *
 * Princípios:
 * - É APOIO, não paywall: nada do app fica bloqueado. `settings.supporter` é só
 *   gratidão cosmética (selo + tela de obrigado). NUNCA gateia função.
 * - Fonte da verdade da posse é a LOJA (getAvailablePurchases), não o disco —
 *   `restoreApoio()` reconcilia no boot e sobrevive a reinstalação (Apple 2.3.1).
 * - Tudo em try/catch + require preguiçoso: se o módulo nativo não existir
 *   (Expo Go, web, build sem o plugin), vira no-op gracioso e o card some — o app
 *   continua 100% funcional.
 */

export const APOIO_SKU = 'copa_apoio';

type IapModule = typeof import('expo-iap');

// require preguiçoso: a ausência do módulo nativo não pode derrubar o bundle.
let iap: IapModule | null = null;
try {
  iap = require('expo-iap') as IapModule;
} catch {
  iap = null;
}

let purchaseSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;
let connected = false;

export type ApoioProduct = { id: string; price: string; title: string };

/** Há suporte a IAP neste runtime? (false em Expo Go/web). */
export function isBillingAvailable(): boolean {
  return iap != null;
}

/** Esta compra/posse é do SKU de apoio? (cobre os formatos de id do expo-iap). */
function isApoioPurchase(p: unknown): boolean {
  const obj = p as { ids?: string[]; id?: string; productId?: string };
  const ids = obj.ids ?? (obj.id ? [obj.id] : []);
  return ids.includes(APOIO_SKU) || obj.productId === APOIO_SKU;
}

/**
 * Inicia a conexão com a loja e registra os listeners de compra.
 * `onApoiado` é chamado quando uma compra do SKU de apoio é confirmada.
 * Idempotente: re-registrar não duplica listeners.
 */
export async function initBilling(onApoiado: () => void): Promise<void> {
  if (!iap) return;
  try {
    if (!connected) connected = await iap.initConnection();

    // Remove listeners antigos antes de re-registrar (idempotência).
    purchaseSub?.remove();
    errorSub?.remove();

    purchaseSub = iap.purchaseUpdatedListener(async (purchase) => {
      if (!iap || !isApoioPurchase(purchase)) return;
      try {
        // Não-consumível: isConsumable=false → a loja guarda a posse pra sempre.
        await iap.finishTransaction({ purchase, isConsumable: false });
      } catch {
        // Mesmo se finalizar falhar, a posse persiste na loja; concede mesmo assim.
      }
      onApoiado();
    });

    errorSub = iap.purchaseErrorListener(() => {
      // Cancelamento/erro do usuário: silencioso (a UI sai do estado "processando").
    });
  } catch {
    // Loja indisponível agora — segue como no-op.
  }
}

/** Busca o produto de apoio (preço localizado pela loja). null se indisponível. */
export async function fetchApoioProduct(): Promise<ApoioProduct | null> {
  if (!iap) return null;
  try {
    const products = await iap.fetchProducts({ skus: [APOIO_SKU], type: 'in-app' });
    const list = (Array.isArray(products) ? products : []) as Array<{
      id: string;
      displayPrice?: string;
      title?: string;
    }>;
    const p = list.find((x) => x.id === APOIO_SKU);
    if (!p) return null;
    return { id: p.id, price: p.displayPrice ?? '', title: p.title ?? 'Apoiar o projeto' };
  } catch {
    return null;
  }
}

/** Dispara o fluxo de compra nativo. O grant chega pelo listener (initBilling). */
export async function purchaseApoio(): Promise<void> {
  if (!iap) return;
  try {
    await iap.requestPurchase({
      request: {
        apple: { sku: APOIO_SKU },
        google: { skus: [APOIO_SKU] },
      },
      type: 'in-app',
    });
  } catch {
    // Cancelado/erro é tratado pelo purchaseErrorListener.
  }
}

/**
 * Restaura compras: retorna true se o usuário JÁ apoiou (posse encontrada na
 * loja). Fonte da verdade de persistência — chamada no boot e no botão
 * "Restaurar compra".
 */
export async function restoreApoio(): Promise<boolean> {
  if (!iap) return false;
  try {
    const purchases = await iap.getAvailablePurchases();
    return (purchases ?? []).some(isApoioPurchase);
  } catch {
    return false;
  }
}

/** Encerra a conexão e remove listeners (cleanup no unmount do provider). */
export async function endBilling(): Promise<void> {
  purchaseSub?.remove();
  errorSub?.remove();
  purchaseSub = null;
  errorSub = null;
  if (iap && connected) {
    try {
      await iap.endConnection();
    } catch {
      // ignore
    }
    connected = false;
  }
}
