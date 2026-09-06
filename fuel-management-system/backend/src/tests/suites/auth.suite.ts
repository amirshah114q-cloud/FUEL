import assert from 'node:assert/strict';
import { describe, it } from '../harness';
import { Envelope, loginAs, request } from '../http';

describe('Auth & login', () => {
  it('reports health with a connected database', async () => {
    const res = await request<Envelope<{ database: string }>>('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.json?.data?.database, 'connected');
  });

  it('logs in an admin and returns a token plus a safe user profile', async () => {
    const token = await loginAs('admin');
    const me = await request<Envelope<{ user: { id: string; role: string; email: string } }>>(
      '/auth/me',
      { token }
    );
    assert.equal(me.status, 200);
    assert.equal(me.json?.data?.user.role, 'admin');
    assert.ok(!JSON.stringify(me.json).includes('passwordHash'), 'password hash must never be exposed');
  });

  it('returns the driver profile and assigned vehicle for a driver', async () => {
    const token = await loginAs('driver');
    const me = await request<
      Envelope<{
        user: { role: string };
        driver: { id: string; employeeId: string; vehicle: { vehicleNumber: string } | null };
      }>
    >('/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.json?.data?.user.role, 'driver');
    assert.equal(me.json?.data?.driver?.employeeId, 'EMP-DRV-001');
    assert.equal(me.json?.data?.driver?.vehicle?.vehicleNumber, 'KHI-1234');
  });

  it('rejects wrong credentials with a generic message (no user enumeration)', async () => {
    const res = await request<Envelope>('/api/auth/login', {
      method: 'POST',
      json: { email: `ghost-${Date.now()}@nowhere.dev`, password: 'WrongPass1!' }
    });
    assert.equal(res.status, 401);
    assert.equal(res.json?.message, 'Invalid email or password.');
  });

  it('rejects a malformed login payload with field errors', async () => {
    const res = await request<Envelope>('/api/auth/login', {
      method: 'POST',
      json: { email: 'not-an-email', password: '' }
    });
    assert.equal(res.status, 400);
    assert.ok(res.json?.errors, 'expected field-level errors');
  });

  it('rejects /auth/me without a token', async () => {
    const res = await request('/api/auth/me');
    assert.equal(res.status, 401);
  });

  it('rejects a tampered token', async () => {
    const token = await loginAs('admin');
    const res = await request('/auth/me', { token: `${token.slice(0, -4)}XXXX` });
    assert.equal(res.status, 401);
  });

  it('locks login after 5 failed attempts (brute-force guard)', async () => {
    const email = `locktest-${Date.now()}@nowhere.dev`;
    for (let i = 0; i < 5; i++) {
      const res = await request('/api/auth/login', {
        method: 'POST',
        json: { email, password: 'WrongPass1!' }
      });
      assert.equal(res.status, 401);
    }
    const locked = await request<Envelope>('/api/auth/login', {
      method: 'POST',
      json: { email, password: 'AnotherPass123!' }
    });
    assert.equal(locked.status, 429);
    assert.match(locked.json?.message ?? '', /lock/i);
  });
});