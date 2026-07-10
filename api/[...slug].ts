import type { VercelRequest, VercelResponse } from '@vercel/node';

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    const { buildApp } = await import('../packages/server/dist/index.js');
    appPromise = buildApp();
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  await app.ready();

  const url = req.url || '/';
  const method = req.method || 'GET';
  const headers = req.headers as Record<string, string>;
  const body = req.body;

  try {
    const response = await app.inject({
      method,
      url,
      headers,
      body,
      query: req.query as Record<string, string>,
    });

    res.statusCode = response.statusCode;
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) {
            res.setHeader(key, v);
          }
        } else {
          res.setHeader(key, value as string);
        }
      }
    }
    res.end(response.rawPayload || response.payload);
  } catch (err) {
    console.error('Request error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
