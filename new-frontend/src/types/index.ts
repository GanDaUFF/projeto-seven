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

export interface LoginResponse {
  token: string;
  username?: string;
}

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
