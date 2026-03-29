import { serve } from 'bun';
import chatPage from './frontend/chat.html';
import previewPage from './frontend/preview.html';

export function serveTegakiWeb() {
  const server = serve({
    routes: {
      '/': previewPage,
      '/chat': chatPage,
    },
    development: {
      hmr: true,
      console: true,
    },
  });

  console.log(`Listening on ${server.url}`);
}

if (import.meta.main) serveTegakiWeb();
