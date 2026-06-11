/**
 * Casas de apostas parceiras (afiliação). MVP com bet365 + Betano.
 *
 * ⚠️ `affiliateUrlTemplate` são PLACEHOLDERS. Trocar pelos links REAIS de afiliado
 * (do painel de cada casa), mantendo o marcador `{subid}` onde entra o seu sub-id de
 * rastreio (ex.: bet365 usa `affiliate`/`btag`; Betano usa `btag`). Só promover casas
 * LICENCIADAS pela SPA (.bet.br).
 */
export type Bookmaker = {
  id: string;
  name: string;
  /** Cor de acento da marca (usada num detalhe visual discreto). */
  color: string;
  /** URL de afiliado com o marcador {subid}. PLACEHOLDER até ter o link real. */
  affiliateUrlTemplate: string;
};

export const BOOKMAKERS: Bookmaker[] = [
  {
    id: 'bet365',
    name: 'bet365',
    color: '#14854f',
    affiliateUrlTemplate: 'https://www.bet365.bet.br/?affiliate={subid}', // TODO: link real
  },
  {
    id: 'betano',
    name: 'Betano',
    color: '#ff6a13',
    affiliateUrlTemplate: 'https://www.betano.bet.br/?btag={subid}', // TODO: link real
  },
];
