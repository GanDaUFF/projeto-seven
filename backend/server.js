const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getStatuses, updateStatus } = require('./db');
const { startWatcher } = require('./watcher');
const { generateOS } = require('./generateOS');

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

  const statuses = getStatuses();
  const result = [];

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

      // Cada arquivo tem seu próprio status
      const arquivosComStatus = arquivos.map((arquivo) => ({
        nome: arquivo,
        status: statuses[`${dateDir}/${clienteDir}/${arquivo}`] || 'PENDENTE'
      }));

      return { nome: clienteDir, arquivos: arquivosComStatus };
    });

    result.push({ data: dateDir, clientes });
  }

  return result;
}

// ─── Rotas da API ─────────────────────────────────────────────────────────────

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

  const validStatuses = ['PENDENTE', 'PRODUCAO', 'ENTREGUE'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use: ${validStatuses.join(', ')}` });
  }

  updateStatus(data, cliente, arquivo, status);
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

// SPA fallback — qualquer rota não encontrada serve o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ─── Inicialização ────────────────────────────────────────────────────────────
startWatcher(IMPRESSAO_DIR, broadcastUpdate);

app.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Monitorando: ${IMPRESSAO_DIR}\n`);
});
