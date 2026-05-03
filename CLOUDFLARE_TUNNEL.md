# Cloudflare Tunnel — guia de configuração manual

Este guia explica como expor o Seven externamente usando Cloudflare Tunnel.
A automação via cloudflared instalado como serviço Windows fica no fim do documento.

## Visão geral

O Seven roda localmente:

- Backend: `http://localhost:3001` (também serve o frontend buildado em modo produção).

O Cloudflare Tunnel fica entre a internet e essa porta local, mapeando um
subdomínio do seu domínio na Cloudflare para `localhost:3001`. A máquina onde
o Seven roda **não precisa abrir portas no roteador** — o tunnel sai como
conexão de saída para a Cloudflare.

```
Internet  →  https://graficaabc.seudominio.com.br
              ↓
              Cloudflare Edge
              ↓ (tunnel saindo da máquina)
              cloudflared (na máquina do cliente)
              ↓
              http://localhost:3001  (Seven backend)
```

---

## Pré-requisitos

1. **Domínio na Cloudflare** — precisa ter um domínio com DNS gerenciado pela
   Cloudflare (não basta CDN). Se ainda não tem, transfira o DNS para a Cloudflare.
2. **`cloudflared` instalado** — baixe a partir de
   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/.
   No Windows, instale o `.msi` oficial. Para verificar:
   ```bat
   cloudflared --version
   ```
3. **Acesso de administrador** ao terminal/máquina onde o Seven roda.
4. **Seven já buildado e rodando em produção** na porta 3001:
   ```bat
   cd new-frontend && npm run build
   cd new-backend  && npm run build
   set NODE_ENV=production
   node dist/server.js
   ```
   Confirme acessando `http://localhost:3001` antes de continuar.

---

## Configuração do tunnel (passo a passo)

### 1. Login

```bat
cloudflared tunnel login
```

Abre o navegador. Faça login na Cloudflare e selecione o domínio que vai usar.
Cria credenciais em `%USERPROFILE%\.cloudflared\cert.pem`.

### 2. Criar um tunnel

```bat
cloudflared tunnel create seven-graficaabc
```

Saída inclui o **UUID do tunnel** e o caminho do arquivo de credenciais
(`%USERPROFILE%\.cloudflared\<UUID>.json`). Guarde esse UUID.

### 3. Apontar o DNS

```bat
cloudflared tunnel route dns seven-graficaabc graficaabc.seudominio.com.br
```

Cria um registro `CNAME` automaticamente em `seudominio.com.br` apontando
`graficaabc` para o tunnel.

### 4. Criar `config.yml`

Salve em `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: seven-graficaabc
credentials-file: C:\Users\SEU_USUARIO\.cloudflared\<UUID>.json

ingress:
  - hostname: graficaabc.seudominio.com.br
    service: http://localhost:3001
  - service: http_status:404
```

Substitua:
- `seven-graficaabc` pelo nome do tunnel que você criou.
- `<UUID>` pelo UUID retornado pelo passo 2.
- `graficaabc.seudominio.com.br` pelo subdomínio escolhido.

### 5. Rodar o tunnel

```bat
cloudflared tunnel run seven-graficaabc
```

Mantenha esse terminal aberto. Em outro navegador, acesse
`https://graficaabc.seudominio.com.br` — deve carregar o Seven.

---

## Configurar `publicBaseUrl` no Seven

Depois que o tunnel está respondendo no domínio:

1. Abra `https://graficaabc.seudominio.com.br` (ou `http://localhost:3001`).
2. Faça login como admin.
3. Clique em **Config** no header.
4. Preencha **URL pública** com o domínio completo:
   ```
   https://graficaabc.seudominio.com.br
   ```
5. Salve.

A partir desse ponto, todos os links públicos `/cliente/:token` gerados pelo
botão "Compartilhar" usam esse domínio. Sem essa configuração, o link cai no
fallback `http://localhost:3001/cliente/:token`, que só funciona dentro da rede.

---

## Instalar cloudflared como serviço Windows

Para que o tunnel suba automaticamente com a máquina, sem terminal aberto:

```bat
cloudflared service install
```

A partir desse comando, o `config.yml` é o do `%USERPROFILE%\.cloudflared\` —
mas o serviço roda como `LOCAL SYSTEM`, então o caminho real do `config.yml`
é `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml`.

Mais simples: passar `--config` ao instalar:

```bat
cloudflared --config "C:\Users\SEU_USUARIO\.cloudflared\config.yml" service install
```

Depois:

```bat
sc start cloudflared
sc stop cloudflared
sc query cloudflared
```

Logs em `C:\Windows\System32\config\systemprofile\.cloudflared\` ou via
`Event Viewer`.

---

## Fluxo de teste

1. Backend rodando em produção (`http://localhost:3001` abre o app).
2. `cloudflared tunnel run seven-graficaabc` ativo (ou serviço iniciado).
3. `https://graficaabc.seudominio.com.br` abre o app.
4. Logar como admin.
5. Em **Config**, salvar `publicBaseUrl = https://graficaabc.seudominio.com.br`.
6. No Dashboard, clicar em **Compartilhar** num cliente.
7. Abrir o link copiado em outro dispositivo (celular fora da rede local).
8. A página `/cliente/<token>` deve carregar e mostrar a OS.

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Domínio dá 502/timeout | Backend não está rodando em `:3001` | Subir o backend (`node dist/server.js` com `NODE_ENV=production`) |
| Domínio dá 530/1033 | Tunnel não está rodando | `cloudflared tunnel run ...` ou `sc start cloudflared` |
| App carrega mas link público vai pra `localhost` | `publicBaseUrl` vazio em `/configuracoes` | Preencher e salvar |
| Domínio carrega mas API dá 404 | Frontend buildado pegou base wrong | Garantir que `NODE_ENV=production` foi setado e que `new-frontend/dist` existe |
| Cliente externo abre link mas API dá CORS | Algum middleware externo bloqueou — Seven não rejeita CORS por padrão | Verificar se o domínio do tunnel == `publicBaseUrl` salvo |
| "Tunnel ativo" não aparece no header | `publicBaseUrl` vazio ou setado para `localhost` | Salvar URL pública real em `/configuracoes` |
| DNS não propagou | Registro recém-criado | Aguardar até 5 min, testar no `nslookup graficaabc.seudominio.com.br` |
| Antivírus/firewall bloqueando | `cloudflared.exe` ou `node.exe` | Liberar exceção |

---

## ngrok não é mais o fluxo oficial

A versão new continua tendo um arquivo `ngrok.service.ts` órfão e o
`iniciar2.bat` (modo DEV) ainda inicia `ngrok.exe` se o binário existir
**apenas para desenvolvimento**. Em produção, o caminho oficial é Cloudflare
Tunnel + `publicBaseUrl`.

Se preferir não usar ngrok nem em dev, basta apagar `ngrok.exe` da raiz —
o `iniciar2.bat` detecta a ausência e segue normal.
