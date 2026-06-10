/**
 * Os 48 selecionados da Copa de 2026.
 * A chave (`id`) é EXATAMENTE o nome usado pela API TheSportsDB nos jogos,
 * para que o cruzamento jogo <-> seleção seja direto e sem normalização.
 */
export type Team = {
  id: string; // nome em inglês (igual ao da API) — usado como identificador estável
  name: string; // nome em português
  flag: string; // emoji da bandeira
  group: string; // grupo A..L
};

export const TEAMS: Team[] = [
  // Grupo A
  { id: 'Mexico', name: 'México', flag: '🇲🇽', group: 'A' },
  { id: 'South Africa', name: 'África do Sul', flag: '🇿🇦', group: 'A' },
  { id: 'South Korea', name: 'Coreia do Sul', flag: '🇰🇷', group: 'A' },
  { id: 'Czech Republic', name: 'República Tcheca', flag: '🇨🇿', group: 'A' },
  // Grupo B
  { id: 'Canada', name: 'Canadá', flag: '🇨🇦', group: 'B' },
  { id: 'Bosnia-Herzegovina', name: 'Bósnia e Herzegovina', flag: '🇧🇦', group: 'B' },
  { id: 'Qatar', name: 'Catar', flag: '🇶🇦', group: 'B' },
  { id: 'Switzerland', name: 'Suíça', flag: '🇨🇭', group: 'B' },
  // Grupo C
  { id: 'Brazil', name: 'Brasil', flag: '🇧🇷', group: 'C' },
  { id: 'Morocco', name: 'Marrocos', flag: '🇲🇦', group: 'C' },
  { id: 'Haiti', name: 'Haiti', flag: '🇭🇹', group: 'C' },
  { id: 'Scotland', name: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C' },
  // Grupo D
  { id: 'USA', name: 'Estados Unidos', flag: '🇺🇸', group: 'D' },
  { id: 'Paraguay', name: 'Paraguai', flag: '🇵🇾', group: 'D' },
  { id: 'Australia', name: 'Austrália', flag: '🇦🇺', group: 'D' },
  { id: 'Turkey', name: 'Turquia', flag: '🇹🇷', group: 'D' },
  // Grupo E
  { id: 'Germany', name: 'Alemanha', flag: '🇩🇪', group: 'E' },
  { id: 'Curaçao', name: 'Curaçao', flag: '🇨🇼', group: 'E' },
  { id: 'Ivory Coast', name: 'Costa do Marfim', flag: '🇨🇮', group: 'E' },
  { id: 'Ecuador', name: 'Equador', flag: '🇪🇨', group: 'E' },
  // Grupo F
  { id: 'Netherlands', name: 'Holanda', flag: '🇳🇱', group: 'F' },
  { id: 'Japan', name: 'Japão', flag: '🇯🇵', group: 'F' },
  { id: 'Sweden', name: 'Suécia', flag: '🇸🇪', group: 'F' },
  { id: 'Tunisia', name: 'Tunísia', flag: '🇹🇳', group: 'F' },
  // Grupo G
  { id: 'Belgium', name: 'Bélgica', flag: '🇧🇪', group: 'G' },
  { id: 'Egypt', name: 'Egito', flag: '🇪🇬', group: 'G' },
  { id: 'Iran', name: 'Irã', flag: '🇮🇷', group: 'G' },
  { id: 'New Zealand', name: 'Nova Zelândia', flag: '🇳🇿', group: 'G' },
  // Grupo H
  { id: 'Spain', name: 'Espanha', flag: '🇪🇸', group: 'H' },
  { id: 'Cape Verde', name: 'Cabo Verde', flag: '🇨🇻', group: 'H' },
  { id: 'Saudi Arabia', name: 'Arábia Saudita', flag: '🇸🇦', group: 'H' },
  { id: 'Uruguay', name: 'Uruguai', flag: '🇺🇾', group: 'H' },
  // Grupo I
  { id: 'France', name: 'França', flag: '🇫🇷', group: 'I' },
  { id: 'Senegal', name: 'Senegal', flag: '🇸🇳', group: 'I' },
  { id: 'Iraq', name: 'Iraque', flag: '🇮🇶', group: 'I' },
  { id: 'Norway', name: 'Noruega', flag: '🇳🇴', group: 'I' },
  // Grupo J
  { id: 'Argentina', name: 'Argentina', flag: '🇦🇷', group: 'J' },
  { id: 'Algeria', name: 'Argélia', flag: '🇩🇿', group: 'J' },
  { id: 'Austria', name: 'Áustria', flag: '🇦🇹', group: 'J' },
  { id: 'Jordan', name: 'Jordânia', flag: '🇯🇴', group: 'J' },
  // Grupo K
  { id: 'Portugal', name: 'Portugal', flag: '🇵🇹', group: 'K' },
  { id: 'DR Congo', name: 'RD Congo', flag: '🇨🇩', group: 'K' },
  { id: 'Uzbekistan', name: 'Uzbequistão', flag: '🇺🇿', group: 'K' },
  { id: 'Colombia', name: 'Colômbia', flag: '🇨🇴', group: 'K' },
  // Grupo L
  { id: 'England', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L' },
  { id: 'Croatia', name: 'Croácia', flag: '🇭🇷', group: 'L' },
  { id: 'Ghana', name: 'Gana', flag: '🇬🇭', group: 'L' },
  { id: 'Panama', name: 'Panamá', flag: '🇵🇦', group: 'L' },
];

const BY_ID = new Map(TEAMS.map((t) => [t.id, t]));

export function getTeam(id: string): Team | undefined {
  return BY_ID.get(id);
}

/** Nome em português para um id de seleção (cai no próprio id se for desconhecido). */
export function teamName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}

/** Bandeira (emoji) para um id de seleção. */
export function teamFlag(id: string): string {
  return BY_ID.get(id)?.flag ?? '🏳️';
}

export const GROUPS = [...new Set(TEAMS.map((t) => t.group))].sort();
