import chokidar from 'chokidar';
import { IMPRESSAO_DIR } from '../config';

export function startWatcher(onChange: () => void): chokidar.FSWatcher {
  const watcher = chokidar.watch(IMPRESSAO_DIR, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
    depth: 3,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher
    .on('addDir', (p) => { console.log(`[watcher] Pasta criada: ${p}`); onChange(); })
    .on('unlinkDir', (p) => { console.log(`[watcher] Pasta removida: ${p}`); onChange(); })
    .on('add', (p) => { console.log(`[watcher] Arquivo adicionado: ${p}`); onChange(); })
    .on('unlink', (p) => { console.log(`[watcher] Arquivo removido: ${p}`); onChange(); })
    .on('error', (err) => { console.error('[watcher] Erro:', err); });

  console.log(`[watcher] Monitorando: ${IMPRESSAO_DIR}`);
  return watcher;
}
