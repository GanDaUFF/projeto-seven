# Sprint 3A — SQLite local

Status: **concluída**.
Branch: `refactor/ajusteStack`.

Objetivo: substituir `data/status.json` por SQLite local (`data/seven.db`) como
fonte de verdade para status de arquivos, pagamentos e tokens públicos —
mantendo todas as APIs do backend e o frontend intactos.

---

## Por que SQLite

- O `status.json` reescreve o arquivo inteiro a cada mutação. Com SSE,
  watcher e clicks do operador concorrendo, há risco real de race
  condition / corrupção do JSON.
- `findClientByToken` fazia scan linear (O(n)) no mapa flat. SQLite faz
  busca indexada por `token`.
- Cria base para histórico (created_at / updated_at por linha) e relatórios
  futuros, sem ainda transformar clientes/arquivos em entidades fixas
  (a estrutura visível continua vindo do filesystem).

Biblioteca escolhida: **`better-sqlite3`** (síncrona, nativa, ideal para app
local desktop, sem complexidade de ORM).

---

## O que foi implementado

1. **Banco local** em `data/seven.db` (`journal_mode=WAL`, `foreign_keys=ON`).
2. **Schema idempotente** com 4 tabelas + índice em `public_tokens.token`.
3. **Repository pattern**: `StatusRepository` (interface) + `SqliteStatusRepository`.
4. **Migração automática** do `status.json` no primeiro boot — com backup.
5. **`db.service.ts` refatorado**: mantém todas as assinaturas públicas usadas
   por controllers/services/routes, delegando para o repository SQLite.
   Frontend e demais módulos não foram tocados.
6. **`.gitignore`** ganhou `*.db`, `*.db-shm`, `*.db-wal`, `*.sqlite*`,
   `data/backups/`.
7. **Boot wiring** em `server.ts`: `getDb()` + `migrateStatusJsonIfNeeded()`
   antes do `app.listen`.

---

## Onde fica o banco

| Caminho                                  | O que é |
|------------------------------------------|---------|
| `data/seven.db`                          | Banco SQLite principal |
| `data/seven.db-shm` / `seven.db-wal`     | Arquivos de WAL (auto-gerenciados) |
| `data/backups/status.backup.<ts>.json`   | Cópia do `status.json` antes da migração |
| `data/status.json`                       | **Preservado** após migração (não é apagado) |

Todos esses caminhos estão no `.gitignore`.

---

## Schema

```sql
CREATE TABLE file_statuses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_key    TEXT NOT NULL UNIQUE,        -- "DD.MM/CLIENTE/arquivo.ext"
  status      TEXT NOT NULL,               -- "PENDENTE" | "PRODUCAO" | "FEITO" | "ENTREGUE"
  created_at  TEXT NOT NULL,               -- ISO 8601
  updated_at  TEXT NOT NULL
);

CREATE TABLE client_payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_key  TEXT NOT NULL UNIQUE,       -- "DD.MM/CLIENTE"
  paid         INTEGER NOT NULL DEFAULT 0, -- 0 / 1
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE public_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  token_key    TEXT NOT NULL UNIQUE,       -- "DD.MM/CLIENTE"
  token        TEXT NOT NULL UNIQUE,       -- 32 chars hex
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  disabled_at  TEXT,                       -- soft-disable (futuro)
  expires_at   TEXT                        -- TTL opcional (futuro)
);

CREATE INDEX idx_public_tokens_token ON public_tokens(token);

CREATE TABLE app_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
```

Versão atual de schema: `1` (gravada em `app_meta.schema_version`).

---

## Como a migração funciona

Em todo boot, `migrateStatusJsonIfNeeded()`:

1. Consulta `app_meta.status_json_migrated_at`. Se já existir → encerra
   (idempotente).
2. Se `data/status.json` não existe → marca `migrated_at` e encerra.
3. Tenta `JSON.parse`:
   - falha → loga erro, marca `migrated_at`, segue com banco vazio
     (sistema continua funcionando).
   - vazio (`{}`) → marca `migrated_at` e encerra.
4. Cria backup em `data/backups/status.backup.<YYYY-MM-DD-HHmmss>.json`.
5. Em **uma transação**:
   - chaves sem prefixo → `file_statuses`;
   - chaves com prefixo `pag:` → `client_payments`;
   - chaves com prefixo `tok:` → `public_tokens`.
6. Marca `app_meta.status_json_migrated_at = <ISO now>`.
7. **Não apaga** `status.json` (preservado para auditoria).

Tudo via `INSERT ... ON CONFLICT DO UPDATE` (upsert), então re-rodar não
duplica e nem corrompe.

---

## Arquivos criados

| Arquivo | Tipo |
|---|---|
| `new-backend/src/database/database.ts`              | code |
| `new-backend/src/database/schema.ts`                | code |
| `new-backend/src/database/migrateStatusJson.ts`     | code |
| `new-backend/src/repositories/status.repository.ts` | code |
| `new-backend/src/repositories/sqliteStatus.repository.ts` | code |
| `SPRINT_3A_SQLITE.md`                               | doc  |

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `new-backend/src/services/db.service.ts` | refatorado: assinatura pública preservada, delega para SQLite repository. Removido `fs`/`writeFile` do JSON. |
| `new-backend/src/server.ts`              | boot wiring: `getDb()` + `migrateStatusJsonIfNeeded()` antes das rotas. |
| `new-backend/package.json`               | +`better-sqlite3`, +`@types/better-sqlite3`. |
| `.gitignore`                             | `data/seven.db`, `data/*.db`, `data/*.db-journal`, `data/*.db-shm`, `data/*.db-wal`, `data/*.sqlite`, `data/*.sqlite3`, `data/backups/`. |

**Não alterados** (intencionalmente):
- `new-backend/src/services/os.service.ts`
- `new-backend/src/controllers/os.controller.ts`
- `new-backend/src/routes/os.routes.ts`
- `new-backend/src/routes/public.routes.ts`
- todo o `new-frontend/`

---

## Como testar manualmente

### 1. Migração com `status.json` existente

```bash
cd new-backend && npm run dev
```

Procurar nos logs:
```
[db] SQLite aberto em .../data/seven.db
[migrate] Backup do status.json salvo em data/backups/status.backup.<ts>.json
[migrate] status.json importado para SQLite: N status, N pagamentos, N tokens.
[migrate] status.json original NAO foi apagado (preservado por seguranca).
```

Confirmar que existem:
- `data/seven.db`
- `data/seven.db-wal`, `data/seven.db-shm` (WAL)
- `data/backups/status.backup.<ts>.json`
- `data/status.json` continua presente, intocado.

### 2. Persistência

1. Abrir Dashboard, mudar status de um arquivo (ex: `PENDENTE → PRODUCAO`).
2. Marcar um cliente como pago.
3. Gerar um link público (botão Compartilhar).
4. **Reiniciar o backend.**
5. Conferir que tudo está como ficou. Logs devem mostrar `[db]` mas
   **não** mais `[migrate]` (idempotente).

### 3. Link público com token migrado

Pegar um token antigo do `status.json` (chave `tok:...`). Acessar
`http://localhost:3001/cliente/<token>` — deve abrir a página normalmente.

### 4. Instalação limpa

```bash
# pare o backend
# renomeie status.json:
move data\status.json data\status.json.bak
# apague o banco:
del data\seven.db data\seven.db-wal data\seven.db-shm
# suba de novo:
cd new-backend && npm run dev
```

Logs esperados:
```
[db] SQLite aberto em .../data/seven.db
[migrate] status.json nao existe — nada a importar.
```

Sistema deve funcionar com banco vazio. Frontend mostra Dashboard sem
status persistido. Ao mexer, dados aparecem no `data/seven.db`.

### 5. Build/typecheck

```bash
cd new-backend  && npx tsc --noEmit  # ✅ sem erros
cd new-backend  && npm run build      # ✅ gera dist/
cd new-frontend && npx tsc --noEmit  # ✅ sem erros (não foi tocado)
cd new-frontend && npm run build      # ✅ gera dist/
```

### 6. Produção

```bash
npm run build:new
npm run start:new
# acessar http://localhost:3001
```

Testar dashboard, login, alteração de status, link público.

---

## Riscos e pendências

- **`status.json` deixou de ser fonte de verdade.** Editar manualmente esse
  arquivo após a primeira migração não tem efeito — o backend ignora o
  arquivo a partir do momento que `app_meta.status_json_migrated_at` está
  setado. Documentado aqui e no README do new-backend.
- **Banco é por máquina.** Cada PC tem seu `data/seven.db`. Sem replicação
  ou sincronização nesta sprint.
- **`better-sqlite3` é nativo.** Funciona out-of-the-box no Windows com
  Node 20+. Se o cliente rodar em ambiente novo (ARM, Alpine etc), pode
  precisar de `npm rebuild better-sqlite3`.
- **Sem testes automatizados.** Validação manual + smoke-test descartável.
- **Token UNIQUE no schema:** se por azar `crypto.randomBytes(16)` gerar
  colisão (probabilidade desprezível: ~2^-64 por geração), o INSERT falha
  com 503. Aceitável para o volume esperado.
- **`getAllAsLegacyMap()` existe mas não é usado** em produção. Mantido na
  interface para debug e para eventual exposição futura num endpoint
  administrativo.

## Arquivos sensíveis ainda no Git

Verificado com `git ls-files | grep -E "(secrets|status|seven\.db|config\.json)"`:
- ✅ `config.json` e `data/secrets.json` já foram untrackeados (Sprint 2 hotfix).
- ✅ `data/seven.db` nunca foi tracked (criado depois do .gitignore).
- ⚠️ `data/status.json` historicamente entrou em commits anteriores — mas
  nas branches atuais ele já está no .gitignore. Para limpar do índice
  caso ainda apareça em alguma branch antiga:
  ```bash
  git rm --cached data/status.json
  ```

## Próximos passos sugeridos

- Endpoint administrativo `/api/admin/db/snapshot` que devolve
  `getAllAsLegacyMap()` (debug).
- TTL real para `public_tokens.expires_at`.
- "Disable" de tokens antigos via UI (`disabled_at`).
- Tabela de auditoria (quem mudou status quando) — fácil de adicionar
  porque já há `created_at`/`updated_at`.
- Migration runner formal em vez de schema sempre `IF NOT EXISTS`
  (necessário quando `SCHEMA_VERSION` precisar passar para 2).
- Promover Sprint 3B: clientes/arquivos como entidades indexadas (hoje
  ainda lidos do filesystem em todo refresh).
