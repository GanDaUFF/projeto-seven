export type ValidStatus = 'PENDENTE' | 'PRODUCAO' | 'FEITO' | 'ENTREGUE';

export interface OSFile {
  nome: string;
  status: ValidStatus;
}

export interface OSCliente {
  nome: string;
  pago: boolean;
  arquivos: OSFile[];
}

export type OSData = Record<string, Record<string, OSCliente>>;

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface SetupStatusResponse {
  needsSetup: boolean;
}

export interface SetupAdminResponse {
  success: boolean;
  user: AuthUser;
}

export interface AppConfig {
  nomeGrafica: string;
  telefoneGrafica: string;
  impressaoDir: string;
  logoPath: string;
  publicBaseUrl: string;
  ambiente: string;
  impressaoDirConfigured: boolean;
  warning?: string;
}

export type AppConfigPatch = Partial<
  Pick<AppConfig, 'nomeGrafica' | 'telefoneGrafica' | 'impressaoDir' | 'logoPath' | 'publicBaseUrl'>
>;

export interface StatusCounts {
  PENDENTE: number;
  PRODUCAO: number;
  FEITO: number;
  ENTREGUE: number;
}

export interface StatusConfig {
  label: string;
  badge: string;
  dot: string;
  active: string;
  hover: string;
}
