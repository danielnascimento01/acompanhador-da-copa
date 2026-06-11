#!/usr/bin/env node
/**
 * Gera o ícone do app (bola de futebol realista) e MUITAS variações temáticas
 * para o seletor de ícones alternativos (estilo GitHub).
 *
 * Uso: node scripts/generate-icons.mjs
 * Saída: store/icons/icon-<id>.png (1024×1024)
 *
 * ⚠️ LEGAL: nada de escudo de clube, logo de liga (Champions/UEFA) ou troféu
 * da FIFA — tudo marca registrada. Aqui usamos só: bandeiras de países
 * (domínio público) e esquemas de CORES (sem nome/escudo de clube).
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'store', 'icons');
const rad = (d) => (d * Math.PI) / 180;

// ---------- Bola de futebol realista (truncated icosahedron, vista frontal) ----------
function poly(cx, cy, r, rot) {
  const p = [];
  for (let i = 0; i < 5; i++) {
    const a = rad(-90 + rot + 72 * i);
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return p;
}
const pts = (p) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
function nearest(list, pt) {
  let b = null, bd = 1e9;
  for (const q of list) {
    const dd = (q[0] - pt[0]) ** 2 + (q[1] - pt[1]) ** 2;
    if (dd < bd) { bd = dd; b = q; }
  }
  return b;
}

/** Retorna o SVG da bola centrada em (cx,cy) com raio R. `idp` evita colisão de ids. */
function ball(cx, cy, R, idp = 'b') {
  const cR = R * 0.315;
  const central = poly(cx, cy, cR, 0);
  const outers = [];
  for (let i = 0; i < 5; i++) {
    const dir = -90 + 72 * i;
    const d = R * 0.64;
    outers.push({ p: poly(cx + d * Math.cos(rad(dir)), cy + d * Math.sin(rad(dir)), R * 0.265, -180 + 72 * i) });
  }
  const black = [`<polygon points="${pts(central)}"/>`, ...outers.map((o) => `<polygon points="${pts(o.p)}"/>`)];

  const seams = [];
  for (let i = 0; i < 5; i++) seams.push([central[i], nearest(outers[i].p, central[i])]);
  for (let i = 0; i < 5; i++) seams.push([central[i], nearest(outers[(i + 4) % 5].p, central[i])]);
  for (let i = 0; i < 5; i++) {
    const a = outers[i].p, b = outers[(i + 1) % 5].p;
    let best = null, bd = 1e9;
    for (const va of a) for (const vb of b) {
      const dd = (va[0] - vb[0]) ** 2 + (va[1] - vb[1]) ** 2;
      if (dd < bd) { bd = dd; best = [va, vb]; }
    }
    seams.push(best);
  }
  const seamSvg = seams
    .map((s) => `<line x1="${s[0][0].toFixed(1)}" y1="${s[0][1].toFixed(1)}" x2="${s[1][0].toFixed(1)}" y2="${s[1][1].toFixed(1)}"/>`)
    .join('');

  return {
    defs: `
      <radialGradient id="${idp}-sphere" cx="0.38" cy="0.30" r="0.74">
        <stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#F1F1F1"/><stop offset="0.88" stop-color="#C6C6C6"/><stop offset="1" stop-color="#9A9A9A"/>
      </radialGradient>
      <radialGradient id="${idp}-gloss" cx="0.33" cy="0.23" r="0.44">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.92"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${idp}-shade" cx="0.54" cy="0.57" r="0.55">
        <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.36"/>
      </radialGradient>
      <clipPath id="${idp}-clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>`,
    body: `
      <ellipse cx="${cx}" cy="${cy + R * 1.6}" rx="${R * 0.74}" ry="${R * 0.11}" fill="#000" opacity="0.28"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${idp}-sphere)"/>
      <g clip-path="url(#${idp}-clip)">
        <g stroke="#2A2D32" stroke-width="${R * 0.018}" stroke-linecap="round" fill="none">${seamSvg}</g>
        <g fill="#15181C">${black.join('')}</g>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${idp}-shade)"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${idp}-gloss)"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#000" stroke-opacity="0.16" stroke-width="3"/>`,
  };
}

// ---------- Backgrounds ----------
const S = 1024;
const rect = (fill) => `<rect width="${S}" height="${S}" fill="${fill}"/>`;
// faixas horizontais / verticais
const hbands = (cols) => cols.map((c, i) => `<rect x="0" y="${(S / cols.length) * i}" width="${S}" height="${S / cols.length}" fill="${c}"/>`).join('');
const vbands = (cols) => cols.map((c, i) => `<rect x="${(S / cols.length) * i}" y="0" width="${S / cols.length}" height="${S}" fill="${c}"/>`).join('');

// Bandeiras (simplificadas e reconhecíveis — domínio público)
const FLAGS = {
  brasil: `${rect('#009C3B')}<polygon points="512,118 906,512 512,906 118,512" fill="#FFDF00"/><circle cx="512" cy="512" r="250" fill="#002776"/>`,
  argentina: `${hbands(['#74ACDF', '#FFFFFF', '#74ACDF'])}<circle cx="512" cy="512" r="70" fill="#F6B40E"/>`,
  franca: vbands(['#0055A4', '#FFFFFF', '#EF4135']),
  inglaterra: `${rect('#FFFFFF')}<rect x="430" y="0" width="164" height="${S}" fill="#CF142B"/><rect x="0" y="430" width="${S}" height="164" fill="#CF142B"/>`,
  portugal: `<rect width="${S * 0.4}" height="${S}" fill="#006600"/><rect x="${S * 0.4}" width="${S * 0.6}" height="${S}" fill="#FF0000"/><circle cx="${S * 0.4}" cy="512" r="120" fill="#FFCC00" opacity="0.95"/>`,
  espanha: `<rect width="${S}" height="${S * 0.25}" fill="#AA151B"/><rect y="${S * 0.25}" width="${S}" height="${S * 0.5}" fill="#F1BF00"/><rect y="${S * 0.75}" width="${S}" height="${S * 0.25}" fill="#AA151B"/>`,
  alemanha: hbands(['#000000', '#DD0000', '#FFCE00']),
  holanda: hbands(['#AE1C28', '#FFFFFF', '#21468B']),
  mexico: vbands(['#006847', '#FFFFFF', '#CE1126']),
  eua: `${hbands(['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234'])}<rect width="${S * 0.42}" height="${S * 0.55}" fill="#3C3B6E"/>`,
  croacia: `${hbands(['#FF0000', '#FFFFFF', '#171796'])}`,
  japao: `${rect('#FFFFFF')}<circle cx="512" cy="512" r="200" fill="#BC002D"/>`,
};

// Estilos (gradientes/efeitos próprios)
function grad(id, c1, c2, dir = 'diag') {
  const coords = dir === 'vert' ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="1"';
  return `<linearGradient id="${id}" ${coords}><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
}
const STYLES = {
  default: { defs: `${grad('g', '#16202B', '#05080C')}<radialGradient id="gl" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#3A4655" stop-opacity="0.5"/><stop offset="1" stop-color="#3A4655" stop-opacity="0"/></radialGradient>`, bg: `${rect('url(#g)')}${rect('url(#gl)')}` },
  classico: { defs: '', bg: `${rect('#FFFFFF')}` },
  app: { defs: grad('g', '#0BA968', '#0E8FB0'), bg: `${rect('url(#g)')}<circle cx="512" cy="440" r="430" fill="#fff" opacity="0.06"/>` },
  dourado: { defs: `${grad('g', '#8A5E08', '#2A1C02')}<radialGradient id="gl" cx="0.5" cy="0.35" r="0.75"><stop offset="0" stop-color="#FFE08A" stop-opacity="0.4"/><stop offset="0.7" stop-color="#FFE08A" stop-opacity="0"/></radialGradient>`, bg: `${rect('url(#g)')}${rect('url(#gl)')}` },
  noite: { defs: grad('g', '#0A1E3C', '#050B16', 'vert'), bg: `${rect('url(#g)')}<polygon points="200,0 380,0 600,1024 320,1024" fill="#9CC4FF" opacity="0.10"/><polygon points="640,0 820,0 720,1024 420,1024" fill="#9CC4FF" opacity="0.08"/>` },
  neon: { defs: grad('g', '#1A0B2E', '#06030D', 'vert'), bg: `${rect('url(#g)')}<circle cx="512" cy="512" r="400" fill="none" stroke="#FF2D9B" stroke-width="14" opacity="0.5"/><circle cx="512" cy="512" r="360" fill="none" stroke="#14E0FF" stroke-width="10" opacity="0.4"/>` },
  fogo: { defs: grad('g', '#FF7A18', '#7A1402', 'vert'), bg: `${rect('url(#g)')}<radialGradient id="f" cx="0.5" cy="0.9" r="0.7"><stop offset="0" stop-color="#FFD24A" stop-opacity="0.6"/><stop offset="1" stop-color="#FFD24A" stop-opacity="0"/></radialGradient><rect width="${S}" height="${S}" fill="url(#f)"/>` },
  gelo: { defs: grad('g', '#BFE3F5', '#5A93B8', 'vert'), bg: `${rect('url(#g)')}<circle cx="512" cy="430" r="430" fill="#fff" opacity="0.18"/>` },
  campo: { defs: grad('g', '#1E7A3F', '#0F5228', 'vert'), bg: `${rect('url(#g)')}${[0, 2, 4, 6].map((i) => `<rect x="${i * 256 - 128}" width="128" height="${S}" fill="#fff" opacity="0.05"/>`).join('')}<circle cx="512" cy="512" r="380" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="9"/><line x1="0" y1="512" x2="${S}" y2="512" stroke="#fff" stroke-opacity="0.22" stroke-width="9"/>` },
};

// Cores de torcida (SEM nome/escudo de clube — nomeadas por cor)
const COLORS = {
  'preto-vermelho': ['#1A1A1A', '#D00000'],
  'verde-branco': ['#0A7A33', '#FFFFFF'],
  'azul-branco': ['#0A47A0', '#FFFFFF'],
  'vermelho-branco': ['#C8102E', '#FFFFFF'],
  'preto-branco': ['#141414', '#FFFFFF'],
  'azul-vermelho': ['#0A2A66', '#C8102E'],
};

// ---------- Monta a lista final ----------
const ICONS = [];
for (const [id, def] of Object.entries(STYLES)) ICONS.push({ id, defs: def.defs, bg: def.bg, ballR: 320, cy: 512 });
for (const [id, flag] of Object.entries(FLAGS)) ICONS.push({ id: `sel-${id}`, defs: '', bg: flag, ballR: 268, cy: 520 });
for (const [id, [c1, c2]] of Object.entries(COLORS)) {
  ICONS.push({ id: `cor-${id}`, defs: grad(`g-${id}`, c1, c2), bg: `${rect(`url(#g-${id})`)}`, ballR: 300, cy: 512 });
}

await mkdir(OUT, { recursive: true });
for (const ic of ICONS) {
  const b = ball(512, ic.cy, ic.ballR, ic.id);
  const svg = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>${ic.defs}${b.defs}</defs>
    ${ic.bg}
    ${b.body}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, `icon-${ic.id}.png`));
}
console.log(`${ICONS.length} ícones gerados em ${OUT}`);
console.log(ICONS.map((i) => i.id).join(', '));
