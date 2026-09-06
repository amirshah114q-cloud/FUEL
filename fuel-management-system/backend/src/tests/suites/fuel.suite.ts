import assert from 'node:assert/strict';
import { describe, it } from '../harness';
import { Envelope, loginAs, request } from '../http';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const VALID_ENTRY = {
  date: todayISO(),
  time: '10:30',
  petrolPumpName: 'QA Test Pump',
  fuelType: 'Petrol',
  liters: 20,
  pricePerLiter: 260,
  totalAmount: 5200,
  receiptNumber: 'QA-TEST-ENTRY'
};

describe('Fuel entries — validation, filters & pagination', () => {
  it('rejects a missing required field with field-level errors', async () => {
    const token = await loginAs('driver');
    const { petrolPumpName, receiptNumber, ...partial } = VALID_ENTRY;
    void petrolPumpName;
    void receiptNumber;
    const res = await request<Envelope>('/api/fuel', { method: 'POST', token, json: partial });
    assert.equal(res.status, 400);
    assert.ok(res.json?.errors?.petrolPumpName, 'expected an error for petrolPumpName');
    assert.ok(res.json?.errors?.receiptNumber, 'expected an error for receiptNumber');
  });

  it('rejects a total that contradicts liters × price', async () => {
    const token = await loginAs('driver');
    const res = await request<Envelope>('/api/fuel', {
      method: 'POST',
      token,
      json: { ...VALID_ENTRY, totalAmount: 999 }
    });
    assert.equal(res.status, 400);
    assert.match(res.json?.errors?.totalAmount?.[0] ?? '', /Liters/i);
  });

  it('rejects an impossible calendar date', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/fuel', {
      method: 'POST',
      token,
      json: { ...VALID_ENTRY, date: '2026-02-31' }
    });
    assert.equal(res.status, 400);
  });

  it('rejects an unsupported fuel type', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/fuel', {
      method: 'POST',
      token,
      json: { ...VALID_ENTRY, fuelType: 'CNG' }
    });
    assert.equal(res.status, 400);
  });

  it('rejects an invalid month filter', async () => {
    const token = await loginAs('admin');
    const res = await request('/api/fuel?month=banana', { token });
    assert.equal(res.status, 400);
  });

  it('filters by fuel type', async () => {
    const token = await loginAs('admin');
    const res = await request<Envelope<Array<{ fuelType: string }>>>(
      '/api/fuel?fuelType=Diesel&limit=100',
      { token }
    );
    assert.equal(res.status, 200);
    const entries = res.json?.data ?? [];
    assert.ok(entries.length >= 1, 'expected diesel entries from the seed');
    for (const entry of entries) assert.equal(entry.fuelType, 'Diesel');
  });

  it('searches across pump, receipt and vehicle number', async () => {
    const token = await loginAs('admin');
    const res = await request<Envelope<unknown[]>>('/api/fuel?search=RCP-902', { token });
    assert.equal(res.status, 200);
    assert.ok((res.json?.meta?.totalItems ?? 0) >= 5, 'expected the seeded RCP-902xx receipts');
  });

  it('paginates results', async () => {
    const token = await loginAs('admin');
    const res = await request<Envelope<unknown[]>>('/api/fuel?limit=2&page=2', { token });
    assert.equal(res.status, 200);
    assert.equal(res.json?.meta?.page, 2);
    assert.ok((res.json?.data ?? []).length <= 2);
    assert.ok((res.json?.meta?.totalPages ?? 0) >= 2);
  });

  it('filters by a 40-day date range', async () => {
    const token = await loginAs('admin');
    const to = new Date();
    const from = new Date(to.getTime() - 40 * 24 * 60 * 60 * 1000);
    const iso = (d: Date): string => d.toISOString().slice(0, 10);
    const res = await request<Envelope<unknown[]>>(`/api/fuel?from=${iso(from)}&to=${iso(to)}`, {
      token
    });
    assert.equal(res.status, 200);
    assert.ok((res.json?.meta?.totalItems ?? 0) >= 10, 'expected all 10 seeded entries in a 40-day window');
  });
});