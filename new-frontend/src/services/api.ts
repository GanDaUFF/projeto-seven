import type {
  LoginResponse,
  OSData,
  ValidStatus,
  SetupStatusResponse,
  SetupAdminResponse,
  AppConfig,
  AppConfigPatch,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.replace('/login');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? 'Erro desconhecido');
  }
  return res.json() as Promise<T>;
}

export const api = {
  login(username: string, password: string) {
    return request<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getOS() {
    return request<OSData>('/api/os');
  },

  updateStatus(data: string, cliente: string, arquivo: string, status: ValidStatus) {
    return request<{ success: boolean }>('/api/status', {
      method: 'POST',
      body: JSON.stringify({ data, cliente, arquivo, status }),
    });
  },

  updatePagamento(data: string, cliente: string, pago: boolean) {
    return request<{ success: boolean }>('/api/pagamento', {
      method: 'POST',
      body: JSON.stringify({ data, cliente, pago }),
    });
  },

  generateOS(data: string, cliente: string) {
    return request<{ success: boolean; fileName: string }>('/api/generate-os', {
      method: 'POST',
      body: JSON.stringify({ data, cliente }),
    });
  },

  getToken(data: string, cliente: string) {
    return request<{ token: string }>('/api/token', {
      method: 'POST',
      body: JSON.stringify({ data, cliente }),
    });
  },

  getTunnelUrl() {
    return request<{ url: string | null }>('/api/tunnel-url');
  },

  getPublicCliente(token: string) {
    return fetch(`${BASE_URL}/api/public/cliente/${token}`).then(r => r.json()) as Promise<{
      cliente: string;
      data: string;
      pago: boolean;
      arquivos: { nome: string; status: string }[];
    }>;
  },

  downloadUrl(data: string, cliente: string, arquivo: string): string {
    const token = getToken() ?? '';
    return `${BASE_URL}/api/download?data=${encodeURIComponent(data)}&cliente=${encodeURIComponent(cliente)}&arquivo=${encodeURIComponent(arquivo)}&token=${encodeURIComponent(token)}`;
  },

  getSetupStatus() {
    return request<SetupStatusResponse>('/api/setup/status');
  },

  postSetupAdmin(username: string, password: string, confirmPassword: string) {
    return request<SetupAdminResponse>('/api/setup/admin', {
      method: 'POST',
      body: JSON.stringify({ username, password, confirmPassword }),
    });
  },

  getConfig() {
    return request<AppConfig>('/api/config');
  },

  patchConfig(patch: AppConfigPatch) {
    return request<AppConfig>('/api/config', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
};
