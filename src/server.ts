import { serve } from 'bun';
import previewPage from '../public/preview.html';

const server = serve({
  routes: {
    '/': previewPage,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Listening on ${server.url}`);
