/**
 * Matching e nomes de seleção no servidor — PORTADO de src/data/teams.ts +
 * src/lib/liveEvents.ts. Mantém sincronia com o cliente (mesmos aliases).
 *
 * Usado para:
 * 1. Filtrar push por seleção (teamMatches: id interno do app ↔ nome da ESPN).
 * 2. Montar o texto do push em português ("Gol do Brasil", "Brasil 1 x 0 Escócia").
 */

/** minúsculo, sem acento/pontuação/espaço. */
function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
}

/**
 * Apelidos ESPN → nosso id (chave e valor já normalizados).
 * A ESPN às vezes usa nomes diferentes: "Korea Republic", "Czechia",
 * "IR Iran", "Türkiye", "Côte d'Ivoire", "Cabo Verde", "United States".
 */
const ALIAS: Record<string, string> = {
  czechia: 'czechrepublic',
  unitedstates: 'usa',
  bosniaandherzegovina: 'bosniaherzegovina',
  turkiye: 'turkey',
  cotedivoire: 'ivorycoast',
  iriran: 'iran',
  korearepublic: 'southkorea',
  congodr: 'drcongo',
  caboverde: 'capeverde', // ESPN usa "Cabo Verde"; nosso id é "Cape Verde"
};

export function teamMatches(espnName: string, ourId: string): boolean {
  const a = norm(espnName);
  const b = norm(ourId);
  return a === b || ALIAS[a] === b || ALIAS[b] === a;
}

/**
 * Seleção: id (nome inglês = igual ao app), nome PT e o ARTIGO/conector usado
 * depois de "Gol" ("Gol do Brasil", "Gol da França", "Gol de Portugal",
 * "Gol dos Estados Unidos"). O conector foi escolhido um a um (PT-BR).
 */
type TeamInfo = { id: string; name: string; art: string };

const TEAMS: TeamInfo[] = [
  { id: 'Mexico', name: 'México', art: 'do' },
  { id: 'South Africa', name: 'África do Sul', art: 'da' },
  { id: 'South Korea', name: 'Coreia do Sul', art: 'da' },
  { id: 'Czech Republic', name: 'República Tcheca', art: 'da' },
  { id: 'Canada', name: 'Canadá', art: 'do' },
  { id: 'Bosnia-Herzegovina', name: 'Bósnia e Herzegovina', art: 'da' },
  { id: 'Qatar', name: 'Catar', art: 'do' },
  { id: 'Switzerland', name: 'Suíça', art: 'da' },
  { id: 'Brazil', name: 'Brasil', art: 'do' },
  { id: 'Morocco', name: 'Marrocos', art: 'do' },
  { id: 'Haiti', name: 'Haiti', art: 'do' },
  { id: 'Scotland', name: 'Escócia', art: 'da' },
  { id: 'USA', name: 'Estados Unidos', art: 'dos' },
  { id: 'Paraguay', name: 'Paraguai', art: 'do' },
  { id: 'Australia', name: 'Austrália', art: 'da' },
  { id: 'Turkey', name: 'Turquia', art: 'da' },
  { id: 'Germany', name: 'Alemanha', art: 'da' },
  { id: 'Curaçao', name: 'Curaçao', art: 'de' },
  { id: 'Ivory Coast', name: 'Costa do Marfim', art: 'da' },
  { id: 'Ecuador', name: 'Equador', art: 'do' },
  { id: 'Netherlands', name: 'Holanda', art: 'da' },
  { id: 'Japan', name: 'Japão', art: 'do' },
  { id: 'Sweden', name: 'Suécia', art: 'da' },
  { id: 'Tunisia', name: 'Tunísia', art: 'da' },
  { id: 'Belgium', name: 'Bélgica', art: 'da' },
  { id: 'Egypt', name: 'Egito', art: 'do' },
  { id: 'Iran', name: 'Irã', art: 'do' },
  { id: 'New Zealand', name: 'Nova Zelândia', art: 'da' },
  { id: 'Spain', name: 'Espanha', art: 'da' },
  { id: 'Cape Verde', name: 'Cabo Verde', art: 'de' },
  { id: 'Saudi Arabia', name: 'Arábia Saudita', art: 'da' },
  { id: 'Uruguay', name: 'Uruguai', art: 'do' },
  { id: 'France', name: 'França', art: 'da' },
  { id: 'Senegal', name: 'Senegal', art: 'do' },
  { id: 'Iraq', name: 'Iraque', art: 'do' },
  { id: 'Norway', name: 'Noruega', art: 'da' },
  { id: 'Argentina', name: 'Argentina', art: 'da' },
  { id: 'Algeria', name: 'Argélia', art: 'da' },
  { id: 'Austria', name: 'Áustria', art: 'da' },
  { id: 'Jordan', name: 'Jordânia', art: 'da' },
  { id: 'Portugal', name: 'Portugal', art: 'de' },
  { id: 'DR Congo', name: 'RD Congo', art: 'da' },
  { id: 'Uzbekistan', name: 'Uzbequistão', art: 'do' },
  { id: 'Colombia', name: 'Colômbia', art: 'da' },
  { id: 'England', name: 'Inglaterra', art: 'da' },
  { id: 'Croatia', name: 'Croácia', art: 'da' },
  { id: 'Ghana', name: 'Gana', art: 'de' },
  { id: 'Panama', name: 'Panamá', art: 'do' },
];

/** Emoji da bandeira por id (mesma fonte das bandeiras do app; Escócia/Inglaterra
 * usam a bandeira de subdivisão). Usado no texto do push: "🇧🇷 Brasil 1 x 0 🏴 Escócia". */
const FLAG_EMOJI: Record<string, string> = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦',
  'Bosnia-Herzegovina': '🇧🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  'Haiti': '🇭🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turkey': '🇹🇷',
  'Germany': '🇩🇪',
  'Curaçao': '🇨🇼',
  'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵',
  'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪',
  'Egypt': '🇪🇬',
  'Iran': '🇮🇷',
  'New Zealand': '🇳🇿',
  'Spain': '🇪🇸',
  'Cape Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦',
  'Uruguay': '🇺🇾',
  'France': '🇫🇷',
  'Senegal': '🇸🇳',
  'Iraq': '🇮🇶',
  'Norway': '🇳🇴',
  'Argentina': '🇦🇷',
  'Algeria': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordan': '🇯🇴',
  'Portugal': '🇵🇹',
  'DR Congo': '🇨🇩',
  'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
};

/** Resolve o nome PT + artigo + emoji a partir do nome ESPN. null se desconhecido. */
export function teamInfo(espnName: string): { name: string; art: string; emoji: string } | null {
  const t = TEAMS.find((x) => teamMatches(espnName, x.id));
  return t ? { name: t.name, art: t.art, emoji: FLAG_EMOJI[t.id] ?? '' } : null;
}
