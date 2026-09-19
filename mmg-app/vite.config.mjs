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
    // port: 6000,
    strictPort: true,
    host: "0.0.0.0",
    // origin: "http://0.0.0.0:6000",
    // Vite's dev server rejects unrecognized Host headers by default (DNS
    // rebinding protection). This server is reached by IP and by whatever
    // public DNS name AWS assigns (which changes per instance), so there's
    // no fixed hostname to allowlist — access is already restricted by the
    // security group, so disable the check instead.
    allowedHosts: true,
   },
});
