import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DATA_DIR } from '../config';
import { applySchema } from './schema';

const DB_FILE = path.join(DATA_DIR, 'seven.db');

let instance: Database.Database | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function open(): Database.Database {
  ensureDataDir();
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function getDb(): Database.Database {
  if (!instance) {
    instance = open();
    applySchema(instance);
    console.log(`[db] SQLite aberto em ${DB_FILE}`);
  }
  return instance;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export function getMeta(key: string): string | null {
  const row = getDb()
    .prepare<[string], { value: string }>('SELECT value FROM app_meta WHERE key = ?')
    .get(key);
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

export const DB_FILE_PATH = DB_FILE;
