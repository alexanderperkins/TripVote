import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../../src/app.js';

describe('static client serving (clientDistPath)', () => {
  let tempDir;
  const indexHtmlContent =
    '<!doctype html><html><head><title>TripVote</title></head><body><div id="root">App</div></body></html>';

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'tripvote-dist-'));
    writeFileSync(path.join(tempDir, 'index.html'), indexHtmlContent, 'utf8');
  });

  afterAll(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('serves index.html on GET / when clientDistPath is configured', async () => {
    const app = createApp({ clientDistPath: tempDir });
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toBe(indexHtmlContent);
  });

  it('serves index.html as SPA fallback on GET /trips/abc', async () => {
    const app = createApp({ clientDistPath: tempDir });
    const res = await request(app).get('/trips/abc');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toBe(indexHtmlContent);
  });

  it('returns JSON 404 on unknown /api routes even when clientDistPath is configured', async () => {
    const app = createApp({ clientDistPath: tempDir });
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });

  it('continues to serve /api/health with status ok', async () => {
    const app = createApp({ clientDistPath: tempDir });
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
