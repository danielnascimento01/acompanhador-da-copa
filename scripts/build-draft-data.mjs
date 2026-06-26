/**
 * Gera a base PRÓPRIA do jogo "Dado de Craque" a partir dos FATOS dos elencos
 * (quem foi convocado, posição, número, lenda) — fatos históricos são livres.
 *
 * Saídas (versionadas, são NOSSAS):
 *   - src/data/draft/squads.json      (elencos no nosso formato/campos)
 *   - src/data/draft/formations.json  (8 formações × 3 táticas, layout do campo)
 *
 * Entradas (referência de terceiro, NÃO versionadas — ver .gitignore):
 *   - files7a0/base_7a0_completa.json
 *   - files7a0/formacoes.json
 *
 * Ratings: partimos da calibragem de referência como BASE (jogos de avaliação não
 * são fortemente protegidos e o autor autorizou). A engine é agnóstica ao rating —
 * funciona com qualquer escala 0-99. Rode com: node scripts/build-draft-data.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_BASE = join(ROOT, 'files7a0', 'base_7a0_completa.json');
const SRC_FORM = join(ROOT, 'files7a0', 'formacoes.json');
const OUT_SQUADS = join(ROOT, 'src', 'data', 'draft', 'squads.json');
const OUT_FORM = join(ROOT, 'src', 'data', 'draft', 'formations.json');

if (!existsSync(SRC_BASE)) {
  console.error(`✗ Não achei ${SRC_BASE}. (Material de referência ausente — ok se já gerou a base antes.)`);
  process.exit(1);
}

const POSITIONS = new Set(['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MD', 'MC', 'ME', 'MEI', 'PD', 'CA', 'PE']);

const base = JSON.parse(readFileSync(SRC_BASE, 'utf8'));

let warnings = 0;
const squads = base.map((e) => {
  const code = String(e.sel);
  const year = Number(e.copa);
  const players = e.squad.map((p, i) => {
    const pos = (Array.isArray(p.pos) ? p.pos : []).filter((x) => POSITIONS.has(x));
    if (pos.length === 0) { warnings++; console.warn(`! ${code}-${year} ${p.n}: sem posição válida`); }
    const rating = Math.max(0, Math.min(99, Math.round(Number(p.r) || 0)));
    return {
      id: `${code}-${year}-${i}`,
      name: String(p.n),
      pos,
      rating,
      num: Number(p.num) || 0,
      legend: !!p.leg,
    };
  });
  return { code, name: String(e.nome), year, players };
});

// Validação mínima (mesmo espírito do "zero bug de dados").
let bad = 0;
for (const s of squads) {
  if (s.players.length < 11) { bad++; console.warn(`! ${s.code}-${s.year}: só ${s.players.length} jogadores (<11)`); }
}

writeFileSync(OUT_SQUADS, JSON.stringify(squads));
console.log(`✓ squads.json: ${squads.length} elencos, ${squads.reduce((n, s) => n + s.players.length, 0)} jogadores (${(JSON.stringify(squads).length / 1024).toFixed(0)}KB)`);

// Formações — layout do campo (posição + coordenadas). Copiamos a estrutura.
if (existsSync(SRC_FORM)) {
  const form = JSON.parse(readFileSync(SRC_FORM, 'utf8'));
  writeFileSync(OUT_FORM, JSON.stringify(form));
  console.log(`✓ formations.json: ${Object.keys(form).length} formações × 3 táticas`);
}

if (bad > 0 || warnings > 0) console.warn(`⚠ ${bad} elencos curtos, ${warnings} avisos de posição`);
console.log('✓ Base do "Dado de Craque" gerada.');
