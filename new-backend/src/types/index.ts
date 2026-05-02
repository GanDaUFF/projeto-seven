export interface OSFile {
  nome: string;
  status: 'PENDENTE' | 'PRODUCAO' | 'FEITO' | 'ENTREGUE';
}

export interface OSCliente {
  nome: string;
  pago: boolean;
  token?: string;
  arquivos: OSFile[];
}

export type OSData = Record<string, Record<string, OSCliente>>;

export interface LoginResponse {
  token: string;
  user?: string;
}
