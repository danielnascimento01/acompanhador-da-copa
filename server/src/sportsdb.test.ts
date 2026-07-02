/**
 * Teste do matching de foto (TheSportsDB) — a parte que importa é NUNCA escolher
 * entre candidatos ambíguos. Rodar: npx tsx src/sportsdb.test.ts
 */
import { nationalityMatches, pickPlayerPhoto, type TSDBPlayer } from './sportsdb';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`✅ ${label}`); }
  else { fail++; console.log(`❌ ${label}`); }
}

// ── nationalityMatches: overlap de palavra inteira, não substring ──
check('1. mesma nacionalidade exata', nationalityMatches('France', 'France'));
check('2. "DR Congo" casa com "Congo DR" (ordem trocada)', nationalityMatches('DR Congo', 'Congo DR'));
check('3. "The Netherlands" casa com "Netherlands"', nationalityMatches('The Netherlands', 'Netherlands'));
check('4. nacionalidade ausente nunca casa', !nationalityMatches(undefined, 'France'));
check('5. países diferentes não casam', !nationalityMatches('Argentina', 'Brazil'));
check('6. NÃO casa por substring solto (Congo vs Republic of Congo seria falso positivo perigoso)',
  !nationalityMatches('Republic of the Congo', 'DR Congo'));

const p = (over: Partial<TSDBPlayer>): TSDBPlayer => ({
  idPlayer: '1', strPlayer: 'X', strSport: 'Soccer', ...over,
});

// ── pickPlayerPhoto: só aceita candidato ÚNICO com nacionalidade confirmada ──
check('7. 1 candidato, nacionalidade bate → aceita',
  pickPlayerPhoto([p({ strNationality: 'France', strCutout: 'url1' })], 'France') === 'url1');

check('8. 1 candidato, nacionalidade NÃO bate → rejeita (não chuta o único resultado)',
  pickPlayerPhoto([p({ strNationality: 'Brazil', strCutout: 'url1' })], 'France') === null);

check('9. 2 candidatos, nacionalidades diferentes, só 1 bate → aceita o que bate',
  pickPlayerPhoto([
    p({ idPlayer: '1', strNationality: 'Brazil', strCutout: 'urlBR' }),
    p({ idPlayer: '2', strNationality: 'France', strCutout: 'urlFR' }),
  ], 'France') === 'urlFR');

check('10. 2 candidatos, AMBOS batem nacionalidade → ambíguo, rejeita (nunca escolhe)',
  pickPlayerPhoto([
    p({ idPlayer: '1', strNationality: 'France', strCutout: 'urlA' }),
    p({ idPlayer: '2', strNationality: 'France', strCutout: 'urlB' }),
  ], 'France') === null);

check('11. resultado não-Soccer é ignorado (evita falso positivo de outro esporte)',
  pickPlayerPhoto([p({ strSport: 'Basketball', strNationality: 'France', strCutout: 'url1' })], 'France') === null);

check('12. lista vazia → null', pickPlayerPhoto([], 'France') === null);

check('13. prefere strCutout sobre strThumb',
  pickPlayerPhoto([p({ strNationality: 'France', strCutout: 'cutout', strThumb: 'thumb' })], 'France') === 'cutout');

check('14. sem strCutout, usa strThumb',
  pickPlayerPhoto([p({ strNationality: 'France', strThumb: 'thumb' })], 'France') === 'thumb');

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) throw new Error(`${fail} teste(s) de sportsdb falharam`);
