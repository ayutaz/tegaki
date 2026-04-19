import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Tegaki exposes source TypeScript under the `tegaki@dev` import condition so
  // examples pick up workspace changes without a build step.
  resolve: { conditions: ['tegaki@dev'] },
});
