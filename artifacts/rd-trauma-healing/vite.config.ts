import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env files are loaded into process.env for server plugins
function loadLocalEnv() {
  const envFiles = [
    path.resolve(__dirname, '..', '..', '.env'),
    path.resolve(__dirname, '.env'),
  ];
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {}
    }
  }
}
loadLocalEnv();

import { saveAppointment } from './src/server/google-sheets';

const rawPort = process.env.PORT || '5173';
const port = Number(rawPort) || 5173;
const basePath = process.env.BASE_PATH || '/';

function appointmentApiPlugin(): Plugin {
  const handler = (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0];
    if (url === '/api/appointments' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const result = await saveAppointment(payload);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Failed to process appointment request' }));
        }
      });
      return;
    }
    next();
  };

  return {
    name: 'appointment-api-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

function htmlMetaPlugin(): Plugin {
  return {
    name: 'html-meta-plugin',
    transformIndexHtml(html) {
      const defaultDomain = 'https://www.traumahealingwithrebeccadakin.co.uk';
      const rawDomain =
        process.env.VITE_SITE_URL ||
        process.env.SITE_URL ||
        defaultDomain;

      const siteUrl = (rawDomain.startsWith('http://') || rawDomain.startsWith('https://')
        ? rawDomain
        : `https://${rawDomain}`).replace(/\/+$/, '');

      return html
        .replace(/__SITE_URL__/g, siteUrl)
        .replace(/https:\/\/rd-trauma-healing\.vercel\.app/g, siteUrl);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    appointmentApiPlugin(),
    htmlMetaPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, '..', '..', 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
