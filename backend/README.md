# Backend Legacy (Congelado)

**Status: CONGELADO**

Esta versao do backend (JavaScript puro + Express) esta congelada e nao recebe mais novas funcionalidades.

Toda a evolucao do produto acontece nas pastas:

- `new-backend/` — Backend oficial (Express + TypeScript)
- `new-frontend/` — Frontend oficial (React + Vite + TypeScript)

## Por que esta congelado?

Esta versao serviu como prototipo inicial. A versao nova (`new-backend/` + `new-frontend/`) oferece:

- TypeScript com tipagem forte
- Arquitetura modular (controllers, services, routes)
- Configuracao flexivel
- Autenticacao segura sem secrets hardcoded
- Fluxo de setup inicial para primeiro uso

## Posso rodar esta versao?

Sim, ela continua funcional para referencia. Rode com:

```bash
npm run dev
```

Porta padrao: 3000

Mas para uso em producao, utilize a versao nova.
