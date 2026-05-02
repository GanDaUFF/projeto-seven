import http from 'http';

interface NgrokTunnel {
  proto: string;
  public_url: string;
}

interface NgrokResponse {
  tunnels?: NgrokTunnel[];
}

export function getNgrokUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data) as NgrokResponse;
          const tunnel = json.tunnels?.find((t) => t.proto === 'https') ?? json.tunnels?.[0];
          resolve(tunnel?.public_url ?? null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(2000, () => { req.destroy(); resolve(null); });
  });
}
