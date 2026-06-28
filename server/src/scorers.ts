/**
 * Agrega artilheiros da Copa 2026 a partir dos lances (plays) de TODOS os jogos
 * encerrados. Roda no cron e escreve o resultado no KV para o app consumir.
 *
 * Estratégia: idempotente — processa todos os jogos terminados a cada chamada
 * e recomputa os totais do zero. Evita bugs de estado acumulado no KV.
 * Custo: ~1 chamada ESPN por jogo finalizado; aceitável durante a Copa.
 */

import { fetchScoreboard, fetchGoalScorers } from './espn';

export type LiveScorer = {
  player: string;
  teamName: string;
  goals: number;
  updatedAt: string; // ISO 8601
};

/**
 * Busca e agrega artilheiros de todos os jogos encerrados hoje e nas últimas
 * 48h (janela conservadora para cobrir dados chegando atrasados).
 */
export async function aggregateScorers(kv: KVNamespace): Promise<void> {
  const now = new Date();
  // Busca os últimos 2 dias de jogos para garantir que jogos recém-encerrados
  // são incluídos (ESPN às vezes tarda a atualizar status para 'post').
  const dates = [-1, 0, 1].map((offset) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  });

  const totals = new Map<string, { teamName: string; goals: number }>();

  for (const date of dates) {
    const events = await fetchScoreboard(date);
    // Processa encerrados + ao vivo (para artilharia ficar em tempo real)
    const relevant = events.filter((e) => e.status.type.state !== 'pre');

    for (const event of relevant) {
      const goals = await fetchGoalScorers(event.id);
      for (const g of goals) {
        const current = totals.get(g.player) ?? { teamName: g.teamName, goals: 0 };
        totals.set(g.player, { teamName: current.teamName || g.teamName, goals: current.goals + 1 });
      }
    }
  }

  if (totals.size === 0) return; // Nenhum jogo ainda — não sobrescreve KV

  // Ordena por gols desc
  const scorers: LiveScorer[] = Array.from(totals.entries())
    .map(([player, { teamName, goals }]) => ({ player, teamName, goals, updatedAt: now.toISOString() }))
    .sort((a, b) => b.goals - a.goals);

  // Só grava se a artilharia REALMENTE mudou (ignorando `updatedAt`, que muda a
  // cada ciclo). Sem isto, o cron reescrevia esta chave 1.440x/dia à toa e
  // estourava a cota de ESCRITA do KV. A leitura de comparação é barata (a cota
  // de leitura é 100x maior). O app não perde nada: o conteúdo é idêntico.
  const prevRaw = await kv.get('scorers');
  if (prevRaw && sameScorers(safeParse(prevRaw), scorers)) return;

  await kv.put('scorers', JSON.stringify(scorers), {
    // Expira em 7 dias — bem além da Copa
    expirationTtl: 7 * 24 * 60 * 60,
  });
}

/** Parse tolerante (KV corrompido → trata como vazio, força a regravação). */
function safeParse(raw: string): LiveScorer[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as LiveScorer[]) : [];
  } catch {
    return [];
  }
}

/** Compara duas listas de artilheiros ignorando `updatedAt` (muda todo ciclo). */
export function sameScorers(a: LiveScorer[], b: LiveScorer[]): boolean {
  if (a.length !== b.length) return false;
  const sig = (l: LiveScorer[]) =>
    l.map((s) => JSON.stringify([s.player, s.teamName, s.goals])).sort().join('|');
  return sig(a) === sig(b);
}

/** Retorna artilheiros do KV (fallback: array vazio). */
export async function getScorers(kv: KVNamespace): Promise<LiveScorer[]> {
  try {
    const raw = await kv.get('scorers');
    if (!raw) return [];
    const list = JSON.parse(raw) as LiveScorer[];
    // Chuteira de Ouro DE 2026: só os gols DESTA Copa, na ordem em que foram
    // gravados (já ordenada por gols desc). Sem bônus histórico — somar gols de
    // Copas passadas inflava o número e quebrava a ordenação (Messi 14 no rodapé).
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
