# PROMPT: Construir um clone do jogo "7a0 — Sete a Zero"

Você vai construir um jogo de navegador chamado **Sete a Zero**: um draft + simulador de Copa do Mundo. O usuário rola um dado, recebe uma dupla (seleção + edição de Copa), escala um craque real que esteve naquele elenco, completa os 11 e simula uma campanha de Copa inteira. A pergunta central do jogo é: o time consegue fazer "7 a 0"?

Detalhe conceitual mais importante, não erre isso: **"7 a 0" NÃO é um placar de 7x0 numa partida. São 7 vitórias e 0 tropeços (0 empates e 0 derrotas) ao longo da campanha**. Uma Copa tem 3 jogos de fase de grupos + oitavas + quartas + semifinal + final = 7 jogos. Ganhar os 7 é a campanha perfeita, o "7 a 0".

Siga a especificação abaixo com fidelidade. Os números de balanceamento são exatos, não invente outros.

---

## 1. STACK E ARQUITETURA

- App de navegador (desktop e mobile), tudo client-side. Pode usar Next.js (App Router) com React, ou Vite + React. Sem necessidade de login, sem download, sem microtransação.
- Internacionalização via rota de locale (pt, en, es). Textos da UI em arquivos de tradução.
- Estado do jogo todo no cliente (React state ou um store leve tipo Zustand). Sem backend obrigatório para jogar.
- Dois endpoints opcionais de servidor:
  - `GET /squads/{slug}.json`: carrega um elenco sob demanda, formato `{ sel, copa, squad: [...] }`.
  - `POST /api/shorten`: encurtador para gerar código curto de compartilhamento do time montado.
- Tudo precisa ser **determinístico a partir de uma seed** (string). A mesma seed reproduz exatamente os mesmos sorteios e a mesma simulação. Isso é o que permite o compartilhamento e o modo "com amigos".

---

## 2. MODELO DE DADOS

### Jogador
```
{
  playerId: string,      // id único
  name: string,
  positions: string[],   // posições que o jogador pode ocupar (pode ser mais de uma)
  force: number          // overall / rating, 0 a 99
}
```

### Elenco (squad)
```
{
  sel: string,           // nome da seleção, ex: "Brasil"
  copa: number,          // ano da Copa, ex: 1970
  squad: Player[]        // todos os convocados reais daquela seleção naquela Copa
}
```

### Escala do banco de dados (números reais)
- **52 seleções, 250 elencos (seleção+ano), ~5.600 a 5.729 jogadores**, cobrindo as **20 Copas de 1950 a 2026**.
- Cada elenco contém apenas jogadores que de fato foram convocados para aquela seleção naquela edição. A graça é histórica: o jogador escolhido tem que ter estado lá.
- **Use o arquivo `base_7a0_completa.json` (anexo) como banco de dados canônico.** Ele já traz os 250 elencos com jogadores reais, posições, ratings calibrados (0 a 99), número da camisa e a flag de lenda. Formato de cada item: `{ sel, nome, copa, squad: [{ n (nome), pos[], r (rating), num, leg (booleano) }] }`. Para servir no padrão `/squads/{slug}.json`, basta quebrar esse JSON por elenco (slug no formato `SEL-ANO-hash`, ex: `BRA-1970-4b0e863a`).
- A flag `leg` (lenda) marca o craque histórico daquele elenco. Use-a para destaque visual e como dica no modo Almanaque.

### Cobertura: as 52 seleções
Alemanha (e Alemanha Ocidental), Argentina, Argélia, Austrália, Brasil, Bulgária, Bélgica, Camarões, Chile, Colômbia, Coreia do Sul, Costa Rica, Costa do Marfim, Croácia, Dinamarca, Egito, Equador, Escócia, Espanha, Estados Unidos, França, Gana, Grécia, Holanda, Hungria, Inglaterra, Irlanda, Irlanda do Norte, Itália, Iugoslávia, Japão, Marrocos, México, Nigéria, Paraguai, País de Gales, Peru, Polônia, Portugal, Romênia, Rússia, Senegal, Suécia, Suíça, Sérvia, Tchecoslováquia, Tchéquia, Turquia, Ucrânia, União Soviética, Uruguai, Áustria.

Quantidade de elencos por seleção (presença histórica): Brasil 20, Argentina 17, Alemanha 15, Inglaterra 14, França 13, Itália 13, Espanha 9, México 9, Holanda 8, Uruguai 7, Iugoslávia 6, e assim por diante até seleções com 1 só participação (Rússia, Sérvia, Ucrânia, Irlanda do Norte, País de Gales).

### Elencos por Copa
1950: 12 · 1954: 13 · 1958: 12 · 1962: 12 · 1966: 11 · 1970: 10 · 1974: 10 · 1978: 11 · 1982: 12 · 1986: 15 · 1990: 13 · 1994: 12 · 1998: 13 · 2002: 15 · 2006: 13 · 2010: 14 · 2014: 15 · 2018: 14 · 2022: 13 · 2026: 10. (Tamanho médio de elenco: ~22 jogadores.)

### Calibragem de ratings (referência real do jogo)
Os ratings funcionam como uma "foto" do jogador naquele torneio específico, com peso maior para o que ele fez dentro daquela Copa, não a carreira inteira. Topo da escala (rating 99): Yashin (URSS 1958), Pelé (Brasil 1970), Maradona (Argentina 1986), Neuer (Alemanha 2014), Messi (Argentina 2022). Faixa 96 a 98: Garrincha 1962, Beckenbauer 1974, Cruyff 1974, Platini 1982, Ronaldo 2002, Puskás 1954, Romário 1994. Titulares de seleções fortes ficam na casa dos 80 a 90; reservas e seleções menores, abaixo de 80. Mantenha essa lógica ao calibrar qualquer jogador novo.

### Ofuscação de rating (anti-scraping, recomendado)
No JSON servido, guarde o rating num campo `f` ofuscado por XOR com um hash FNV-1a do `playerId`, e desofusque no cliente:
```js
function deobfuscateForce(fStored, playerId) {
  let h = 0x811c9dc5;
  const key = playerId + "7a0::alm::v1";
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (fStored ^ (h >>> 0 & 255)) & 255;
}
```
Isso evita que alguém leia os ratings direto do JSON (importa por causa do modo Almanaque, em que os ratings ficam escondidos).

---


### Elencos icônicos completos (exemplos diretos da base)
Use estes como referência de formato e calibragem. * = lenda. Formato: Nome [posições] rating.

**Brasil 1970** (sel `BRA`):  Pelé [MEI,CA,PD] 99* · Jairzinho [PD,CA] 95* · Carlos Alberto [LD,MD] 90* · Rivellino [ME,MEI,PE] 90* · Gérson [MC,ME,MEI] 89 · Tostão [CA,PE] 87 · Clodoaldo [VOL] 86 · Piazza [ZAG,VOL] 82 · Brito [ZAG] 80 · Leão [GOL] 78 · Everaldo [LE,ME] 77 · Félix [GOL] 76 · Marco Antônio [LE,ME] 76 · Caju [ME,PE,MEI] 76 · Edu [PE,CA] 75 · Roberto Miranda [CA,PD] 72 · Dario [CA] 72 · Zé Maria [LD,MD] 72 · Joel Camargo [ZAG] 70 · Fontana [ZAG] 69 · Ado [GOL] 68 · Baldocchi [ZAG] 68

**Argentina 1986** (sel `ARG`):  Maradona [MEI,PE,CA] 99* · Burruchaga [MEI,MD,PD] 85 · Valdano [CA,PE] 85 · Ruggeri [ZAG] 83 · Batista [VOL] 82 · Passarella [ZAG] 82 · Pumpido [GOL] 81 · Brown [ZAG] 80 · Giusti [VOL,MC,MD] 80 · Olarticoechea [LE,ME] 78 · Cuciuffo [ZAG,LD] 76 · Enrique [VOL,MC,MD] 76 · Pasculli [CA,PD] 76 · Bochini [MEI,ME] 75 · Clausen [LD,MD] 75 · Garré [LE,ME] 75 · Borghi [VOL,MC,MEI,MD] 74 · Tapia [MC,ME,MEI] 72 · Trobbiani [VOL,MC,MEI,MD] 71 · Almirón [CA,PD] 70 · Islas [GOL] 70 · Zelada [GOL] 68

**Holanda 1974** (sel `NED`):  Cruyff [CA,PE,MEI] 97* · Neeskens [VOL,MC,MD] 91* · Van Hanegem [MEI,ME] 88 · Rensenbrink [PE,PD,CA] 86 · Krol [LE,ZAG] 85 · Haan [VOL,MC,ZAG,MD] 83 · Rep [PD,CA] 82 · Suurbier [LD,MD] 81 · Jansen [MD,VOL] 80 · Rijsbergen [ZAG,LD] 79 · Israël [ZAG] 79 · R. Van de Kerkhof [VOL,MD,PD,MC] 78 · Jongbloed [GOL] 76 · W. Van de Kerkhof [MD,VOL] 76 · Keizer [PE,ME] 76 · De Jong [VOL,MC,MD] 75 · Geels [CA,PD] 74 · Schrijvers [GOL] 73 · Van Ierssel [ZAG,LD] 71 · Strik [ZAG,VOL] 70 · Vos [ZAG,LD] 69 · Treijtel [GOL] 68

**Argentina 2022** (sel `ARG`):  Messi [MEI,CA] 99* · E. Martínez [GOL] 88 · J. Álvarez [CA,PD] 84 · Di María [MD,PD,ME] 84 · C. Romero [ZAG] 84 · De Paul [VOL,MC,MD] 83 · Lautaro [CA,PE] 82 · Enzo Fernández [VOL,MC,MD] 82 · Otamendi [ZAG] 81 · Mac Allister [MC,ME,MEI] 81 · Acuña [LE,ME] 80 · L. Martínez [ZAG,LE] 80 · Tagliafico [LE] 79 · Paredes [VOL] 79 · Dybala [PD,CA,MEI] 79 · Molina [LD,MD] 78 · Foyth [LD,ZAG] 77 · Palacios [VOL,MD] 77 · Guido Rodríguez [VOL] 77 · Montiel [LD,MD] 76 · Correa [PD,CA,PE] 76 · Papu Gómez [ME,MEI,PE] 76 · Armani [GOL] 75 · Pezzella [ZAG] 75 · Almada [ME,MEI,PE] 73 · Rulli [GOL] 72

## 3. POSIÇÕES (12 tipos)

```
GOL  goleiro
LD   lateral direito
ZAG  zagueiro
LE   lateral esquerdo
VOL  volante (meio defensivo)
MD   meia direita
MC   meio-campo central
ME   meia esquerda
MEI  meia ofensivo / armador
PD   ponta direita
CA   centroavante
PE   ponta esquerda
```

---

## 4. FORMAÇÕES E TÁTICAS

Ofereça **8 formações**: `4-3-3`, `4-4-2`, `4-2-3-1`, `4-2-4`, `3-5-2`, `5-3-2`, `4-5-1`, `3-4-3`.

Cada formação tem **3 variantes táticas**: `defensivo`, `equilibrado`, `ofensivo`. Cada variante é uma lista fixa de 11 slots, onde cada slot tem uma `pos` (uma das 12 acima) e coordenadas `{x, y}` no campo (0 a 100, para desenhar o time no gramado).

A tática muda a composição de posições. Exemplo real do `4-3-3`:
- **defensivo**: GOL, LD, ZAG, ZAG, LE, VOL, VOL, MC, PD, CA, PE  (dois volantes, mais sólido atrás)
- **equilibrado**: GOL, LD, ZAG, ZAG, LE, VOL, MC, MEI, PD, CA, PE
- **ofensivo**: GOL, LD, ZAG, ZAG, LE, MC, MC, MEI, PD, CA, PE  (sem volante, entra MEI, mais ofensivo)

Padrões: formação `4-3-3`, estilo `equilibrado`, modo `classico`.

Monte as 11 posições de cada uma das 24 combinações (8 formações × 3 táticas) seguindo essa lógica (defensivo puxa para VOL/ZAG, ofensivo puxa para MEI/PD/PE/CA). As coordenadas `{x,y}` são só para layout visual.

---

## 5. MODOS DE JOGO

```
classico:  { rerolls: 3, statsVisible: true }   // vê o rating (force) de cada jogador
almanaque: { rerolls: 1, statsVisible: false }   // ratings escondidos, vale a memória
```

- **Clássico**: mostra o rating de cada jogador no draft. Decisão guiada por dado. 3 re-sorteios.
- **Almanaque**: esconde os ratings. O jogador precisa saber, de cabeça, quem era craque naquele elenco. 1 re-sorteio só. É bem mais difícil.

---

## 6. RNG DETERMINÍSTICO (seed)

Tudo deriva de uma seed string. Use um hash (estilo xmur3) para semear um PRNG (estilo mulberry32). Cada ação usa uma subseed derivada por concatenação de string, para que cada etapa seja reproduzível e independente:

- Sorteio da rodada N: `` `${seed}:roll:${rollIndex}` ``
- Re-sorteio: `` `${seed}:roll:${rollIndex}:rr:${rerollNo}:${axis}` ``
- Simulação da campanha: `` `${seed}:copa` ``
- Gols/artilheiros de um jogo: `` `${seed}:copa:gols` `` e `` `${seed}:copa:min:${i}` ``
- Pênaltis: `` `${seed}:copa:pen:${i}` ``

Função de escolha ponderada (usada no sorteio):
```js
function pickWeighted(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    if ((r -= weights[i]) <= 0) return items[i];
  }
  return items[items.length - 1];
}
```

---

## 7. LOOP DE DRAFT (montagem do time)

1. Antes de começar: o usuário escolhe **formação**, **tática** e **modo**.
2. **Rolar o dado**: sorteia (de forma ponderada e com seed) uma dupla `(seleção, edição de Copa)`. Mostra o elenco real daquela seleção naquela Copa.
3. **Escalar**: o usuário escolhe **um** jogador daquele elenco cujas `positions` cubram algum slot ainda vago da escalação. Cada jogador só pode ser usado uma vez (`usedPlayerIds`).
4. **Re-sorteio** (limitado pelo modo): pode re-sortear para tentar outra dupla. Os eixos de re-sorteio são `["selecao", "copa"]` (pode trocar a seleção ou a edição).
5. Repete até os **11 slots** preenchidos.
6. Permita ainda **mover jogadores** entre slots compatíveis (se as posições baterem) antes de simular.

Quando os 11 estiverem preenchidos, libera o botão **Simular**.

---

## 8. CÁLCULO DE FORÇA DO TIME (núcleo do balanceamento)

Cada posição tem um peso de **ataque** e um de **defesa**. Use exatamente estes valores:

```js
const PESO_ATAQUE = {
  GOL: 0,   LD: 0,   ZAG: 0,  LE: 0,
  MD: 0.5,  ME: 0.5, VOL: 0.2, MC: 0.5, MEI: 0.8,
  PD: 1,    CA: 1,   PE: 1
};
const PESO_DEFESA = {
  GOL: 1,   LD: 1,   ZAG: 1,  LE: 1,
  MD: 0.5,  ME: 0.5, VOL: 0.8, MC: 0.5, MEI: 0.2,
  PD: 0,    CA: 0,   PE: 0
};
```

A partir dos 11 slots preenchidos:
```js
function calcularForcas(slots, jogadores) {
  let an = 0, ad = 0, dn = 0, dd = 0, soma = 0, n = 0;
  slots.forEach((slot, i) => {
    const p = jogadores[i];
    const wa = PESO_ATAQUE[slot.pos];
    const wd = PESO_DEFESA[slot.pos];
    ad += wa; dd += wd;
    if (p) { an += p.force * wa; dn += p.force * wd; soma += p.force; n++; }
  });
  return {
    attack:  ad > 0 ? Math.round(an / ad) : 0,
    defense: dd > 0 ? Math.round(dn / dd) : 0,
    overall: n  > 0 ? Math.round(soma / n) : 0
  };
}
```

Resultado: o `attack` é a média dos ratings ponderada pelo peso ofensivo das posições, o `defense` idem pelo peso defensivo, e o `overall` é a média simples dos 11. Trocar a tática muda as posições, logo muda attack e defense. É por isso que a tática importa.

---

## 9. ESTRUTURA DO TORNEIO (rampa de dificuldade)

A campanha tem 7 jogos, com o overall do adversário subindo a cada fase:

```js
const FASES = [
  { key: "GRUPOS", type: "group", opponents: [
    { label: "Grupo · 1º jogo", overall: 68 },
    { label: "Grupo · 2º jogo", overall: 72 },
    { label: "Grupo · 3º jogo", overall: 76 }
  ]},
  { key: "OITAVAS", type: "knockout", opponent: { label: "Oitavas",   overall: 79 } },
  { key: "QUARTAS", type: "knockout", opponent: { label: "Quartas",   overall: 83 } },
  { key: "SEMI",    type: "knockout", opponent: { label: "Semifinal", overall: 87 } },
  { key: "FINAL",   type: "knockout", opponent: { label: "Final",     overall: 91 } }
];
```

---

## 10. MODELO DE GOLS (Poisson)

Constantes exatas:
```js
const MODELO   = { baseLambda: 1.4, slope: 0.08, minLambda: 0.15, maxLambda: 5 };
const PENALTI  = { base: 0.5, slope: 0.012, min: 0.1, max: 0.9 };
const BADGE    = { esmagadorGD: 18 };
```

Lambda (gols esperados) de um lado contra o outro:
```js
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function lambda(forcaAtacante, forcaDefensorAdv) {
  const { baseLambda, slope, minLambda, maxLambda } = MODELO;
  return clamp(baseLambda + (forcaAtacante - forcaDefensorAdv) * slope, minLambda, maxLambda);
}
```

Amostragem de Poisson (algoritmo de Knuth, usando o rng com seed):
```js
function poisson(rng, lam) {
  if (lam <= 0) return 0;
  const L = Math.exp(-lam);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}
```

Uma partida (meu `attack` e `defense` contra o `overall` do adversário):
```js
function simularPartida(rng, attack, defense, advOverall) {
  const gf = poisson(rng, lambda(attack, advOverall));   // meus gols: meu ataque vs força geral deles
  const ga = poisson(rng, lambda(advOverall, defense));  // gols deles: força geral deles vs minha defesa
  return { gf, ga, outcome: gf > ga ? "V" : gf < ga ? "D" : "E" };  // Vitória / Derrota / Empate
}
```

---

## 11. FASE DE GRUPOS

- Jogam-se os 3 jogos do grupo (overall 68, 72, 76).
- Monte a tabela do grupo com pontos (vitória 3, empate 1, derrota 0) e critérios de desempate: pontos, depois saldo de gols, depois gols feitos.
- O time **avança** se terminar entre os 2 primeiros. Se não avançar, a campanha termina ali.
- Revele a campanha **jogo a jogo** (ofereça uma opção de simular sem spoiler, mostrando um jogo de cada vez, e uma de auto-simular até o fim).

---

## 12. MATA-MATA E PÊNALTIS

Cada jogo eliminatório usa `simularPartida`. Resolução:
- `outcome === "V"`: avança.
- `outcome === "D"`: eliminado, campanha encerra.
- `outcome === "E"` (empate): vai para os pênaltis. A probabilidade de vencer a disputa é função da diferença de overall:
```js
function probPenaltis(meuOverall, advOverall) {
  const { base, slope, min, max } = PENALTI;
  return clamp(base + (meuOverall - advOverall) * slope, min, max); // 0.5 ± 0.012 por ponto, travado entre 0.1 e 0.9
}
// avança se rng() < probPenaltis(...)
```
- Mostre os pênaltis **cobrança por cobrança**: simule 5 cobranças de cada lado, cada uma com ~78% de conversão, repetindo em morte súbita até desempatar, de forma consistente com o vencedor já determinado acima. (O resultado da disputa é decidido pela probabilidade; a sequência de cobranças é só a encenação coerente.)

Perder qualquer eliminatória encerra a campanha.

---

## 13. ARTILHEIROS E MINUTOS

Para cada jogo, gere os minutos dos gols (1 a 90, com distribuição levemente ponderada) e atribua os autores: escolha entre os jogadores de pegada ofensiva do seu time (ponderado pelo peso de ataque da posição / pela força), usando o rng com seed do jogo. Mostre os gols do adversário também. Isso alimenta a "ficha" da partida.

---

## 14. RESULTADO FINAL, RECORDE E BADGES

Ao fim da campanha, calcule:
```js
const champion = !eliminado;                                  // venceu todas as eliminatórias
const perfect  = champion && wins === 7 && draws === 0 && losses === 0;  // o "7 a 0"
const muralha  = champion && golsSofridos === 0;              // não tomou nenhum gol no torneio
let badge = null;
if (perfect && (golsFeitos - golsSofridos) >= BADGE.esmagadorGD) badge = "ESMAGADOR DE RECORDES";
else if (muralha) badge = "MURALHA";

const record = `${wins}-${losses}`;
```

Resumo a exibir: recorde (V-D), gols feitos e sofridos, campeão ou não, `perfect` (7 a 0), badge conquistado, e a escalação completa dos 11. Inclua a campanha jogo a jogo com placares, artilheiros e tabela de grupo.

Badges:
- **7 a 0 / Campanha perfeita**: 7 vitórias, 0 empates, 0 derrotas.
- **MURALHA**: campeão sem sofrer gol.
- **ESMAGADOR DE RECORDES**: campanha perfeita com saldo de gols ≥ 18.

---

## 15. COMPARTILHAMENTO E MULTIPLAYER

- Ao concluir uma campanha, gere um **código de compartilhamento** compacto que contém só a composição do time (quais jogadores em quais posições) e a seed. Sem dado pessoal. Permita carregar um código de outra pessoa para reproduzir exatamente o mesmo time e comparar resultados. Use um endpoint `/api/shorten` para encurtar o código, se quiser.
- Modo **"Com amigos"**: cada um monta sua seleção e as duas simulam um confronto direto (use a mesma engine de partida, com `attack`/`defense`/`overall` de cada time). Determinístico pela seed combinada.

---

## 16. IDENTIDADE VISUAL E UX

- Estética de "feito por um amigo no intervalo do jogo", clean, mobile-first. Uma partida inteira leva ~2 minutos.
- Cor de tema escura, fundo `#0B1A12` (verde escuro). Placar estilizado "7–:0" como marca.
- Tela inicial: chamada "Role o dado, monte sua seleção dos sonhos", botão "Jogar agora", contadores ("X seleções · Y elencos · Z jogadores").
- Fluxo em 3 passos comunicados na home: **01 Role** (sorteia seleção e Copa) · **02 Monte** (escale um craque que jogou ali) · **03 Simule** (veja se faz 7 a 0).
- Desenhe o campo com os 11 nos pontos `{x,y}` da tática escolhida. Mostre o overall do time atualizando a cada escolha (no modo Clássico).
- Suporte a pt, en, es.

---

## 17. CHECKLIST DE FIDELIDADE

- [ ] "7 a 0" = 7 vitórias na campanha, não placar de uma partida.
- [ ] Pesos de ataque/defesa por posição exatamente como na seção 8.
- [ ] Overall dos adversários: 68, 72, 76, 79, 83, 87, 91.
- [ ] Modelo de gols Poisson: base 1.4, slope 0.08, clamp 0.15 a 5.
- [ ] Pênaltis: base 0.5, slope 0.012, clamp 0.1 a 0.9; cobrança a cobrança a ~78%.
- [ ] Modos: Clássico (3 re-sorteios, ratings visíveis) e Almanaque (1 re-sorteio, ratings ocultos).
- [ ] 8 formações × 3 táticas, e a tática muda a composição de posições.
- [ ] Tudo determinístico por seed; jogador real de elenco real (1950 a 2026).
- [ ] Fase de grupos com tabela e top 2 avança; mata-mata até a final.
- [ ] Badges: 7 a 0, MURALHA (sem sofrer gol), ESMAGADOR DE RECORDES (saldo ≥ 18).
- [ ] Compartilhamento do time por código + modo com amigos.

Construa o jogo completo, jogável de ponta a ponta. Comece pela engine de simulação (seções 8 a 14), carregue o banco de dados a partir do arquivo anexo `base_7a0_completa.json` (250 elencos reais já calibrados), e então monte a UI de draft e a tela de resultado. Não invente jogadores nem ratings: use os dados da base. Se precisar testar com um subconjunto, comece por Brasil 1970, Argentina 1986, Holanda 1974, França 1998 e Argentina 2022, todos presentes na base.
