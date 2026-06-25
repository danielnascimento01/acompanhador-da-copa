# Sistema de Design — "Elevação 2026"

Refinamento do visual "transmissão de TV premium": **mesma estrutura e marca** (dark + verde-elétrico), com salto de hierarquia, respiro e materialidade. Bandeiras reais, ícones de linha, números tabulares. 4 abas + 6 sheets.

> Fonte: `Sistema de Design.html` (Claude Design) + 10 PDFs por tela em
> `~/Documents/prints acompanhador da copa para REDESIGN/REDESIGN/`.
> A **paleta é idêntica** ao `src/lib/theme.ts` atual — o trabalho é de
> componentes/materialidade, não de troca de cores.

## Princípios
Dado em 1º lugar · Energia sem poluição (menos é mais) · 100% PT-BR · Contraste AA · alvo de toque ≥44 · **tudo implementável em React Native**.

## Cores (= theme.ts atual)
**Base/superfícies:** bg `#080B10` · elevado `#0E131A` · superfície `#11161D` · superfície2 `#171E29` · borda `#222B38` · borda2 `#30404F`
**Texto:** texto `#F4F7FB` · dim `#8A97A8` · faint `#56616F`
**Marca/semântica:** verde (você/positivo) `#14E08A` · verde profundo `#0BA968` · teal `#15C2D6` · âmbar (palpite/3º) `#FFC233` · ao vivo/saldo− `#FF4D5E` · tinta (sobre verde) `#04070A`

**Cor semântica ÚNICA em todo o app:** verde = classifica/você · âmbar = disputa/palpite · vermelho = ao vivo/saldo−.

**Gradientes:**
- `live` `[#FF4D5E → #FF6A52 → #FF7A3D]` — card "acontecendo agora" (+ scrim)
- `hero` `[#0BA968 → #0E8FB0]` — agendado / notificações
- `acento` `[#14E08A → #15C2D6]` — barras de stat (lado A)
- `âmbar` `[#FFD15C → #FF8A3D]` — CTA de destaque

## Tipografia (Saira Condensed + Semi Condensed)
Condensed ExtraBold em títulos e placares/números. Semi Condensed (400–800) no corpo. **Números sempre tabulares.**

| Uso | Família/peso | Tamanho |
|---|---|---|
| display (título de tela) | Saira Cond 800 | 42 / lh40 / -0.5 |
| placar hero | Saira Cond 800 | 54 tabular |
| placar/hora na lista | Saira Cond 800 | 30/27 tabular |
| nome de time | Semi Cond 600–700 | 17–18 |
| eyebrow (kicker) | Semi Cond 700–800, verde | 12–13 / +1.4 / UPPER |
| corpo / meta | Semi Cond 500 | 15 · meta 13 dim |

## Espaço · Raio · Elevação
- **Escala (base 4):** 8 · 12 · 16 · 20 · 24 · 32 · 40
- **Gutter da tela 16 · gap entre cards 10 · padding de card 15–16**
- **Raios:** 10 · 16 · 22 · 28 · pill(999)
- **Elevação (NOVO — o app era chapado):**
  - `e1` card: `shadow 0 8px 20px rgba(0,0,0,.35)`
  - `e2` sheet: `0 -10px 30px rgba(0,0,0,.5)`
  - `glow live`: `0 12px 28px rgba(255,77,94,.3)`
  - `favorita`: bg `rgba(20,224,138,.07)` + borda `rgba(20,224,138,.55)`

## Componentes-chave (anatomia & estados)
- **Card "ao vivo":** r28, gradiente live + scrim de TV + halo pulsante. Flags 64 r20, placar 54 tabular, eventos com ⚽, CTA. Estados: ao vivo / agendado (hero) / encerrado (superfície2).
- **Linha de jogo:** r22. `[flag 42][nome][centro 74][nome][flag]`. Ao vivo: borda aoVivo/50% + selo pulsante. Agendado: hora + rodada. Palpite: chip âmbar. Favorita: verde + estrela.
- **Linha de tabela:** badge de posição (1/2 verde · 3 âmbar · 4 neutro) + flag 24 + nome + nums tabulares. SG verde(+)/vermelho(−). "P" em Saira Cond 800.
- **Barra de stat:** **bicolor dividida por time** (verde × teal); lado vencedor cor cheia, perdedor opacity .55. (Substitui o gradiente único que confundia.)
- **Toggle / segmented:** Switch 52×30 (ON verde). Segmented sólido (Resultados/Palpites, minutos, push de gol): ativo verde-tinta, inativo superfície2/dim.
- **Bracket / seleção:** confronto = 2 slots + conector de chave + nó. Seleção = avatar redondo + estrela (favoritar) + check verde (seguir) — funções **separadas**.

## Decisões principais (o que muda vs. hoje)
1. **Bandeiras reais** (chips/avatares arredondados) no lugar de emoji — consistência cross-device. *(exige assets de bandeira)*
2. **Ícones de linha monocromáticos** substituem emojis de seção; ⚽ mantido só em gol/produto.
3. **AO VIVO respira** sem poluir: scrim de transmissão + ponto/halo pulsante; mantém o full-bleed quente.
4. **Stat lê quem domina:** barra bicolor dividida por time.
5. **Cor semântica única** em todo o app.
6. **Favorita sutil:** estrela + realce verde discreto, sem faixa pesada.
7. **Materialidade:** sistema de elevação/sombra + números tabulares.

## Telas (PDFs de referência, na ordem do canvas)
01 Jogos (home) · 02 Detalhe do Jogo · 03 Grupos · 04 Mata-mata · 05 Seleções · 06 Avisos · 07 Artilheiros · 08 Sedes & Estádios · 09 História da Copa · 10 Ícone do app.

## Plano de implementação (React Native)
Mais materialidade/componentes do que cores. Por tela, ver o PDF correspondente, depois:
1. `theme.ts` — adicionar sistema de **elevação/sombra**, gradiente `live` de 3 stops, tokens de estado (favorita).
2. **Bandeiras reais** — decidir fonte dos assets (lib de flags por código ISO ou imagens) antes das telas que dependem disso.
3. Refazer componentes na ordem: card ao vivo / linha de jogo (Jogos) → linha de tabela (Grupos) → detalhe → bracket → demais sheets.
4. Cada tela vai por OTA (é só JS/estilo) e se valida no aparelho.
