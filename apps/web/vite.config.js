import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import supabaseApiHandler from '../../api/index.js';

function supabaseIntegratedApiPlugin() {
  return {
    name: 'supabase-integrated-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/v1')) {
          return supabaseApiHandler(req, res);
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), supabaseIntegratedApiPlugin()],
  server: {
    port: 3000
  }
});
