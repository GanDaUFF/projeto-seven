const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  getStatuses, updateStatus,
  getPagamentos, updatePagamento,
  getOrCreateToken, findClientByToken,
  VALID_STATUSES
} = require('./db');
const { startWatcher } = require('./watcher');
const { generateOS } = require('./generateOS');
const { getNgrokUrl } = require('./ngrok');
const { login, ensureDefaultUser } = require('./auth');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const ROOT = path.join(__dirname, '..');

// Lê configuração do config.json na raiz do projeto
let config = { impressaoPath: './impressao', port: 3000 };
try {
  config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf-8'));
} catch {
  console.warn('[config] config.json não encontrado, usando padrões.');
}

// Resolve o caminho — aceita absoluto (C:\...) ou relativo à raiz do projeto
const IMPRESSAO_DIR = path.isAbsolute(config.impressaoPath)
  ? config.impressaoPath
  : path.resolve(ROOT, config.impressaoPath);

const PORT = process.env.PORT || config.port || 3000;
const FRONTEND_DIR = path.join(ROOT, 'frontend');

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

// ─── Autenticação JWT ─────────────────────────────────────────────────────────
// Rotas que não exigem JWT
const JWT_PUBLIC = new Set(['/config', '/tunnel-url', '/events']);

app.post('/api/login', login);

app.use('/api', (req, res, next) => {
  if (JWT_PUBLIC.has(req.path)) return next();
  authMiddleware(req, res, next);
});

// ─── SSE: clientes conectados para push de atualizações ───────────────────────
const sseClients = new Set();

function broadcastUpdate() {
  for (const res of sseClients) {
    res.write('data: update\n\n');
  }
}

// ─── Leitura da estrutura de pastas ──────────────────────────────────────────
function readStructure() {
  if (!fs.existsSync(IMPRESSAO_DIR)) {
    fs.mkdirSync(IMPRESSAO_DIR, { recursive: true });
    return [];
  }

  const statuses   = getStatuses();
  const pagamentos = getPagamentos();
  const result     = [];

  const isDir = (p) => fs.statSync(p).isDirectory();
  const isFile = (p) => fs.statSync(p).isFile();

  const dateDirs = fs.readdirSync(IMPRESSAO_DIR)
    .filter((d) => {
      try { return isDir(path.join(IMPRESSAO_DIR, d)); }
      catch { return false; }
    })
    .sort((a, b) => {
      // Tenta ordenar no formato DD.MM; se não parsear, ordena alfabeticamente
      const parseDate = (s) => {
        const [d, m] = s.split('.').map(Number);
        return (!isNaN(d) && !isNaN(m)) ? m * 100 + d : null;
      };
      const va = parseDate(a), vb = parseDate(b);
      if (va !== null && vb !== null) return vb - va; // mais recente primeiro
      return b.localeCompare(a);
    });

  for (const dateDir of dateDirs) {
    const datePath = path.join(IMPRESSAO_DIR, dateDir);

    let clienteDirs = [];
    try {
      clienteDirs = fs.readdirSync(datePath)
        .filter((d) => { try { return isDir(path.join(datePath, d)); } catch { return false; } })
        .sort();
    } catch (e) {
      console.warn(`[leitura] Não foi possível ler ${datePath}:`, e.message);
    }

    const clientes = clienteDirs.map((clienteDir) => {
      const clientePath = path.join(datePath, clienteDir);
      let arquivos = [];
      try {
        arquivos = fs.readdirSync(clientePath)
          .filter((f) => { try { return isFile(path.join(clientePath, f)); } catch { return false; } })
          .sort();
      } catch (e) {
        console.warn(`[leitura] Não foi possível ler ${clientePath}:`, e.message);
      }

      const arquivosComStatus = arquivos.map((arquivo) => ({
        nome: arquivo,
        status: statuses[`${dateDir}/${clienteDir}/${arquivo}`] || 'PENDENTE'
      }));

      const pago = pagamentos[`${dateDir}/${clienteDir}`] ?? false;

      return { nome: clienteDir, pago, arquivos: arquivosComStatus };
    });

    result.push({ data: dateDir, clientes });
  }

  return result;
}

// ─── Rotas da API ─────────────────────────────────────────────────────────────

// GET /api/config — configurações públicas do servidor
app.get('/api/config', (req, res) => {
  res.json({ apiKey: null });
});

// GET /api/tunnel-url — retorna a URL pública do ngrok (se ativo)
app.get('/api/tunnel-url', async (req, res) => {
  const url = await getNgrokUrl();
  res.json({ url });
});

// GET /api/os — retorna toda a estrutura com status
app.get('/api/os', (req, res) => {
  try {
    res.json(readStructure());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao ler estrutura de pastas' });
  }
});

// POST /api/status — atualiza status de um arquivo específico
app.post('/api/status', (req, res) => {
  const { data, cliente, arquivo, status } = req.body;

  if (!data || !cliente || !arquivo || !status) {
    return res.status(400).json({ error: 'Campos data, cliente, arquivo e status são obrigatórios' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` });
  }

  updateStatus(data, cliente, arquivo, status);
  broadcastUpdate();
  res.json({ success: true });
});

// POST /api/pagamento — marca cliente como pago ou não
app.post('/api/pagamento', (req, res) => {
  const { data, cliente, pago } = req.body;

  if (!data || !cliente || pago === undefined) {
    return res.status(400).json({ error: 'Campos data, cliente e pago são obrigatórios' });
  }

  updatePagamento(data, cliente, pago);
  broadcastUpdate();
  res.json({ success: true });
});

// POST /api/generate-os — gera o arquivo .docx da O.S. e salva na pasta do cliente
app.post('/api/generate-os', async (req, res) => {
  const { data, cliente } = req.body;

  if (!data || !cliente) {
    return res.status(400).json({ error: 'Campos data e cliente são obrigatórios' });
  }

  try {
    const { fileName, filePath } = await generateOS(IMPRESSAO_DIR, data, cliente);
    broadcastUpdate(); // atualiza o watcher/frontend com o novo arquivo
    res.json({ success: true, fileName, filePath });
  } catch (err) {
    console.error('[generate-os]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/download — serve o arquivo para download
app.get('/api/download', (req, res) => {
  const { data, cliente, arquivo } = req.query;

  if (!data || !cliente || !arquivo) {
    return res.status(400).json({ error: 'Parâmetros data, cliente e arquivo são obrigatórios' });
  }

  const filePath = path.resolve(IMPRESSAO_DIR, data, cliente, arquivo);

  // Impede path traversal — o caminho final deve estar dentro de IMPRESSAO_DIR
  if (!filePath.startsWith(path.resolve(IMPRESSAO_DIR))) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.download(filePath, arquivo);
});

// GET /api/events — Server-Sent Events para atualizações em tempo real
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia heartbeat a cada 25s para manter a conexão viva
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  sseClients.add(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ─── Rotas públicas (sem autenticação) ───────────────────────────────────────

// POST /api/token — gera ou recupera token de compartilhamento de um cliente
app.post('/api/token', (req, res) => {
  const { data, cliente } = req.body;
  if (!data || !cliente) {
    return res.status(400).json({ error: 'data e cliente são obrigatórios' });
  }
  const token = getOrCreateToken(data, cliente);
  res.json({ token });
});

// GET /public/cliente/:token — retorna dados do cliente (sem auth, só leitura)
app.get('/public/cliente/:token', (req, res) => {
  const found = findClientByToken(req.params.token);
  if (!found) return res.status(404).json({ error: 'Token inválido ou expirado' });

  const { data, cliente: clienteNome } = found;
  const statuses   = getStatuses();
  const pagamentos = getPagamentos();

  const clientePath = path.join(IMPRESSAO_DIR, data, clienteNome);
  let arquivos = [];
  try {
    arquivos = fs.readdirSync(clientePath)
      .filter(f => { try { return fs.statSync(path.join(clientePath, f)).isFile(); } catch { return false; } })
      .sort();
  } catch {}

  res.json({
    cliente: clienteNome,
    data,
    pago: pagamentos[`${data}/${clienteNome}`] ?? false,
    arquivos: arquivos.map(nome => ({
      nome,
      status: statuses[`${data}/${clienteNome}/${nome}`] || 'PENDENTE'
    }))
  });
});

// Página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

// Serve a página pública do cliente (antes do fallback SPA)
app.get('/cliente/:token', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'cliente.html'));
});

// SPA fallback — qualquer rota não encontrada serve o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ─── Inicialização ────────────────────────────────────────────────────────────
ensureDefaultUser();
startWatcher(IMPRESSAO_DIR, broadcastUpdate);

app.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Monitorando: ${IMPRESSAO_DIR}\n`);
});
