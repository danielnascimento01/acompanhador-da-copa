#!/usr/bin/env node
/**
 * Gera assets/data/stickers.json — catálogo AUTORAL do álbum de figurinhas das
 * seleções 2026 (conteúdo próprio, sem vínculo com produtos/marcas de terceiros).
 * Uso: npm run build-stickers
 *
 * Estrutura (980 figurinhas):
 *  - Especiais (20): 00 (capa) + SP1–SP8 (abertura) + SP9–SP19 (Lendas).
 *  - 48 seleções × 20: código de 3 letras do país (padrão internacional) + 1..20.
 *    Por time: 1 = brilhante (FOIL) · 2..19 = 18 cromos · 20 = cromo do elenco.
 *  - 68 brilhantes (FOIL) = 48 da posição 1 + 20 especiais.
 *
 * Os 48 times batem com src/data/teams.ts (mesmos ids/grupos). Se a lista mudar,
 * ajuste CODES e rode de novo. Os códigos de país de 3 letras são padrão
 * internacional (ISO/COI) e identificam apenas a seção; não são conteúdo de marca.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'data', 'stickers.json');

/** id (igual ao teams.ts) -> { código FIFA de 3 letras, nome PT, grupo } — em ordem de grupo. */
const CODES = [
  // A
  ['Mexico', 'MEX', 'México', 'A'],
  ['South Africa', 'RSA', 'África do Sul', 'A'],
  ['South Korea', 'KOR', 'Coreia do Sul', 'A'],
  ['Czech Republic', 'CZE', 'República Tcheca', 'A'],
  // B
  ['Canada', 'CAN', 'Canadá', 'B'],
  ['Bosnia-Herzegovina', 'BIH', 'Bósnia e Herzegovina', 'B'],
  ['Qatar', 'QAT', 'Catar', 'B'],
  ['Switzerland', 'SUI', 'Suíça', 'B'],
  // C
  ['Brazil', 'BRA', 'Brasil', 'C'],
  ['Morocco', 'MAR', 'Marrocos', 'C'],
  ['Haiti', 'HAI', 'Haiti', 'C'],
  ['Scotland', 'SCO', 'Escócia', 'C'],
  // D
  ['USA', 'USA', 'Estados Unidos', 'D'],
  ['Paraguay', 'PAR', 'Paraguai', 'D'],
  ['Australia', 'AUS', 'Austrália', 'D'],
  ['Turkey', 'TUR', 'Turquia', 'D'],
  // E
  ['Germany', 'GER', 'Alemanha', 'E'],
  ['Curaçao', 'CUW', 'Curaçao', 'E'],
  ['Ivory Coast', 'CIV', 'Costa do Marfim', 'E'],
  ['Ecuador', 'ECU', 'Equador', 'E'],
  // F
  ['Netherlands', 'NED', 'Holanda', 'F'],
  ['Japan', 'JPN', 'Japão', 'F'],
  ['Sweden', 'SWE', 'Suécia', 'F'],
  ['Tunisia', 'TUN', 'Tunísia', 'F'],
  // G
  ['Belgium', 'BEL', 'Bélgica', 'G'],
  ['Egypt', 'EGY', 'Egito', 'G'],
  ['Iran', 'IRN', 'Irã', 'G'],
  ['New Zealand', 'NZL', 'Nova Zelândia', 'G'],
  // H
  ['Spain', 'ESP', 'Espanha', 'H'],
  ['Cape Verde', 'CPV', 'Cabo Verde', 'H'],
  ['Saudi Arabia', 'KSA', 'Arábia Saudita', 'H'],
  ['Uruguay', 'URU', 'Uruguai', 'H'],
  // I
  ['France', 'FRA', 'França', 'I'],
  ['Senegal', 'SEN', 'Senegal', 'I'],
  ['Iraq', 'IRQ', 'Iraque', 'I'],
  ['Norway', 'NOR', 'Noruega', 'I'],
  // J
  ['Argentina', 'ARG', 'Argentina', 'J'],
  ['Algeria', 'ALG', 'Argélia', 'J'],
  ['Austria', 'AUT', 'Áustria', 'J'],
  ['Jordan', 'JOR', 'Jordânia', 'J'],
  // K
  ['Portugal', 'POR', 'Portugal', 'K'],
  ['DR Congo', 'COD', 'RD Congo', 'K'],
  ['Uzbekistan', 'UZB', 'Uzbequistão', 'K'],
  ['Colombia', 'COL', 'Colômbia', 'K'],
  // L
  ['England', 'ENG', 'Inglaterra', 'L'],
  ['Croatia', 'CRO', 'Croácia', 'L'],
  ['Ghana', 'GHA', 'Gana', 'L'],
  ['Panama', 'PAN', 'Panamá', 'L'],
];

const STICKERS_PER_TEAM = 20; // 1 escudo (foil) + 18 jogadores + 1 foto do elenco
const BADGE_INDEX = 1; // posição do escudo FOIL dentro do time

function buildSpecials() {
  const sections = [];

  // Abertura: 00 (capa) + SP1..SP8 (figurinhas especiais de abertura) — todas FOIL
  const abertura = [{ code: '00', shiny: true }];
  for (let i = 1; i <= 8; i++) abertura.push({ code: `SP${i}`, shiny: true });
  sections.push({ id: 'special:abertura', title: 'Abertura', stickers: abertura });

  // Lendas: SP9..SP19 (11 craques históricos) — todas FOIL
  const lendas = [];
  for (let i = 9; i <= 19; i++) lendas.push({ code: `SP${i}`, shiny: true });
  sections.push({ id: 'special:lendas', title: 'Lendas', stickers: lendas });

  return sections;
}

function buildTeams() {
  return CODES.map(([id, code, name, group]) => {
    const stickers = [];
    for (let n = 1; n <= STICKERS_PER_TEAM; n++) {
      stickers.push({ code: `${code}${n}`, ...(n === BADGE_INDEX ? { shiny: true } : {}) });
    }
    return { id: `team:${id}`, title: name, teamId: id, group, code, stickers };
  });
}

function main() {
  const sections = [...buildSpecials(), ...buildTeams()];
  const total = sections.reduce((acc, s) => acc + s.stickers.length, 0);
  const foil = sections.reduce(
    (acc, s) => acc + s.stickers.filter((st) => st.shiny).length,
    0,
  );

  const data = { version: 1, album: 'Figurinhas das Seleções 2026', total, sections };

  // Sanidade: o catálogo tem 980 figurinhas e 68 brilhantes.
  if (total !== 980) throw new Error(`Esperava 980 figurinhas, gerou ${total}`);
  if (foil !== 68) throw new Error(`Esperava 68 brilhantes (foil), gerou ${foil}`);

  return { data, total, foil };
}

const { data, total, foil } = main();
await writeFile(OUT, JSON.stringify(data) + '\n');
console.log(`✓ stickers.json gerado: ${total} figurinhas (${foil} brilhantes), ${data.sections.length} seções.`);
