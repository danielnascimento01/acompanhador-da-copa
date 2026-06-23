import { Linking } from 'react-native';

/** Links do projeto. Trocar aqui se mudar canal de contato/suporte. */
export const LINKS = {
  // Página de ajuda/suporte (GitHub Pages, pasta /docs). É também a Support URL nas lojas.
  support: 'https://danielnascimento01.github.io/acompanhador-da-copa/suporte.html',
  // Política hospedada via GitHub Pages (pasta /docs do repo).
  privacy: 'https://danielnascimento01.github.io/acompanhador-da-copa/privacy-policy.html',
  // E-mail de contato opcional: se preenchido, "Enviar sugestão" abre o e-mail;
  // caso contrário, abre a página de suporte (que tem FAQ + contato).
  contactEmail: 'nascimento.daniel00@gmail.com',
};

const APP_NAME = 'Acompanhador da Copa';

export async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // Sem app para abrir o link — silenciosamente ignora.
  }
}

export function openSupport() {
  return openUrl(LINKS.support);
}

export function openPrivacy() {
  if (LINKS.privacy) return openUrl(LINKS.privacy);
}

/**
 * Abre o app de e-mail com assunto pré-preenchido para sugestões.
 * Se nenhum e-mail estiver configurado, abre a página de suporte (FAQ + contato).
 */
export function openSuggestion() {
  if (!LINKS.contactEmail) return openSupport();
  const subject = encodeURIComponent(`Sugestão — ${APP_NAME}`);
  const body = encodeURIComponent('Minha sugestão / feedback:\n\n');
  return openUrl(`mailto:${LINKS.contactEmail}?subject=${subject}&body=${body}`);
}
