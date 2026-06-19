// Gera o feature graphic (1024x500) do Google Play com a bola realista (o próprio
// ícone do app) + wordmark, na identidade do app (Saira Condensed, verde→teal, âmbar).
// Renderização: monta um HTML autocontido (fontes + imagem em base64) e o Chrome
// headless tira o screenshot no tamanho exato. Saída: store/feature-graphic-v2.html
// (o screenshot é feito pelo comando que chama este script).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (p) => readFileSync(join(root, p)).toString('base64');

const icon = b64('assets/icon.png');
const fontBlack = b64('node_modules/@expo-google-fonts/saira-condensed/900Black/SairaCondensed_900Black.ttf');
const fontSemi = b64('node_modules/@expo-google-fonts/saira-condensed/600SemiBold/SairaCondensed_600SemiBold.ttf');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'SC';font-weight:900;src:url(data:font/ttf;base64,${fontBlack}) format('truetype');}
@font-face{font-family:'SCsemi';font-weight:600;src:url(data:font/ttf;base64,${fontSemi}) format('truetype');}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1024px;height:500px;overflow:hidden;}
.banner{width:1024px;height:500px;position:relative;display:flex;align-items:center;
  background:linear-gradient(120deg,#0BA968 0%,#0E8FB0 100%);overflow:hidden;}
/* brilho radial sutil atrás do ícone */
.glow{position:absolute;left:60px;top:50%;transform:translateY(-50%);width:520px;height:520px;
  background:radial-gradient(circle,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 62%);}
/* faixa decorativa diagonal bem leve */
.stripe{position:absolute;right:-120px;top:-80px;width:520px;height:680px;transform:rotate(18deg);
  background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0));}
.icon{position:relative;width:300px;height:300px;margin-left:78px;border-radius:66px;
  box-shadow:0 24px 60px rgba(0,0,0,.35);object-fit:cover;flex:none;}
.txt{position:relative;margin-left:60px;}
.word{font-family:'SC';font-weight:900;text-transform:uppercase;line-height:.94;
  letter-spacing:.3px;color:#FFFFFF;font-size:74px;text-shadow:0 4px 18px rgba(0,0,0,.25);}
.word .cup{color:#FFC233;}
.tag{font-family:'SCsemi';font-weight:600;color:rgba(255,255,255,.94);font-size:33px;
  margin-top:14px;letter-spacing:.3px;}
</style></head><body>
<div class="banner">
  <div class="stripe"></div>
  <div class="glow"></div>
  <img class="icon" src="data:image/png;base64,${icon}"/>
  <div class="txt">
    <div class="word">Acompanhador<br><span class="cup">da Copa</span></div>
    <div class="tag">Suas seleções, todos os jogos</div>
  </div>
</div>
</body></html>`;

writeFileSync(join(root, 'store/feature-graphic-v2.html'), html);
console.log('HTML gerado: store/feature-graphic-v2.html');
