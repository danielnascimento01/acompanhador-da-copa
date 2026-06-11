#!/usr/bin/env node
/**
 * Gera o ícone do app (troféu genérico + bola) e suas variações de fundo
 * para o seletor de ícones alternativos (estilo GitHub).
 *
 * Uso: node scripts/generate-icons.mjs
 * Saída: store/icons/icon-<nome>.png (1024×1024)
 *
 * ⚠️ O troféu é uma taça de campeão GENÉRICA criada do zero — não reproduzir
 * o troféu da FIFA (marca registrada) nem usar fotos de estoque.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'store', 'icons');

const GOLD_DEFS = `
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFE08A"/><stop offset="0.55" stop-color="#F4C430"/><stop offset="1" stop-color="#D89A18"/>
  </linearGradient>
  <linearGradient id="goldDark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#E8B53A"/><stop offset="1" stop-color="#A8730E"/>
  </linearGradient>
  <radialGradient id="ballGloss" cx="0.35" cy="0.28" r="0.8">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>`;

function trophy() {
  const ballCy = 320;
  const pent = `512,${ballCy - 58} 558,${ballCy - 24} 540,${ballCy + 30} 484,${ballCy + 30} 466,${ballCy - 24}`;
  const seams = [
    [512, ballCy - 58, 512, ballCy - 122],
    [558, ballCy - 24, 624, ballCy - 46],
    [540, ballCy + 30, 578, ballCy + 86],
    [484, ballCy + 30, 446, ballCy + 86],
    [466, ballCy - 24, 400, ballCy - 46],
  ]
    .map((s) => `<line x1="${s[0]}" y1="${s[1]}" x2="${s[2]}" y2="${s[3]}"/>`)
    .join('');

  return `
  <path d="M352 330 C 250 330 248 470 366 500" stroke="url(#gold)" stroke-width="40" fill="none" stroke-linecap="round"/>
  <path d="M672 330 C 774 330 776 470 658 500" stroke="url(#gold)" stroke-width="40" fill="none" stroke-linecap="round"/>
  <path d="M348 308 L 676 308 C 676 470 612 574 512 574 C 412 574 348 470 348 308 Z" fill="url(#gold)"/>
  <ellipse cx="512" cy="312" rx="164" ry="26" fill="#8A5E08" opacity="0.5"/>
  <circle cx="512" cy="${ballCy}" r="122" fill="#FFFFFF"/>
  <circle cx="512" cy="${ballCy}" r="122" fill="url(#ballGloss)"/>
  <g stroke="#0A0E13" stroke-width="11" stroke-linecap="round" fill="none">${seams}</g>
  <polygon points="${pent}" fill="#0A0E13"/>
  <circle cx="512" cy="${ballCy}" r="122" fill="none" stroke="#0A0E13" stroke-opacity="0.15" stroke-width="5"/>
  <path d="M390 340 C 396 440 430 510 470 540 L 446 545 C 408 505 382 440 376 350 Z" fill="#FFF3C4" opacity="0.5"/>
  <path d="M478 574 L 546 574 L 566 690 L 458 690 Z" fill="url(#gold)"/>
  <path d="M446 690 L 578 690 L 578 722 L 446 722 Z" fill="url(#goldDark)"/>
  <rect x="404" y="722" width="216" height="28" fill="#2FA45E"/>
  <rect x="360" y="750" width="304" height="58" rx="12" fill="url(#goldDark)"/>`;
}

/** Fundos das variações (defs extras + camadas de fundo). */
const VARIANTS = {
  // Padrão do app: escuro com glow dourado
  default: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#101820"/><stop offset="1" stop-color="#06090D"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.36" r="0.75">
        <stop offset="0" stop-color="#F4C430" stop-opacity="0.30"/><stop offset="0.65" stop-color="#F4C430" stop-opacity="0"/>
      </radialGradient>`,
    bg: `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>`,
  },
  // Verde→teal da identidade do app
  app: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0BA968"/><stop offset="1" stop-color="#0E8FB0"/>
      </linearGradient>`,
    bg: `<rect width="1024" height="1024" fill="url(#bg)"/><circle cx="512" cy="430" r="430" fill="#ffffff" opacity="0.07"/>`,
  },
  // Brasil 🇧🇷
  brasil: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0B7A3A"/><stop offset="1" stop-color="#064D24"/>
      </linearGradient>`,
    bg: `<rect width="1024" height="1024" fill="url(#bg)"/>
         <polygon points="512,90 950,512 512,934 74,512" fill="#FFD400" opacity="0.92"/>
         <circle cx="512" cy="512" r="300" fill="#0B4FA0" opacity="0.92"/>`,
  },
  // Campo de futebol (gramado + linha central)
  campo: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1E7A3F"/><stop offset="1" stop-color="#0F5228"/>
      </linearGradient>`,
    bg: `<rect width="1024" height="1024" fill="url(#bg)"/>
         ${[0, 2, 4, 6].map((i) => `<rect x="${i * 256 - 128}" y="0" width="128" height="1024" fill="#ffffff" opacity="0.05"/>`).join('')}
         <circle cx="512" cy="512" r="380" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="10"/>
         <line x1="0" y1="512" x2="1024" y2="512" stroke="#ffffff" stroke-opacity="0.25" stroke-width="10"/>`,
  },
  // Campeão: dourado total
  campeao: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8A5E08"/><stop offset="1" stop-color="#3D2A02"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.32" r="0.8">
        <stop offset="0" stop-color="#FFE08A" stop-opacity="0.45"/><stop offset="0.7" stop-color="#FFE08A" stop-opacity="0"/>
      </radialGradient>`,
    bg: `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>`,
  },
  // Noite de jogo: azul profundo com holofotes
  noite: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0A1E3C"/><stop offset="1" stop-color="#050B16"/>
      </linearGradient>`,
    bg: `<rect width="1024" height="1024" fill="url(#bg)"/>
         <polygon points="180,0 380,0 620,1024 300,1024" fill="#9CC4FF" opacity="0.10"/>
         <polygon points="640,0 840,0 740,1024 420,1024" fill="#9CC4FF" opacity="0.08"/>`,
  },
};

await mkdir(OUT_DIR, { recursive: true });
for (const [name, v] of Object.entries(VARIANTS)) {
  const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>${GOLD_DEFS}${v.defs}</defs>
    ${v.bg}
    <g transform="translate(0,40)">${trophy()}</g>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(OUT_DIR, `icon-${name}.png`));
  console.log(`  icon-${name}.png ✓`);
}
console.log(`\nÍcones em ${OUT_DIR}`);
