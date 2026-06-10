# Screenshots da loja

Screenshots **precisam ser do app real** (Apple rejeita mockups/placeholder).
O jeito mais limpo é capturar num **simulador iOS** e num **emulador Android** com
o app rodando, em telas com as suas seleções marcadas (ex.: Brasil, Argentina,
França, Portugal) para a agenda e os grupos ficarem cheios.

## Tamanhos exigidos

### Apple App Store (iPhone — `supportsTablet:false`, então não precisa iPad)
- **6.9"** (obrigatório): 1290 × 2796 px (iPhone 15/16 Pro Max) — 1 a 10 imagens
- **6.5"** (recomendado): 1242 × 2688 px
- Formato PNG ou JPG, sem transparência, retrato.

### Google Play
- **Phone** (obrigatório): mín. 2, até 8. Lado mínimo 1080 px, proporção entre 16:9 e 9:16 (ex.: 1080 × 1920 ou 1080 × 2400).
- **Ícone hi-res:** 512 × 512 PNG (já temos `assets/icon.png` 1024 — exportar 512).
- **Feature graphic** (obrigatório): 1024 × 500 PNG/JPG (banner do topo da página).

## Roteiro sugerido (5 telas) + legendas
1. **Onboarding** — "Não perca nenhum jogo das suas seleções"
2. **Jogos** (com o card de destaque/contagem) — "A agenda das suas seleções, no seu fuso"
3. **Grupos** (tabela) — "Acompanhe a classificação dos 12 grupos"
4. **Detalhe do jogo** — "Data, estádio e a tabela do grupo num toque"
5. **Avisos** — "Avisos de jogo começando e resumo do dia"

As legendas ficam melhores compostas sobre uma faixa (não na barra de status).
Ferramentas que ajudam a emoldurar/legendar: **fastlane frameit**, **Screenshots.pro**,
ou montagem manual no Figma/Canva.

## Como capturar

### iOS (simulador)
```bash
# precisa do Xcode instalado
npx expo run:ios            # builda e abre no simulador (1ª vez demora)
# com a tela desejada aberta:
xcrun simctl io booted screenshot ~/Desktop/copa-ios-1.png
```
Use um device 6.9" no simulador (iPhone 16 Pro Max) para já sair no tamanho certo.

### Android (emulador)
```bash
npx expo run:android
adb exec-out screencap -p > ~/Desktop/copa-android-1.png
```

### Feature graphic (1024×500)
Pode ser gerado a partir do ícone + nome do app + tagline (posso montar um pra você
quando quiser).

> Dica: capture com as notificações já ativadas e algumas seleções marcadas, durante
> a Copa (a partir de 11/06) os placares e a tabela aparecem preenchidos e ficam mais
> atraentes nas imagens.
