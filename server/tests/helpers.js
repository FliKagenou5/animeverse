import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const databasePath = path.join(os.tmpdir(), `animeverse-test-${suffix}.db`);

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = databasePath;
process.env.AUTO_SEED = 'false';

const { createApp } = await import('../src/app.js');
const { closeDb, getDb, openDatabase, migrate } = await import('../src/database/index.js');
const { seedDatabase } = await import('../src/database/seed.js');

export { migrate, openDatabase };

export function removeDatabaseFiles(target = databasePath) {
  for (const extension of ['', '-wal', '-shm']) {
    fs.rmSync(`${target}${extension}`, { force: true });
  }
}

export async function startTestServer({ seed = true } = {}) {
  const db = getDb();
  if (seed) seedDatabase(db, { quiet: true });

  const server = http.createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(method, apiPath, { body, cookie, headers = {} } = {}) {
    const requestHeaders = { ...headers };
    if (cookie) requestHeaders.Cookie = cookie;
    if (body !== undefined) {
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    }

    const response = await fetch(`${baseUrl}${apiPath}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });

    const text = await response.text();
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    return {
      status: response.status,
      headers: response.headers,
      cookies: response.headers.getSetCookie(),
      body: parsed,
    };
  }

  async function login(email, password) {
    const response = await request('POST', '/api/auth/login', { body: { email, password } });
    if (response.status !== 200) {
      throw new Error(`Login failed (${response.status}): ${JSON.stringify(response.body)}`);
    }
    const cookie = response.cookies.find((item) => item.startsWith('av_session='));
    if (!cookie) throw new Error('Login did not set a session cookie.');
    return cookie.split(';')[0];
  }

  async function stop({ removeDatabase = true } = {}) {
    await new Promise((resolve) => server.close(resolve));
    closeDb();
    if (removeDatabase) removeDatabaseFiles();
  }

  return { baseUrl, request, login, stop };
}
