// Read-only visual reference. Cache/output stay in the integration workspace.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root:'C:/Users/HP/Desktop/projects/PadiCheckV2',
  cacheDir:'C:/Users/HP/Desktop/projects/padicheckui/.tmp/vite-reference',
  plugins:[react()],
  server:{host:'127.0.0.1',port:5188,strictPort:true},
});
