import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' keeps every asset path relative so the build works from any
// IPFS gateway path (/ipfs/<cid>/) as well as from hayeon.eth.limo.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { target: 'es2022' }
});
