import path from 'path';

let appPromise = null;

async function getApp() {
  if (!appPromise) {
    const { buildApp } = await import(path.resolve(process.cwd(), 'packages/server/dist/index.js'));
    appPromise = buildApp();
  }
  return appPromise;
}

export const handler = async function(event, context) {
  const app = await getApp();
  await app.ready();

  const url = event.path + (event.rawQuery ? '?' + event.rawQuery : '');
  const method = event.httpMethod;
  const headers = event.headers;
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body) : undefined;

  try {
    const response = await app.inject({
      method,
      url,
      headers,
      body,
    });

    return {
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.payload,
    };
  } catch (err) {
    console.error('Request error:', err);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};
