# Sprint 1 — Base, configuração e segurança inicial

Status: **concluída**.
Branch: `refactor/ajusteStack`.

Objetivo: preparar o produto para uso comercial inicial congelando a versão legacy,
removendo secrets hardcoded, criando configuração flexível da pasta IMPRESSÃO e
implementando o fluxo de primeiro administrador.

---

## O que foi implementado

1. **Legacy congelada** — `backend/README.md` deixa explícito que `backend/` não recebe
   mais novas funcionalidades. Toda a evolução acontece em `new-backend/` e `new-frontend/`.
2. **Módulo de configuração** — `new-backend/src/config/appConfig.ts` carrega, valida
   e atualiza `config.json` (com migração de chaves antigas tipo `impressaoPath`/`port`).
3. **Secrets locais** — `new-backend/src/config/secrets.ts` gera `data/secrets.json`
   no primeiro boot via `crypto.randomBytes(64)`. `JWT_SECRET` env tem prioridade.
   Nunca é logado nem retornado por endpoint.
4. **Endpoints de configuração** — `GET /api/config` (público, sem secrets) e
   `PATCH /api/config` (protegido, somente campos permitidos).
5. **Setup inicial** — `GET /api/setup/status` e `POST /api/setup/admin`.
   Validações: username ≥ 3, password ≥ 6, confirmação, idempotência (403 se já existir admin).
6. **Login adaptado** — `loginHandler` usa `passwordHash` (bcrypt) e `getJwtSecret()`.
   Retorna `{ token, user: { id, username, role } }`. Senha nunca trafega.
7. **Usuário padrão opcional** — `seven`/`seven100` só é criado se `ALLOW_DEFAULT_USER=true`.
   Em produção, jamais.
8. **Frontend de setup** — `Setup.tsx` + gate em `App.tsx` que checa
   `/api/setup/status` na inicialização e força `/setup` se necessário.
9. **Frontend de configurações** — `Settings.tsx` em `/configuracoes`, editando os
   5 campos permitidos. Aviso quando a pasta de impressão está vazia.
10. **Erros amigáveis sem pasta** — middleware `requireImpressaoDir` aplicado nas
    rotas que dependem do filesystem. Retorna 503 com mensagem clara em vez de quebrar.
11. **`.env.example` saneado** — `JWT_SECRET=gestao-os-jwt-secret-2024` removido.

---

## Arquivos criados

| Arquivo                                                  | Tipo  |
|----------------------------------------------------------|-------|
| `backend/README.md`                                      | doc   |
| `new-backend/src/config/appConfig.ts`                    | code  |
| `new-backend/src/config/secrets.ts`                      | code  |
| `new-backend/src/config/index.ts`                        | code  |
| `new-backend/src/controllers/config.controller.ts`       | code  |
| `new-backend/src/controllers/setup.controller.ts`        | code  |
| `new-backend/src/routes/config.routes.ts`                | code  |
| `new-backend/src/routes/setup.routes.ts`                 | code  |
| `new-backend/src/middleware/impressao.middleware.ts`     | code  |
| `new-backend/README.md`                                  | doc   |
| `new-frontend/src/pages/Setup.tsx`                       | code  |
| `new-frontend/src/pages/Settings.tsx`                    | code  |
| `SPRINT_1.md`                                            | doc   |

## Arquivos alterados

| Arquivo                                                  | Mudança                                                                  |
|----------------------------------------------------------|--------------------------------------------------------------------------|
| `new-backend/src/config.ts`                              | **deletado** — substituído por `src/config/`                             |
| `new-backend/src/server.ts`                              | Boot tolerante a `impressaoDir` vazio; watcher só inicia se configurado  |
| `new-backend/src/services/auth.service.ts`               | `passwordHash` + bcrypt + setup; `ensureDefaultUser` gated em env        |
| `new-backend/src/middleware/auth.middleware.ts`          | Usa `getJwtSecret()`                                                     |
| `new-backend/src/controllers/os.controller.ts`           | Importa `IMPRESSAO_DIR` do novo módulo                                   |
| `new-backend/src/services/os.service.ts`                 | `readStructure` retorna `{}` quando `IMPRESSAO_DIR` vazio                |
| `new-backend/src/routes/os.routes.ts`                    | Aplica `requireImpressaoDir` nas rotas de filesystem                     |
| `new-backend/src/routes/public.routes.ts`                | Aplica `requireImpressaoDir` em `/token` e `/public/cliente/:token`      |
| `new-backend/src/routes/index.ts`                        | Registra `setupRoutes` e `configRoutes`                                  |
| `new-backend/.env.example`                               | Removeu JWT_SECRET hardcoded; documenta `ALLOW_DEFAULT_USER`             |
| `config.json` (raiz)                                     | Será regravado no formato novo na primeira leitura                       |
| `new-frontend/src/App.tsx`                               | `SetupGate` + rotas `/setup` e `/configuracoes`                          |
| `new-frontend/src/pages/Login.tsx`                       | Mensagem de sucesso quando vem do setup                                  |
| `new-frontend/src/pages/Dashboard.tsx`                   | Botão "Config" no header                                                 |
| `new-frontend/src/services/api.ts`                       | `getSetupStatus`, `postSetupAdmin`, `getConfig`, `patchConfig`           |
| `new-frontend/src/hooks/useAuth.ts`                      | Lê `res.user.username`/`role` (corrige bug pré-existente)                |
| `new-frontend/src/types/index.ts`                        | `AuthUser`, `SetupStatusResponse`, `AppConfig`, `AppConfigPatch`         |

---

## Endpoints novos

```
GET  /api/setup/status      → { needsSetup: boolean }
POST /api/setup/admin       → { success, user }    (403 se já houver admin)
GET  /api/config            → AppConfig (sem secrets)
PATCH /api/config           → AppConfig            (auth obrigatória)
```

Mudança de comportamento dos endpoints existentes: se `impressaoDir` estiver
vazio, `GET /api/os`, `POST /api/generate-os`, `GET /api/download`, `POST /api/token`
e `GET /api/public/cliente/:token` retornam:

```http
HTTP/1.1 503 Service Unavailable
{ "error": "A pasta de impressão ainda não foi configurada." }
```

---

## Como testar manualmente

> Pré-requisito: deletar `data/users.json` e `data/secrets.json` para simular instalação limpa.

### 1. Boot limpo

```bash
cd new-backend && npm install && npm run dev
cd new-frontend && npm install && npm run dev
```

Verifique no log do backend:
- `[secrets] Arquivo de secrets criado em data/secrets.json`
- `[server] Pasta de impressao nao configurada. Watcher desativado.` (caso `impressaoDir=""`)

### 2. Setup inicial

1. Abra `http://localhost:5173/`.
2. Você deve ser redirecionado para `/setup`.
3. Crie um administrador (ex: `admin` / `senha123` / `senha123`).
4. Após sucesso → redireciona para `/login` com mensagem verde.

### 3. Login

1. Faça login com o admin recém-criado.
2. Abra DevTools → Application → Local Storage. Deve haver `token`, `username`, `role`.
3. Acesse rotas protegidas e confira que funcionam.

### 4. Configuração da pasta

1. Clique em "Config" no header do Dashboard.
2. Sem `impressaoDir`, deve aparecer banner âmbar de aviso.
3. Preencha o caminho da pasta IMPRESSÃO (ex: `C:\Users\PC\Desktop\IMPRESSÃO 2`).
4. Clique em "Salvar alterações" — deve aparecer warning verde sobre restart.
5. Reinicie o backend.
6. Volte ao Dashboard — listagem de OS deve carregar normalmente.

### 5. Erro amigável

Com `impressaoDir` vazio:
```bash
curl -i http://localhost:3001/api/os -H "Authorization: Bearer <token>"
# HTTP/1.1 503  { "error": "A pasta de impressão ainda não foi configurada." }
```

### 6. Setup bloqueado após criação

```bash
curl -i -X POST http://localhost:3001/api/setup/admin -H "Content-Type: application/json" \
  -d '{"username":"x","password":"123456","confirmPassword":"123456"}'
# HTTP/1.1 403  { "error": "Setup ja foi realizado. Ja existe um administrador." }
```

### 7. Funcionalidades existentes

Verificar que continuam funcionando:
- ✅ Listagem datas/clientes/arquivos
- ✅ Alteração de status (clique em arquivo)
- ✅ Marcar/desmarcar pago
- ✅ Gerar OS (.docx)
- ✅ Compartilhar link público (`/cliente/:token`)
- ✅ SSE em tempo real (modificar pasta via terminal e ver Dashboard atualizar)
- ✅ Download de arquivo

---

## Riscos / pontos pendentes

- **`config.json` será reescrito** no primeiro boot do backend, no formato novo
  (se tiver chaves antigas tipo `impressaoPath`/`port`, são migradas automaticamente).
  Isso pode surpreender quem editou o arquivo manualmente — fazer backup antes.
- **Watcher exige restart** quando `impressaoDir` muda. O endpoint avisa via `warning`,
  mas não automatiza. Pode ser endereçado em sprint futura.
- `Layout.tsx` ficou órfão (não é usado por nenhuma página). Mantido por enquanto;
  remover quando ficar claro que não vai ser reaproveitado.
- A rota pública `/api/tunnel-url` não foi protegida pelo guard — ela só lê `getNgrokUrl()`,
  que é independente da pasta. OK.
- O `.env.example` já não traz `JWT_SECRET`, mas convém auditar `.env` reais em
  instalações existentes para confirmar que não há um valor fraco fixado.

---

## Próximos passos sugeridos

- **Sprint 2 candidatas** (ainda não escopadas):
  - Cloudflare Tunnel substituindo ngrok.
  - Migração de `data/status.json` para SQLite.
  - Sistema de licença / planos.
  - Instalador para Windows.
  - Página de gestão de usuários (criar/remover admins, mudar senha).
  - Hot-reload do watcher quando `impressaoDir` muda (sem restart).
