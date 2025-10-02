import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Proxy API requests to backend server
 */
const API_TARGET = process.env['API_BASE_URL'] || 'http://localhost:5001';

if (!process.env['API_BASE_URL']) {
  console.warn('⚠️  API_BASE_URL environment variable not set, using default:', API_TARGET);
} else {
  console.log('✓ API_BASE_URL configured:', API_TARGET);
}

app.use(express.json());

app.use(
  ['/parse-recipe-url', '/get-recipes', '/convert-raw-recipe', '/test-scrape'],
  async (req, res) => {
    try {
      const targetUrl = `${API_TARGET}${req.originalUrl}`;
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        res.json(data);
      } else {
        const data = await response.text();
        res.send(data);
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(502).json({ error: 'Failed to proxy request to backend' });
    }
  }
);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
