/**
 * Matching de nomes de time no servidor — PORTADO de src/lib/liveEvents.ts.
 * Precisa ficar em sincronia com o cliente (mesma tabela de aliases).
 *
 * Usado para filtrar o push de gol por seleção: o app envia os IDs internos das
 * seleções do usuário (nomes em inglês, ex.: "Brazil"); a ESPN devolve o nome
 * dela (ex.: "Korea Republic"). Aqui casamos os dois.
 */

/** minúsculo, sem acento/pontuação/espaço. */
function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
}

/** Apelidos ESPN → nosso id (chave e valor já normalizados). Igual ao cliente. */
const ALIAS: Record<string, string> = {
  czechia: 'czechrepublic',
  unitedstates: 'usa',
  bosniaandherzegovina: 'bosniaherzegovina',
  turkiye: 'turkey',
  cotedivoire: 'ivorycoast',
  iriran: 'iran',
  korearepublic: 'southkorea',
  congodr: 'drcongo',
};

export function teamMatches(espnName: string, ourId: string): boolean {
  const a = norm(espnName);
  const b = norm(ourId);
  return a === b || ALIAS[a] === b || ALIAS[b] === a;
}
