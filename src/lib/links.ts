import { Linking } from 'react-native';

/** Links do projeto. Trocar aqui se mudar canal de contato/apoio. */
export const LINKS = {
  kofi: 'https://ko-fi.com/acompanhadordacopa',
  // Sem e-mail configurado: o botão de sugestão abre o Ko-fi (tem mensagem).
  contactEmail: '',
};

const APP_NAME = 'Acompanhador da Copa';

export async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // Sem app para abrir o link — silenciosamente ignora.
  }
}

export function openKofi() {
  return openUrl(LINKS.kofi);
}

/**
 * Abre o app de e-mail com assunto pré-preenchido para sugestões.
 * Se nenhum e-mail estiver configurado, cai no Ko-fi (tem caixa de mensagem).
 */
export function openSuggestion() {
  if (!LINKS.contactEmail) return openKofi();
  const subject = encodeURIComponent(`Sugestão — ${APP_NAME}`);
  const body = encodeURIComponent('Minha sugestão / feedback:\n\n');
  return openUrl(`mailto:${LINKS.contactEmail}?subject=${subject}&body=${body}`);
}
