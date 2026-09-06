import assert from 'node:assert/strict';
import { describe, it } from '../harness';
import { Envelope, loginAs, request, requestBinary } from '../http';

const MONTH = new Date().toISOString().slice(0, 7);

describe('Monthly reports', () => {
  it('builds a consistent JSON report', async () => {
    const token = await loginAs('admin');
    const res = await request<
      Envelope<{
        month: string;
        monthLabel: string;
        totals: { entries: number; liters: number; amount: number; averageAmountPerEntry: number };
        byDriver: unknown[];
        byVehicle: unknown[];
        byFuelType: unknown[];
        entries: Array<{ id: string; totalAmount: number }>;
      }>
    >(`/api/reports/monthly?month=${MONTH}`, { token });
    assert.equal(res.status, 200);
    assert.equal(res.json?.data?.month, MONTH);
    assert.equal(res.json?.data?.totals.entries, (res.json?.data?.entries ?? []).length);
    assert.ok(Array.isArray(res.json?.data?.byDriver));
    assert.ok(Array.isArray(res.json?.data?.byVehicle));
  });

  it('generates a real PDF', async () => {
    const token = await loginAs('admin');
    const res = await requestBinary(`/api/reports/monthly/pdf?month=${MONTH}`, { token });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(res.buffer.subarray(0, 5).toString(), '%PDF-');
  });

  it('forces attachment download with download=1', async () => {
    const token = await loginAs('admin');
    const res = await requestBinary(`/api/reports/monthly/pdf?month=${MONTH}&download=1`, { token });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-disposition') ?? '', /attachment/);
  });

  it('supports driver-wise report variants', async () => {
    const token = await loginAs('admin');
    const drivers = await request<Envelope<Array<{ id: string }>>>('/api/drivers', { token });
    const driverId = drivers.json?.data?.[0]?.id;
    assert.ok(driverId);

    const res = await request<Envelope<{ filters: { driverName: string | null } }>>(
      `/api/reports/monthly?month=${MONTH}&driverId=${driverId}`,
      { token }
    );
    assert.equal(res.status, 200);
    assert.ok(res.json?.data?.filters?.driverName, 'expected the filter to echo the driver name');

    const pdf = await requestBinary(`/api/reports/monthly/pdf?month=${MONTH}&driverId=${driverId}`, {
      token
    });
    assert.equal(pdf.buffer.subarray(0, 5).toString(), '%PDF-');
  });

  it('rejects an invalid month parameter', async () => {
    const token = await loginAs('admin');
    const res = await request('/api/reports/monthly?month=June', { token });
    assert.equal(res.status, 400);
  });
});