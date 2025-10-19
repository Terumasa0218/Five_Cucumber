import { POST } from '../app/api/friend/create/route';
import { NextRequest } from 'next/server';

const makeReq = (body: any) => new NextRequest('http://localhost/api/friend/create', {
  method: 'POST',
  body: JSON.stringify(body)
} as any);

describe('friend create API memory fallback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.VERCEL_REDIS_URL;
    delete process.env.VERCEL_REDIS_TOKEN;
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_HAS_SHARED_STORE;
  });

  afterAll(() => { process.env = originalEnv; });

  it('returns 200 with memory fallback in development', async () => {
    process.env.NODE_ENV = 'development';
    const req = makeReq({ roomSize: 2, nickname: 'dev', turnSeconds: 15, maxCucumbers: 5 });
    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('returns 503 without shared store in production', async () => {
    process.env.NODE_ENV = 'production';
    const req = makeReq({ roomSize: 2, nickname: 'prod', turnSeconds: 15, maxCucumbers: 5 });
    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.ok).toBe(false);
  });
});


