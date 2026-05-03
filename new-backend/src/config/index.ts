export {
  ROOT,
  DATA_DIR,
  STATUS_FILE,
  USERS_FILE,
  PORT,
  IMPRESSAO_DIR,
  getConfig,
  updateConfig,
  isImpressaoDirConfigured,
} from './appConfig';
export type { AppConfig } from './appConfig';
export { getJwtSecret } from './secrets';
