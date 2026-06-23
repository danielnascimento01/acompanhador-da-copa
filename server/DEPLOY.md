# Deploy do Cloudflare Worker — Copa 2026

## Pré-requisitos

- Conta gratuita em cloudflare.com
- Node.js instalado
- `cd server && npm install`

---

## 1. Autenticar no Cloudflare

```bash
npx wrangler login
```

---

## 2. Criar o namespace KV

```bash
npx wrangler kv namespace create COPA_KV
# → Anota o "id" retornado

npx wrangler kv namespace create COPA_KV --preview
# → Anota o "preview_id" retornado
```

Substitua os IDs no `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "SEU_ID_AQUI"
preview_id = "SEU_PREVIEW_ID_AQUI"
```

---

## 3. Primeiro deploy

```bash
npx wrangler deploy
# → Retorna a URL: https://copa2026-worker.SEU_USER.workers.dev
```

Atualize a URL em dois lugares:

1. `server/wrangler.toml`:
   ```toml
   WORKER_URL = "https://copa2026-worker.SEU_USER.workers.dev"
   ```

2. `src/lib/storage.ts` no app:
   ```ts
   export const SERVER_URL = 'https://copa2026-worker.SEU_USER.workers.dev';
   ```

---

## 4. (Opcional) Token Expo para push em produção

Sem token funciona, mas com token o Expo prioriza sua fila:

```bash
npx wrangler secret put EXPO_ACCESS_TOKEN
# → Cole o token de https://expo.dev/accounts/nascimento.daniel/settings/access-tokens
```

---

## 5. Testar

```bash
# Health check
curl https://copa2026-worker.SEU_USER.workers.dev/api/health

# Artilheiros
curl https://copa2026-worker.SEU_USER.workers.dev/api/scorers

# Registrar um token de teste
curl -X POST https://copa2026-worker.SEU_USER.workers.dev/api/register \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[TEST]"}'
```

---

## 6. Build novo do app

Após o deploy do worker, o app precisa de **nova build** (não OTA) porque:
- `getExpoPushTokenAsync()` precisa do entitlement de push configurado no binário
- `UIBackgroundModes: ["remote-notification"]` foi adicionado ao app.json

```bash
# Na raiz do projeto (não em server/)
eas build --platform all --profile production
eas submit --platform all
```

---

## Logs em tempo real

```bash
npx wrangler tail
```

---

## Arquitetura resumida

```
Cron (1×/min)
  │
  ├─ ESPN /scoreboard → eventos ao vivo
  ├─ Para cada live: ESPN /summary → plays
  ├─ Placar mudou? → Expo Push API → notificações
  └─ Agrega todos os gols → KV["scorers"]

GET /api/scorers → app busca artilheiros ao vivo
POST /api/register → app registra token de push
GET /api/health → monitoramento
```
