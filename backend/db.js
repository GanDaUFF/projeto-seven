const fs   = require('fs');
const path = require('path');

const DATA_DIR    = path.join(__dirname, '..', 'data');
const STATUS_FILE = path.join(DATA_DIR, 'status.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile() {
  ensureDataDir();
  if (!fs.existsSync(STATUS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')); }
  catch { return {}; }
}

function writeFile(data) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Status por arquivo  (chave: "DD.MM/cliente/arquivo") ────────────────────

const VALID_STATUSES = ['PENDENTE', 'PRODUCAO', 'FEITO', 'ENTREGUE'];

function getStatuses() {
  return readFile();
}

function updateStatus(data, cliente, arquivo, status) {
  const all = readFile();
  all[`${data}/${cliente}/${arquivo}`] = status;
  writeFile(all);
}

// ─── Pagamento por cliente  (chave: "pag:DD.MM/cliente") ─────────────────────

function getPagamentos() {
  const all = readFile();
  const pag = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith('pag:')) pag[k.slice(4)] = v;
  }
  return pag;
}

function updatePagamento(data, cliente, pago) {
  const all = readFile();
  all[`pag:${data}/${cliente}`] = Boolean(pago);
  writeFile(all);
}

module.exports = { getStatuses, updateStatus, getPagamentos, updatePagamento, VALID_STATUSES };
