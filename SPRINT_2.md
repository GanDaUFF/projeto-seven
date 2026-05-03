# Sprint 2 — Cloudflare Tunnel ready + produção local

Status: **concluída**.
Branch: `refactor/ajusteStack`.

Objetivo: substituir o ngrok como caminho oficial de exposição externa (passando
para Cloudflare Tunnel configurado manualmente) e habilitar modo produção local
em que o backend Express serve o frontend React buildado.

---

## O que foi implementado

1. **Serviço `publicUrl.service`** — `getPublicBaseUrl()` resolve a URL pública
   na ordem: `process.env.PUBLIC_BASE_URL` → `config.publicBaseUrl` → fallback
   `http://localhost:<PORT>`. Helper `joinUrl(base, path)` evita barras duplicadas.
2. **Backend monta link público** — `POST /api/token` agora retorna
   `{ token, url }`, onde `url = joinUrl(getPublicBaseUrl(), '/cliente/<token>')`.
3. **`GET /api/tunnel-url` redirecionado** — não chama mais `getNgrokUrl()`.
   Retorna `{ url: getPublicBaseUrl() }`. Mantido só por compatibilidade com o
   Dashboard atual.
4. **ngrok deixou de ser dependência principal** — `ngrok.service.ts` ficou
   órfão (nenhum import). Não foi removido, conforme requisito da sprint
   ("pode manter como fallback de dev").
5. **Backend serve frontend buildado** — em `NODE_ENV=production`, `server.ts`
   monta `express.static(new-frontend/dist)` e adiciona um `app.get('*', ...)`
   que devolve `index.html` para qualquer rota que não comece com `/api` ou
   `/health`. Funciona para `/login`, `/configuracoes`, `/cliente/:token`.
6. **Frontend usa `res.url`** — `Dashboard.compartilhar` prefere a URL que veio
   do backend; o fallback antigo (`tunnelUrl ?? window.location.origin`) só é
   usado se o backend não devolver `url`.
7. **Indicador "Túnel ativo"** — no header do Dashboard só aparece em verde
   quando a `publicBaseUrl` não é localhost. Antes ficava verde sempre.
8. **Scripts de produção** — `package.json` raiz: `build:new` builda frontend
   (gera `dist`) **antes** do backend, `start:new` sobe o backend em produção
   (Windows, com `set NODE_ENV=production`). Removido `start:new:frontend`
   (`vite preview`) porque o backend já serve.
9. **`iniciar2.bat` modo PROD** — não sobe mais `vite preview` nem `ngrok`,
   define `NODE_ENV=production` antes de `node dist/server.js`. Modo DEV
   inalterado.
10. **Documentação** — `CLOUDFLARE_TUNNEL.md` (passo a passo de tunnel manual,
    serviço Windows, troubleshooting), `new-backend/README.md` ganhou seções
    "Como rodar (produção)" e "Cloudflare Tunnel".

---

## Arquivos criados

| Arquivo                                              | Tipo |
|------------------------------------------------------|------|
| `new-backend/src/services/publicUrl.service.ts`      | code |
| `CLOUDFLARE_TUNNEL.md`                               | doc  |
| `SPRINT_2.md`                                        | doc  |

## Arquivos alterados

| Arquivo                                              | Mudança |
|------------------------------------------------------|---------|
| `new-backend/src/controllers/os.controller.ts`       | `postToken` retorna `{token, url}`; `getTunnelUrl` usa `getPublicBaseUrl`; deixou de importar `getNgrokUrl` |
| `new-backend/src/server.ts`                          | `express.static` + SPA fallback gated por `NODE_ENV=production`; warning se `dist` não existir |
| `new-frontend/src/services/api.ts`                   | `getToken` tipa retorno como `{ token; url? }` |
| `new-frontend/src/pages/Dashboard.tsx`               | usa `res.url` ao compartilhar; novo derivado `hasPublicTunnel` controla badge |
| `new-backend/README.md`                              | seções de produção + tunnel |
| `package.json` (raiz)                                | `build:new` invertido (frontend antes), `start:new` simplificado, removido `start:new:frontend` |
| `iniciar2.bat`                                       | modo PROD: NODE_ENV + sem vite preview + sem ngrok |

## Arquivos órfãos (mantidos por requisito)

- `new-backend/src/services/ngrok.service.ts` — não é mais importado, mas
  preservado para uso opcional em dev futuro. Pode ser removido a qualquer
  momento sem impacto.

---

## Endpoints afetados

| Endpoint | Antes | Depois |
|---|---|---|
| `POST /api/token` | `{ token }` | `{ token, url }` |
| `GET /api/tunnel-url` | `{ url: getNgrokUrl() | null }` | `{ url: getPublicBaseUrl() }` (nunca null) |
| `GET *` (não-`/api`, não-`/health`) | 404 | em prod, retorna `new-frontend/dist/index.html` |

---

## Como rodar

### Desenvolvimento (não mudou)

```bash
cd new-backend  && npm run dev      # :3001
cd new-frontend && npm run dev      # :5173 (proxy /api → :3001)
```

Ou, da raiz:
```bash
npm run dev:new                     # ambos via concurrently
```

### Produção

```bash
cd new-frontend && npm run build    # gera new-frontend/dist
cd new-backend  && npm run build    # gera new-backend/dist
cd new-backend
set "NODE_ENV=production" && node dist/server.js   # Windows
# ou:
NODE_ENV=production node dist/server.js            # Linux/Mac
```

Atalho da raiz (Windows):
```bash
npm run build:new
npm run start:new
```

Acesse `http://localhost:3001/` — abre o React buildado.

---

## Como configurar Cloudflare Tunnel (resumo)

Detalhes em `CLOUDFLARE_TUNNEL.md`. Resumão:

```bat
cloudflared tunnel login
cloudflared tunnel create seven-graficaabc
cloudflared tunnel route dns seven-graficaabc graficaabc.seudominio.com.br
:: editar %USERPROFILE%\.cloudflared\config.yml apontando para http://localhost:3001
cloudflared tunnel run seven-graficaabc
```

Depois, em `/configuracoes` no Seven, salvar
`publicBaseUrl = https://graficaabc.seudominio.com.br`.

---

## Como testar geração de link público

1. Backend rodando (dev ou prod).
2. Login como admin.
3. Em `/configuracoes`, salvar `publicBaseUrl = https://exemplo.com.br`.
4. Voltar ao Dashboard.
5. Clicar em **Compartilhar** num cliente.
6. Link copiado deve ser `https://exemplo.com.br/cliente/<token>`.
7. Apagar `publicBaseUrl` e clicar de novo → link cai para
   `http://localhost:3001/cliente/<token>`.
8. Confirmar via curl direto:
   ```bash
   curl -X POST http://localhost:3001/api/token \
     -H "Authorization: Bearer <token-do-admin>" \
     -H "Content-Type: application/json" \
     -d '{"data":"01.05","cliente":"exemplo"}'
   ```
   Deve responder `{ "token": "...", "url": "https://.../cliente/..." }`.

---

## Resultado do typecheck

```bash
cd new-backend  && npx tsc --noEmit   # ✅ limpo
cd new-frontend && npx tsc --noEmit   # ✅ limpo
cd new-frontend && npm run build      # ✅ 43 modules, 215 KB JS
cd new-backend  && npm run build      # ✅ sem erros
```

Smoke-test do backend em produção (executado durante a sprint):
- `GET /` → HTML (index.html buildado) ✅
- `GET /login` → HTML (SPA fallback) ✅
- `GET /api/setup/status` → `{"needsSetup":false}` ✅
- `GET /health` → `{"status":"ok",...}` ✅
- `GET /api/tunnel-url` → `{"url":"http://localhost:3001"}` ✅
- log mostra `[server] Servindo frontend buildado de ...` ✅

---

## Riscos / pontos de atenção

- **`ROOT` resolve para `projeto-seven/` em ambos build e dev.** Validado:
  `path.resolve(ROOT, 'new-frontend', 'dist')` aponta certo após `tsc`.
- **Cache de `getConfig`**: `publicBaseUrl` salvo via `PATCH /api/config`
  atualiza o cache imediatamente, então `/api/token` reflete o novo valor sem
  restart. Mas se alguém editar `config.json` manualmente sem reiniciar, o
  backend não vê — limitação pré-existente.
- **Mudança comportamental de `/api/tunnel-url`**: agora sempre retorna URL
  válida (mínimo localhost). O Dashboard usa `hasPublicTunnel` para distinguir
  localhost de domínio real e mostrar a badge "Túnel ativo".
- **`iniciar2.bat` modo PROD**: deixou de subir `vite preview`. Quem estava
  acostumado com o app em `:4173` precisa adaptar — agora é tudo `:3001`.
- **`ngrok.service.ts` órfão**: não é importado, mas não foi deletado. Se um
  dia o desenvolvedor quiser usar ngrok em dev, pode importar de volta.
- **Sem testes automatizados.** Validação foi manual end-to-end + typecheck +
  builds.

---

## Próximos passos sugeridos

- Hot-reload do watcher quando `impressaoDir` muda (pendência da Sprint 1).
- Tela de gerenciamento de usuários (criar/desativar admins, mudar senha).
- Migração `data/status.json` → SQLite.
- Sistema de licença + planos.
- Instalador Windows que já configura `cloudflared` como serviço.
- Endpoint `POST /api/share` que aceita `{data, cliente}` e devolve só `{url}`,
  para simplificar o fluxo do frontend (hoje há `/api/token` que devolve token
  + url).
