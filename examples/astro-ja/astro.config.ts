import { defineConfig } from 'astro/config';

export default defineConfig({
  vite: {
    // Resolve Tegaki's source-map-friendly `tegaki@dev` export condition so
    // edits in the monorepo are picked up without a pre-build step.
    resolve: { conditions: ['tegaki@dev'] },
  },
});
