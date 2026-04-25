const http = require('http');

// Consulta a API local do ngrok (roda na porta 4040 por padrão)
function getNgrokUrl() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Prefere o túnel HTTPS
          const tunnel = json.tunnels?.find(t => t.proto === 'https') ?? json.tunnels?.[0];
          resolve(tunnel?.public_url ?? null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));

    // Timeout de 2s — se o ngrok não estiver rodando, responde rápido
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

module.exports = { getNgrokUrl };
