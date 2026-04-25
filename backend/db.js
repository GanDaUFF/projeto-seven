const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATUS_FILE = path.join(DATA_DIR, 'status.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStatuses() {
  ensureDataDir();
  if (!fs.existsSync(STATUS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function updateStatus(data, cliente, arquivo, status) {
  ensureDataDir();
  const statuses = getStatuses();
  const key = `${data}/${cliente}/${arquivo}`;
  statuses[key] = status;
  fs.writeFileSync(STATUS_FILE, JSON.stringify(statuses, null, 2), 'utf-8');
}

module.exports = { getStatuses, updateStatus };
