# 🏆 Copa 2026 — Acompanhador de Seleções

App (iOS + Android, feito com Expo/React Native) para você **escolher seleções** da Copa do Mundo de 2026 e ser **avisado no celular**:

- 📅 **Resumo do dia** — pela manhã, os jogos das suas seleções naquele dia.
- ⚽ **Jogo começando** — um lembrete X minutos antes de cada jogo.
- 🥅 **Gol ao vivo** — _previsto para a Fase 2_ (precisa de servidor, veja abaixo).

As notificações são **agendadas localmente no aparelho** (a tabela inteira da fase de grupos já é conhecida), então funcionam **offline** e sem custo de servidor.

## Como rodar

```bash
npm install
npm start          # abre o Expo; leia o QR Code com o app Expo Go no celular
# ou
npm run ios        # simulador iOS (precisa de Xcode)
npm run android    # emulador Android
```

> Notificações **não** funcionam no Expo Go em todas as situações (especialmente push remoto). Para testar de verdade, gere um _development build_:
> ```bash
> npx expo install expo-dev-client
> npx expo run:ios      # ou run:android
> ```

## Estrutura

```
assets/data/fixtures.json   # 72 jogos da fase de grupos (fonte: TheSportsDB)
src/data/teams.ts           # 48 seleções: nome PT, bandeira, grupo
src/data/fixtures.ts        # tipos + filtros (jogos por seleção)
src/lib/notifications.ts    # agendamento das notificações locais
src/lib/store.tsx           # estado global (seleções + preferências)
src/screens/                # Jogos, Seleções, Avisos
scripts/update-fixtures.mjs # atualiza a tabela pela API
```

## Atualizar a tabela de jogos

```bash
npm run update-fixtures
```

Puxa os dados mais recentes da [TheSportsDB](https://www.thesportsdb.com/) (liga 4429 = FIFA World Cup, temporada 2026). Quando os mata-matas forem definidos, os jogos das fases seguintes passam a aparecer automaticamente.

## Roadmap

- [x] Selecionar seleções e ver a agenda
- [x] Notificação de resumo do dia
- [x] Notificação de "jogo começando"
- [ ] **Gol ao vivo** (Fase 2): um servidor consulta o placar ao vivo (TheSportsDB / API-Football) durante os jogos das suas seleções e dispara _push_ via [Expo Push](https://docs.expo.dev/push-notifications/overview/). Requer um backend pequeno (ex.: Cloud Function + cron) e o registro do _push token_ do aparelho.
- [ ] Fases de mata-mata (já suportado pelo `update-fixtures` quando os confrontos saírem)
- [ ] Ícone/splash definitivos (hoje são placeholders verdes)

## Publicar nas lojas

```bash
npm install -g eas-cli
eas login
eas build --platform all      # gera os binários (.ipa / .aab)
eas submit --platform ios     # envia pra App Store Connect
eas submit --platform android # envia pro Google Play
```

Ajuste `ios.bundleIdentifier` e `android.package` no `app.json` para os IDs da sua conta de desenvolvedor.
