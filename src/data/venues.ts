/**
 * As 16 sedes da Copa do Mundo de 2026 (EUA, México e Canadá) — estático e acurado.
 * Feature OTA-able. Tag opcional pra abertura (Azteca) e final (MetLife).
 */
export type Venue = {
  stadium: string;
  city: string;
  tag?: 'abertura' | 'final';
};

export type HostCountry = {
  country: string;
  flag: string;
  venues: Venue[];
};

export const HOSTS: HostCountry[] = [
  {
    country: 'México',
    flag: '🇲🇽',
    venues: [
      { stadium: 'Estádio Azteca', city: 'Cidade do México', tag: 'abertura' },
      { stadium: 'Estádio Akron', city: 'Guadalajara' },
      { stadium: 'Estádio BBVA', city: 'Monterrey' },
    ],
  },
  {
    country: 'Canadá',
    flag: '🇨🇦',
    venues: [
      { stadium: 'BC Place', city: 'Vancouver' },
      { stadium: 'BMO Field', city: 'Toronto' },
    ],
  },
  {
    country: 'Estados Unidos',
    flag: '🇺🇸',
    venues: [
      { stadium: 'MetLife Stadium', city: 'Nova York / Nova Jersey', tag: 'final' },
      { stadium: 'AT&T Stadium', city: 'Dallas' },
      { stadium: 'Mercedes-Benz Stadium', city: 'Atlanta' },
      { stadium: 'NRG Stadium', city: 'Houston' },
      { stadium: 'Arrowhead Stadium', city: 'Kansas City' },
      { stadium: 'SoFi Stadium', city: 'Los Angeles' },
      { stadium: "Levi's Stadium", city: 'São Francisco (Bay Area)' },
      { stadium: 'Lumen Field', city: 'Seattle' },
      { stadium: 'Gillette Stadium', city: 'Boston' },
      { stadium: 'Lincoln Financial Field', city: 'Filadélfia' },
      { stadium: 'Hard Rock Stadium', city: 'Miami' },
    ],
  },
];

/** Total de estádios (pra resumo no cabeçalho). */
export const TOTAL_VENUES = HOSTS.reduce((n, h) => n + h.venues.length, 0);
