import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import heartbeatHandler from './api/visitors/heartbeat.js';
import achievementsHandler from './api/achievements/index.js';
import followsHandler from './api/follows/index.js';

function visitorsApiPlugin() {
  return {
    name: 'visitors-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/visitors/heartbeat' || url === '/api/visitors') {
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          if (req.method === 'GET') {
            req.body = {};
            heartbeatHandler(req, res).catch((err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message, status: 'error' }));
            });
            return;
          }

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

        if (url === '/api/achievements') {
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
            achievementsHandler(req, res);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message, status: 'error' }));
          }
          return;
        }

        if (url === '/api/follows') {
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          if (req.method === 'GET') {
            req.body = {};
            followsHandler(req, res).catch((err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message, status: 'error' }));
            });
            return;
          }

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

            try {
              await followsHandler(req, res);
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons': ['lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
