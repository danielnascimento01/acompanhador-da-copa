/**
 * "Dado de Craque" — tipos do jogo de draft + simulação de Copa.
 * Mecânica original construída do zero; usa os fatos históricos dos elencos.
 */

export type Position = 'GOL' | 'LD' | 'ZAG' | 'LE' | 'VOL' | 'MD' | 'MC' | 'ME' | 'MEI' | 'PD' | 'CA' | 'PE';

export const POSITIONS: Position[] = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MD', 'MC', 'ME', 'MEI', 'PD', 'CA', 'PE'];

export type Player = {
  id: string;
  name: string;
  pos: Position[];   // posições que o jogador pode ocupar
  rating: number;    // 0-99 (calibragem de referência; a engine é agnóstica)
  num: number;       // número da camisa (0 = desconhecido)
  legend: boolean;   // craque histórico do elenco
};

export type Squad = {
  code: string;      // ex.: "BRA"
  name: string;      // ex.: "Brasil"
  year: number;      // ano da Copa
  players: Player[];
};

export type FormationKey = '4-3-3' | '4-4-2' | '4-2-3-1' | '4-2-4' | '3-5-2' | '5-3-2' | '4-5-1' | '3-4-3';
export type Tactic = 'defensivo' | 'equilibrado' | 'ofensivo';
export type Mode = 'classico' | 'almanaque';

export type Slot = { pos: Position; x: number; y: number };

export type Forces = { attack: number; defense: number; overall: number };

/** Um gol numa partida: minuto e (se for nosso) o autor. */
export type Goal = { minute: number; scorer: string | null };

/** Sequência de pênaltis (encenação coerente com o vencedor já decidido). */
export type PenaltyShootout = { me: boolean[]; adv: boolean[]; scoreMe: number; scoreAdv: number };

/** Resultado de uma partida (na perspectiva do nosso time). */
export type MatchResult = {
  gf: number;        // gols a favor
  ga: number;        // gols contra
  outcome: 'V' | 'E' | 'D';
};

export type GroupRow = {
  name: string;
  isMe: boolean;
  P: number; W: number; D: number; L: number;
  GF: number; GA: number; GD: number; Pts: number;
};

export type KnockoutGame = {
  phase: 'OITAVAS' | 'QUARTAS' | 'SEMI' | 'FINAL';
  label: string;
  advOverall: number;
  gf: number;
  ga: number;
  outcome: 'V' | 'E' | 'D';
  myGoals: Goal[];
  advGoals: Goal[];
  penalties: { meWin: boolean; prob: number; shootout: PenaltyShootout } | null;
  advanced: boolean;
};

export type GroupGame = {
  label: string;
  advOverall: number;
  gf: number;
  ga: number;
  outcome: 'V' | 'E' | 'D';
  myGoals: Goal[];
  advGoals: Goal[];
};

export type CampaignResult = {
  group: {
    games: GroupGame[];
    table: GroupRow[];
    rank: number;
    advanced: boolean;
  };
  knockouts: KnockoutGame[];
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  champion: boolean;
  perfect: boolean;   // o "7 a 0": 7 vitórias, 0 empates, 0 derrotas
  muralha: boolean;   // campeão sem sofrer gol
  badge: 'PERFEITO' | 'MURALHA' | 'ESMAGADOR' | null;
  record: string;     // "V-D"
  eliminatedAt: string | null;
};
