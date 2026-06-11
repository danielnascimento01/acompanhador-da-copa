/**
 * História da Copa do Mundo (estático, sem dependência de rede) — curiosidades,
 * campeões de cada edição e recordes. Feature OTA-able da aba Grupos.
 */
export type Edition = {
  year: number;
  host: string;
  champion: string;
  championFlag: string;
  runnerUp: string;
  score: string;
  topScorer: string; // artilheiro da edição
};

/** Finais de todas as Copas (masculino), 1930–2022. */
export const EDITIONS: Edition[] = [
  { year: 2022, host: 'Catar', champion: 'Argentina', championFlag: '🇦🇷', runnerUp: 'França', score: '3–3 (4–2 pên.)', topScorer: 'Mbappé (8)' },
  { year: 2018, host: 'Rússia', champion: 'França', championFlag: '🇫🇷', runnerUp: 'Croácia', score: '4–2', topScorer: 'Harry Kane (6)' },
  { year: 2014, host: 'Brasil', champion: 'Alemanha', championFlag: '🇩🇪', runnerUp: 'Argentina', score: '1–0', topScorer: 'James Rodríguez (6)' },
  { year: 2010, host: 'África do Sul', champion: 'Espanha', championFlag: '🇪🇸', runnerUp: 'Holanda', score: '1–0', topScorer: 'Müller / Forlán / Villa / Sneijder (5)' },
  { year: 2006, host: 'Alemanha', champion: 'Itália', championFlag: '🇮🇹', runnerUp: 'França', score: '1–1 (5–3 pên.)', topScorer: 'Klose (5)' },
  { year: 2002, host: 'Coreia/Japão', champion: 'Brasil', championFlag: '🇧🇷', runnerUp: 'Alemanha', score: '2–0', topScorer: 'Ronaldo (8)' },
  { year: 1998, host: 'França', champion: 'França', championFlag: '🇫🇷', runnerUp: 'Brasil', score: '3–0', topScorer: 'Davor Šuker (6)' },
  { year: 1994, host: 'Estados Unidos', champion: 'Brasil', championFlag: '🇧🇷', runnerUp: 'Itália', score: '0–0 (3–2 pên.)', topScorer: 'Stoichkov / Salenko (6)' },
  { year: 1990, host: 'Itália', champion: 'Alemanha', championFlag: '🇩🇪', runnerUp: 'Argentina', score: '1–0', topScorer: 'Schillaci (6)' },
  { year: 1986, host: 'México', champion: 'Argentina', championFlag: '🇦🇷', runnerUp: 'Alemanha', score: '3–2', topScorer: 'Gary Lineker (6)' },
  { year: 1982, host: 'Espanha', champion: 'Itália', championFlag: '🇮🇹', runnerUp: 'Alemanha', score: '3–1', topScorer: 'Paolo Rossi (6)' },
  { year: 1978, host: 'Argentina', champion: 'Argentina', championFlag: '🇦🇷', runnerUp: 'Holanda', score: '3–1', topScorer: 'Mario Kempes (6)' },
  { year: 1974, host: 'Alemanha Oc.', champion: 'Alemanha', championFlag: '🇩🇪', runnerUp: 'Holanda', score: '2–1', topScorer: 'Grzegorz Lato (7)' },
  { year: 1970, host: 'México', champion: 'Brasil', championFlag: '🇧🇷', runnerUp: 'Itália', score: '4–1', topScorer: 'Gerd Müller (10)' },
  { year: 1966, host: 'Inglaterra', champion: 'Inglaterra', championFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', runnerUp: 'Alemanha Oc.', score: '4–2', topScorer: 'Eusébio (9)' },
  { year: 1962, host: 'Chile', champion: 'Brasil', championFlag: '🇧🇷', runnerUp: 'Tchecoslováquia', score: '3–1', topScorer: 'Vários (4)' },
  { year: 1958, host: 'Suécia', champion: 'Brasil', championFlag: '🇧🇷', runnerUp: 'Suécia', score: '5–2', topScorer: 'Just Fontaine (13)' },
  { year: 1954, host: 'Suíça', champion: 'Alemanha Oc.', championFlag: '🇩🇪', runnerUp: 'Hungria', score: '3–2', topScorer: 'Sándor Kocsis (11)' },
  { year: 1950, host: 'Brasil', champion: 'Uruguai', championFlag: '🇺🇾', runnerUp: 'Brasil', score: '2–1', topScorer: 'Ademir (8)' },
  { year: 1938, host: 'França', champion: 'Itália', championFlag: '🇮🇹', runnerUp: 'Hungria', score: '4–2', topScorer: 'Leônidas (7)' },
  { year: 1934, host: 'Itália', champion: 'Itália', championFlag: '🇮🇹', runnerUp: 'Tchecoslováquia', score: '2–1', topScorer: 'Nejedlý (5)' },
  { year: 1930, host: 'Uruguai', champion: 'Uruguai', championFlag: '🇺🇾', runnerUp: 'Argentina', score: '4–2', topScorer: 'Stábile (8)' },
];

/** Ranking de títulos por seleção. */
export const TITLES: { team: string; flag: string; titles: number; years: string }[] = [
  { team: 'Brasil', flag: '🇧🇷', titles: 5, years: '1958, 62, 70, 94, 2002' },
  { team: 'Alemanha', flag: '🇩🇪', titles: 4, years: '1954, 74, 90, 2014' },
  { team: 'Itália', flag: '🇮🇹', titles: 4, years: '1934, 38, 82, 2006' },
  { team: 'Argentina', flag: '🇦🇷', titles: 3, years: '1978, 86, 2022' },
  { team: 'França', flag: '🇫🇷', titles: 2, years: '1998, 2018' },
  { team: 'Uruguai', flag: '🇺🇾', titles: 2, years: '1930, 1950' },
  { team: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', titles: 1, years: '1966' },
  { team: 'Espanha', flag: '🇪🇸', titles: 1, years: '2010' },
];

/** Recordes e curiosidades. */
export const RECORDS: { emoji: string; label: string; value: string }[] = [
  { emoji: '🏆', label: 'Maior campeão', value: 'Brasil — 5 títulos' },
  { emoji: '⚽', label: 'Maior artilheiro (carreira)', value: 'Miroslav Klose 🇩🇪 — 16 gols' },
  { emoji: '🔥', label: 'Mais gols numa Copa', value: 'Just Fontaine 🇫🇷 — 13 (1958)' },
  { emoji: '🎯', label: 'Mais finais disputadas', value: 'Alemanha — 8' },
  { emoji: '🌎', label: 'Presença perfeita', value: 'Brasil — única em todas as Copas' },
  { emoji: '🆕', label: 'Copa de 2026', value: '48 seleções, 1ª com 3 países-sede (EUA, México, Canadá)' },
];
