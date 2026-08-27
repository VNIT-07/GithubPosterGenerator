import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import heartbeatHandler from './api/visitors/heartbeat.js';

function visitorsApiPlugin() {
  return {
    name: 'visitors-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/visitors/heartbeat' || url === '/api/visitors') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            if (body) {
              try {
                req.body = JSON.parse(body);
              } catch {
                req.body = body;
              }
            } else {
              req.body = {};
            }

            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return res;
            };

            try {
              await heartbeatHandler(req, res);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message, status: 'error' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), visitorsApiPlugin()],
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
});

