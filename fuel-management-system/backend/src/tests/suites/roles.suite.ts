import assert from 'node:assert/strict';
import { describe, it } from '../harness';
import { Envelope, loginAs, request } from '../http';

interface EntryRow {
  id: string;
  driverId: string;
  driver: { name: string } | null;
}

describe('Role-based authorization', () => {
  it('blocks drivers from office dashboards', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/dashboard/summary', { token });
    assert.equal(res.status, 403);
  });

  it('blocks drivers from reports', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/reports/monthly', { token });
    assert.equal(res.status, 403);
  });

  it('blocks accountants from user management (list + create)', async () => {
    const token = await loginAs('accountant');
    const list = await request('/api/users', { token });
    assert.equal(list.status, 403);
    const create = await request('/api/users', {
      method: 'POST',
      token,
      json: { name: 'Blocked User', email: 'blocked@x.dev', password: 'Blocked@123', role: 'admin' }
    });
    assert.equal(create.status, 403);
  });

  it('blocks accountants from OCR processing', async () => {
    const token = await loginAs('accountant');
    const res = await request('/api/ocr/process', { method: 'POST', token, form: new FormData() });
    assert.equal(res.status, 403);
  });

  it('blocks drivers from editing fuel entries', async () => {
    const admin = await loginAs('admin');
    const driver = await loginAs('driver');
    const list = await request<Envelope<EntryRow[]>>('/api/fuel?limit=1', { token: admin });
    const entryId = list.json?.data?.[0]?.id;
    assert.ok(entryId, 'expected at least one fuel entry (run npm run seed)');
    const res = await request(`/api/fuel/${entryId}`, { method: 'PUT', token: driver, json: { liters: 1 } });
    assert.equal(res.status, 403);
  });

  it('blocks drivers from creating drivers', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/drivers', {
      method: 'POST',
      token,
      json: { name: 'Nope', phone: '+923000000000', employeeId: 'EMP-NOPE' }
    });
    assert.equal(res.status, 403);
  });

  it('scopes drivers to their own fuel entries only', async () => {
    const driverToken = await loginAs('driver');
    const me = await request<Envelope<{ driver: { id: string } }>>('/auth/me', {
      token: driverToken
    });
    const ownDriverId = me.json?.data?.driver?.id;
    assert.ok(ownDriverId, 'driver account must be linked to a driver profile');

    const res = await request<Envelope<EntryRow[]>>('/api/fuel?limit=100', { token: driverToken });
    assert.equal(res.status, 200);
    const entries = res.json?.data ?? [];
    assert.ok(entries.length >= 1, 'driver should see his own seeded entries');
    for (const entry of entries) assert.equal(entry.driverId, ownDriverId);
  });

  it("blocks drivers from viewing another driver's entry", async () => {
    const admin = await loginAs('admin');
    const driverToken = await loginAs('driver');
    const me = await request<Envelope<{ driver: { id: string } }>>('/auth/me', {
      token: driverToken
    });
    const ownDriverId = me.json?.data?.driver?.id;

    const list = await request<Envelope<EntryRow[]>>('/api/fuel?limit=100', { token: admin });
    const foreign = (list.json?.data ?? []).find((entry) => entry.driverId !== ownDriverId);
    assert.ok(foreign, 'expected an entry owned by another driver');

    const res = await request(`/api/fuel/${foreign.id}`, { token: driverToken });
    assert.equal(res.status, 403);
  });
});