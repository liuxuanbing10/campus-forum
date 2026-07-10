import { buildApp } from '../../packages/server/src/index';
import { boardsPlugin } from '../../plugins/boards/src/index';
import { postsPlugin } from '../../plugins/posts/src/index';
import { authPlugin } from '../../plugins/auth/src/index';
import { adminPlugin } from '../../plugins/admin/src/index';
import { notificationsPlugin } from '../../plugins/notifications/src/index';
import { searchPlugin } from '../../plugins/search/src/index';
import { messagesPlugin } from '../../plugins/messages/src/index';
import { teamsPlugin } from '../../plugins/teams/src/index';
import { socialPlugin } from '../../plugins/social/src/index';
import { rssPlugin } from '../../plugins/rss/src/index';
import { exportPlugin } from '../../plugins/export/src/index';

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = buildApp({
      plugins: [
        boardsPlugin,
        postsPlugin,
        authPlugin,
        adminPlugin,
        notificationsPlugin,
        searchPlugin,
        messagesPlugin,
        teamsPlugin,
        socialPlugin,
        rssPlugin,
        exportPlugin,
      ],
    });
  }
  return appPromise;
}

export async function handler(event: any, context: any) {
  const app = await getApp();
  await app.ready();

  const url = event.path + (event.rawQuery ? '?' + event.rawQuery : '');
  const method = event.httpMethod;
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body) : undefined;

  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(event.headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  if (url === '/api/debug/headers') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        method, 
        headers: normalizedHeaders,
        rawHeaders: Object.keys(event.headers).reduce((acc: Record<string, string>, key) => { 
          acc[key] = event.headers[key]; 
          return acc; 
        }, {})
      }),
    };
  }

  try {
    const response = await app.inject({
      method,
      url,
      headers: normalizedHeaders,
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
}
