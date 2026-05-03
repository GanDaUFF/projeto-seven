# Seven — Backend (Oficial)

Backend oficial do Projeto Seven (sistema de gestão de OS para gráfica).
Stack: Node.js + Express + TypeScript.

A versão `backend/` (JavaScript puro) está **congelada** e mantida apenas para referência.
Toda a evolução do produto acontece aqui em `new-backend/` e em `new-frontend/`.

---

## Como rodar

```bash
cd new-backend
npm install
npm run dev
```

Porta padrão: **3001** (configurável via `PORT` ou `config.json -> portaBackend`).

Build de produção:

```bash
npm run build
npm start
```

---

## Arquivos de configuração

Todos ficam na **raiz do repositório** (um nível acima de `new-backend/`):

| Arquivo                | Função                                                                  | Como é criado                  |
|------------------------|-------------------------------------------------------------------------|--------------------------------|
| `config.json`          | Dados da gráfica e caminhos (impressaoDir, nomeGrafica, etc).           | Auto-criado com defaults.      |
| `data/secrets.json`    | `jwtSecret` aleatório usado para assinar tokens.                        | Gerado no 1º boot via `crypto.randomBytes(64)`. |
| `data/users.json`      | Usuários do sistema (com `passwordHash` em bcrypt).                     | Vazio até o setup inicial.     |
| `data/status.json`     | Estado dos arquivos por OS (status, pagamento, tokens públicos).        | Auto-criado.                   |

> ⚠️ `data/secrets.json` deve ficar fora do versionamento. O `.gitignore` da raiz já cobre.

### Campos de `config.json`

```json
{
  "impressaoDir": "",
  "nomeGrafica": "",
  "telefoneGrafica": "",
  "logoPath": "",
  "publicBaseUrl": "",
  "portaBackend": 3001,
  "ambiente": "development"
}
```

O backend inicia mesmo com `impressaoDir` vazio. Endpoints que dependem da pasta
retornam **503** com `{ "error": "A pasta de impressão ainda não foi configurada." }`
até a pasta ser definida via `PATCH /api/config` ou edição manual do arquivo.

---

## Variáveis de ambiente (`.env`)

| Variável            | Padrão     | Descrição                                                              |
|---------------------|------------|------------------------------------------------------------------------|
| `PORT`              | `3001`     | Sobrescreve `portaBackend` do `config.json`.                           |
| `JWT_SECRET`        | (auto)     | Opcional. Se ausente, usa o valor de `data/secrets.json`.              |
| `ALLOW_DEFAULT_USER`| `false`    | Apenas para dev. Cria `seven` / `seven100` no primeiro boot se `true`. |

> Em produção **não** defina `ALLOW_DEFAULT_USER`. Use o fluxo de setup inicial.

---

## Setup inicial

Quando `data/users.json` está vazio, o sistema entra em modo de setup.

1. Frontend chama `GET /api/setup/status` → `{ needsSetup: true }`.
2. Frontend exibe a tela de criação do primeiro administrador.
3. Frontend chama `POST /api/setup/admin` com `{ username, password, confirmPassword }`.
4. Backend cria o usuário com `role: 'admin'` e senha em bcrypt.

Depois disso, `/api/setup/admin` retorna **403** se chamado novamente.

---

## Autenticação

- `POST /api/login` — `{ username, password }` → `{ token, user: { id, username, role } }`.
- Token JWT com expiração de **1 dia**, assinado com o `jwtSecret`.
- Rotas protegidas exigem header `Authorization: Bearer <token>`.
- O JWT secret é gerado automaticamente no primeiro boot — **não precisa configurar nada**.
- O secret nunca é logado, nunca é retornado por endpoint.

---

## Endpoints principais

### Públicos
- `GET  /health`
- `GET  /api/setup/status`
- `POST /api/setup/admin`
- `GET  /api/config` (sem secrets)
- `POST /api/login`
- `GET  /api/tunnel-url`
- `POST /api/token` *(precisa pasta configurada)*
- `GET  /api/public/cliente/:token` *(precisa pasta configurada)*
- `GET  /api/events` (SSE)

### Protegidos (`Authorization: Bearer <token>`)
- `PATCH /api/config`
- `GET   /api/os` *(precisa pasta configurada)*
- `POST  /api/status`
- `POST  /api/pagamento`
- `POST  /api/generate-os` *(precisa pasta configurada)*
- `GET   /api/download` *(precisa pasta configurada)*

---

## Watcher (chokidar)

O monitoramento da pasta é iniciado **só se** `impressaoDir` estiver configurado.
Se a pasta for alterada via `PATCH /api/config`, o backend retorna um `warning`
indicando que um restart é necessário para o watcher pegar o novo caminho.

---

## Estrutura

```
new-backend/src/
├── config/
│   ├── appConfig.ts        # Carrega/salva config.json + migrações
│   ├── secrets.ts          # Gera/lê data/secrets.json
│   └── index.ts            # Re-exports
├── controllers/
│   ├── auth.controller.ts
│   ├── config.controller.ts
│   ├── os.controller.ts
│   └── setup.controller.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── impressao.middleware.ts   # Guard de impressaoDir
├── routes/
│   ├── auth.routes.ts
│   ├── config.routes.ts
│   ├── os.routes.ts
│   ├── public.routes.ts
│   ├── setup.routes.ts
│   └── index.ts
├── services/
│   ├── auth.service.ts
│   ├── db.service.ts
│   ├── generateOS.service.ts
│   ├── ngrok.service.ts
│   ├── os.service.ts
│   ├── sse.service.ts
│   └── watcher.service.ts
├── types/
└── server.ts
```
