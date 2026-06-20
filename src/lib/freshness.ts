/**
 * Decisão PURA de frescura do cache de jogos.
 *
 * O bug das "39h sem atualizar" vinha de acoplar "preciso buscar?" ao isLive():
 * o app só atualizava se já houvesse jogo ao vivo NO CACHE — mas isso só se sabe
 * DEPOIS de buscar (deadlock). Aqui a decisão é por IDADE do cache + janela de
 * relógio, sem depender do status já reconciliado. Lógica isolada e testável no
 * Pilar Zero (scripts/data-integrity.test.ts).
 */

const TTL_WINDOW_MS = 2 * 60 * 1000; // 2 min perto do horário dos jogos
const TTL_WINDOW_SAVER_MS = 10 * 60 * 1000; // 10 min perto dos jogos no modo economia
const TTL_IDLE_MS = 15 * 60 * 1000; // 15 min fora de janela
const TTL_IDLE_SAVER_MS = 60 * 60 * 1000; // 1h fora de janela no modo economia

/** Idade máxima tolerada do cache, por contexto. */
export function staleTtlMs(hasMatchInWindow: boolean, dataSaver: boolean): number {
  if (hasMatchInWindow) return dataSaver ? TTL_WINDOW_SAVER_MS : TTL_WINDOW_MS;
  return dataSaver ? TTL_IDLE_SAVER_MS : TTL_IDLE_MS;
}

/**
 * O cache deve ser reatualizado? Sem cache (null) = sempre sim. O modo economia
 * só AUMENTA o TTL — nunca desliga a atualização de segurança (senão volta o bug
 * do "dado velho eterno").
 */
export function isStale(
  updatedAt: number | null,
  now: number,
  hasMatchInWindow: boolean,
  dataSaver: boolean,
): boolean {
  if (updatedAt == null) return true;
  return now - updatedAt > staleTtlMs(hasMatchInWindow, dataSaver);
}
