// https://github.com/vitejs/vite/discussions/3448
// import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';

// ----------------------------------------------------------------------

export default defineConfig({
  plugins: [react(), jsconfigPaths()],
  // https://github.com/jpuri/react-draft-wysiwyg/issues/1317
  base: '/',
  preview: {
    port: 6000,
    strictPort: true,
  },
  server: {
    watch: {
      usePolling: true,
    },
    allowedHosts: ['c9c36e9ca2cd.ngrok-free.app'],
    // port: 6000,
    strictPort: true,
    host: "0.0.0.0",
    // origin: "http://0.0.0.0:6000",
  },
});
