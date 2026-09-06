import assert from 'node:assert/strict';
import { describe, it } from '../harness';
import { Envelope, loginAs, request } from '../http';

const MONTH_RE = /^\d{4}-\d{2}$/;

describe('Dashboard aggregations', () => {
  it('returns a complete summary', async () => {
    const token = await loginAs('admin');
    const res = await request<
      Envelope<{
        month: string;
        totalLiters: number;
        totalAmount: number;
        entryCount: number;
        averageAmountPerEntry: number;
        activeDrivers: number;
        activeVehicles: number;
        byFuelType: unknown[];
        previousMonth: { month: string };
      }>
    >('/api/dashboard/summary', { token });
    assert.equal(res.status, 200);
    assert.match(res.json?.data?.month ?? '', MONTH_RE);
    assert.equal(typeof res.json?.data?.totalAmount, 'number');
    assert.equal(res.json?.data?.activeDrivers, 3);
    assert.equal(res.json?.data?.activeVehicles, 3);
    assert.match(res.json?.data?.previousMonth?.month ?? '', MONTH_RE);
    assert.ok(Array.isArray(res.json?.data?.byFuelType));
  });

  it('returns a zero-filled 12-month trend', async () => {
    const token = await loginAs('admin');
    const res = await request<Envelope<{ months: number; trend: Array<{ month: string }> }>>(
      '/api/dashboard/monthly?months=12',
      { token }
    );
    assert.equal(res.status, 200);
    const trend = res.json?.data?.trend ?? [];
    assert.equal(trend.length, 12);
    for (const point of trend) assert.match(point.month, MONTH_RE);
  });

  it('returns daily usage for every day of the month', async () => {
    const token = await loginAs('admin');
    const res = await request<Envelope<{ days: Array<{ day: number; liters: number }> }>>(
      '/api/dashboard/daily',
      { token }
    );
    assert.equal(res.status, 200);
    const days = res.json?.data?.days ?? [];
    assert.ok(days.length >= 28 && days.length <= 31);
    days.forEach((day, index) => assert.equal(day.day, index + 1));
  });

  it('rejects an invalid month', async () => {
    const token = await loginAs('admin');
    const res = await request('/api/dashboard/summary?month=2026-13', { token });
    assert.equal(res.status, 400);
  });

  it('ranks vehicle expenses in descending order', async () => {
    const token = await loginAs('admin');
    const res = await request<Envelope<Array<{ vehicleNumber: string; amount: number }>>>(
      '/api/dashboard/vehicle-expenses',
      { token }
    );
    assert.equal(res.status, 200);
    const vehicles = res.json?.data ?? [];
    assert.ok(vehicles.length >= 3, 'expected all seeded vehicles');
    for (let i = 1; i < vehicles.length; i++) {
      assert.ok(vehicles[i].amount <= vehicles[i - 1].amount, 'amounts must be non-increasing');
    }
    assert.ok(vehicles.some((v) => v.vehicleNumber === 'KHI-1234'));
  });

  it('ranks driver expenses in descending order', async () => {
    const token = await loginAs('admin');
    const res = await request<Envelope<Array<{ amount: number }>>>('/api/dashboard/driver-expenses', {
      token
    });
    assert.equal(res.status, 200);
    const drivers = res.json?.data ?? [];
    for (let i = 1; i < drivers.length; i++) {
      assert.ok(drivers[i].amount <= drivers[i - 1].amount, 'amounts must be non-increasing');
    }
  });
});