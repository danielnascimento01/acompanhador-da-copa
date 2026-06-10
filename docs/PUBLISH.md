# 🚀 Publicar nas lojas — passo a passo

Guia para gerar o build com **EAS** e enviar pra App Store e Google Play.
Os comandos rodam na **sua conta** (Expo/Apple/Google) — execute você mesmo.

---

## 0. Pré-requisitos (uma vez)

- **Conta Expo** (grátis): https://expo.dev
- **Apple Developer Program** (US$ 99/ano): https://developer.apple.com/programs
- **Google Play Console** (US$ 25, pagamento único): https://play.google.com/console
- **EAS CLI:**
  ```bash
  npm install -g eas-cli
  eas login
  ```

## 1. Conectar o projeto ao EAS

```bash
cd ~/Desktop/acompanhador-de-copa-do-mundo
eas init      # cria o projeto no Expo e grava extra.eas.projectId no app.json
```
> Isso também define o `owner` (sua conta). Faça commit do `app.json` atualizado depois.

## 2. Primeiro build de teste (sair do Expo Go) ✅ recomendado começar aqui

Um build "preview" instalável, pra ver o app **com o ícone, sem Expo Go**:

```bash
# Android (APK que você instala direto no celular):
eas build -p android --profile preview

# iOS (precisa do seu Apple ID; instala via TestFlight ou registro do device):
eas build -p ios --profile preview
```
O build roda na nuvem do EAS; ao terminar, ele dá um **link/QR** pra instalar.
- No **Android**, baixe o `.apk` e instale.
- No **iOS**, o EAS pergunta as credenciais Apple e gera os certificados sozinho
  (deixe ele gerenciar). Para instalar sem TestFlight, registre o UDID do aparelho
  quando ele perguntar.

## 3. Build de produção (pra loja)

```bash
eas build -p android --profile production   # gera .aab (Play)
eas build -p ios --profile production       # gera .ipa (App Store)
```
O `eas.json` já está com `autoIncrement` e versionamento remoto — o EAS cuida do
`versionCode`/`buildNumber`.

## 4. Criar os apps nos consoles

### App Store Connect (Apple)
1. https://appstoreconnect.apple.com → **Apps → +** → New App
2. Plataforma iOS, nome **Acompanhador da Copa**, Bundle ID `com.danielnascimento.copa2026`
3. Preencher (textos em `store/LISTING.md`):
   - Descrição, subtítulo, palavras-chave, **URL da política de privacidade**, URL de suporte
   - **Privacy Nutrition Label:** marcar **"Data Not Collected"** (o app não coleta dados
     pessoais; as chamadas à TheSportsDB não enviam dados seus). Ver `docs/privacy-policy.html`.
   - **Age Rating:** responder o questionário → resultado **4+**
   - **Export Compliance:** usa só HTTPS padrão → "No" para criptografia não isenta
   - Screenshots 6.9" (ver `store/SCREENSHOTS.md`)
4. Nota para o revisor (sugestão):
   > App de agenda da Copa baseado em notificações **locais**. Para testar: aba Seleções →
   > marque um time → aba Avisos → "Ativar notificações". App não oficial, sem vínculo com a FIFA.

### Google Play Console
1. https://play.google.com/console → **Criar app** → nome, idioma, categoria **Esportes**
2. Preencher:
   - Descrição curta/completa (`store/LISTING.md`), ícone 512, **feature graphic 1024×500**, screenshots
   - **Política de privacidade (URL)** — obrigatória
   - **Data safety form:** declarar que **não coleta nem compartilha dados do usuário**
     (mencionar que o app acessa a internet para buscar dados de jogos de terceiros)
   - **Content rating (IARC):** questionário → **Livre para todos**
   - **Target API level:** o build do SDK 54 já atende o exigido pela Play

## 5. Enviar (submit)

```bash
# iOS → App Store Connect (precisa de uma App Store Connect API Key, o EAS te guia):
eas submit -p ios --profile production --latest

# Android → Play (precisa de uma Service Account JSON do Google Cloud, o EAS te guia):
eas submit -p android --profile production --latest
```
Depois, no console de cada loja: enviar para revisão.

---

## ⚠️ Antes de enviar — checklist
- [ ] `eas init` rodado e `app.json` commitado (projectId/owner)
- [ ] Política de privacidade **hospedada** e URL preenchida nos dois consoles
      (ex.: GitHub Pages servindo `docs/privacy-policy.html`)
- [ ] Screenshots reais (ver `store/SCREENSHOTS.md`)
- [ ] Ícone/splash conferidos no build de preview
- [ ] Disclaimer "não oficial, sem vínculo com a FIFA" na descrição (já está nos textos)

## Hospedar a política de privacidade (rápido, grátis)
Com o repositório no GitHub:
1. Settings → Pages → Source: branch `main`, pasta `/docs`
2. A URL fica tipo `https://SEU_USUARIO.github.io/acompanhador-de-copa-do-mundo/privacy-policy.html`
3. Coloque essa URL em `src/lib/links.ts` (`LINKS.privacy`) e nos consoles.
