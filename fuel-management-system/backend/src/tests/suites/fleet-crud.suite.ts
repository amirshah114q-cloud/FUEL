import assert from 'node:assert/strict';
import { describe, it } from '../harness';
import { Envelope, loginAs, request } from '../http';

const SUFFIX = Date.now().toString(36);
const QA = {
  vehicleNumber: `QA-${SUFFIX}`,
  employeeId: `EMP-QA-${SUFFIX}`,
  driverName: `QA Driver ${SUFFIX}`,
  email: `qa-${SUFFIX}@fleet.test`,
  password: 'QaPass123',
  newPassword: 'QaNewPass123'
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('Fleet & user lifecycle (creates and cleans up QA records)', () => {
  let adminToken = '';
  let vehicleId = '';
  let driverId = '';
  let userId = '';
  let entryId = '';

  it('admin creates a vehicle', async () => {
    adminToken = await loginAs('admin');
    const res = await request<Envelope<{ id: string }>>('/api/vehicles', {
      method: 'POST',
      token: adminToken,
      json: { vehicleNumber: QA.vehicleNumber, vehicleType: 'Van', model: 'QA Test Van' }
    });
    assert.equal(res.status, 201);
    vehicleId = res.json?.data?.id ?? '';
    assert.ok(vehicleId);
  });

  it('rejects duplicate vehicle numbers', async () => {
    const res = await request('/api/vehicles', {
      method: 'POST',
      token: adminToken,
      json: { vehicleNumber: QA.vehicleNumber, vehicleType: 'Van', model: 'Duplicate' }
    });
    assert.equal(res.status, 409);
  });

  it('creates a driver and links the vehicle (two-way sync)', async () => {
    const res = await request<
      Envelope<{ id: string; assignedVehicle: { vehicleNumber: string } | null }>
    >('/api/drivers', {
      method: 'POST',
      token: adminToken,
      json: {
        name: QA.driverName,
        phone: '+92-300-9999999',
        employeeId: QA.employeeId,
        assignedVehicleId: vehicleId
      }
    });
    assert.equal(res.status, 201);
    driverId = res.json?.data?.id ?? '';
    assert.ok(driverId);
    assert.equal(res.json?.data?.assignedVehicle?.vehicleNumber, QA.vehicleNumber);

    const vehicle = await request<Envelope<{ assignedDriver: { name: string } | null }>>(
      `/api/vehicles/${vehicleId}`,
      { token: adminToken }
    );
    assert.equal(vehicle.json?.data?.assignedDriver?.name, QA.driverName);
  });

  it('rejects duplicate employee IDs', async () => {
    const res = await request('/api/drivers', {
      method: 'POST',
      token: adminToken,
      json: { name: 'Duplicate Driver', phone: '+92-300-8888888', employeeId: QA.employeeId }
    });
    assert.equal(res.status, 409);
  });

  it('creates a driver login account linked to the driver profile', async () => {
    const res = await request<Envelope<{ id: string; role: string; driverId: string }>>('/api/users', {
      method: 'POST',
      token: adminToken,
      json: { name: QA.driverName, email: QA.email, password: QA.password, role: 'driver', driverId }
    });
    assert.equal(res.status, 201);
    userId = res.json?.data?.id ?? '';
    assert.ok(userId);
    assert.equal(res.json?.data?.driverId, driverId);
  });

  it('the QA driver can log in', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      json: { email: QA.email, password: QA.password }
    });
    assert.equal(res.status, 200);
  });

  it('change-password rejects a wrong current password', async () => {
    const login = await request<Envelope<{ token: string }>>('/api/auth/login', {
      method: 'POST',
      json: { email: QA.email, password: QA.password }
    });
    const token = login.json?.data?.token;
    assert.ok(token);
    const res = await request('/api/auth/change-password', {
      method: 'PUT',
      token,
      json: { currentPassword: 'WrongCurrent1!', newPassword: QA.newPassword }
    });
    assert.equal(res.status, 401);
  });

  it('change-password updates the password', async () => {
    const login = await request<Envelope<{ token: string }>>('/api/auth/login', {
      method: 'POST',
      json: { email: QA.email, password: QA.password }
    });
    const res = await request('/api/auth/change-password', {
      method: 'PUT',
      token: login.json?.data?.token,
      json: { currentPassword: QA.password, newPassword: QA.newPassword }
    });
    assert.equal(res.status, 200);
  });

  it('the old password no longer works', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      json: { email: QA.email, password: QA.password }
    });
    assert.equal(res.status, 401);
  });

  it('the new password works', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      json: { email: QA.email, password: QA.newPassword }
    });
    assert.equal(res.status, 200);
  });

  it('blocks an admin from demoting themselves', async () => {
    const me = await request<Envelope<{ user: { id: string } }>>('/auth/me', { token: adminToken });
    const ownId = me.json?.data?.user.id;
    const res = await request(`/api/users/${ownId}`, {
      method: 'PUT',
      token: adminToken,
      json: { role: 'accountant' }
    });
    assert.equal(res.status, 400);
  });

  it('admin creates a fuel entry for the QA driver', async () => {
    const res = await request<Envelope<{ id: string; driverId: string }>>('/api/fuel', {
      method: 'POST',
      token: adminToken,
      json: {
        driverId,
        vehicleId,
        date: todayISO(),
        time: '11:45',
        petrolPumpName: 'QA Lifecycle Pump',
        fuelType: 'Diesel',
        liters: 15,
        pricePerLiter: 280,
        totalAmount: 4200,
        receiptNumber: `QA-${SUFFIX}-001`
      }
    });
    assert.equal(res.status, 201);
    entryId = res.json?.data?.id ?? '';
    assert.equal(res.json?.data?.driverId, driverId);
  });

  it('admin edits the entry', async () => {
    const res = await request<Envelope<{ receiptNumber: string }>>(`/api/fuel/${entryId}`, {
      method: 'PUT',
      token: adminToken,
      json: { receiptNumber: `QA-${SUFFIX}-001-EDIT` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.json?.data?.receiptNumber, `QA-${SUFFIX}-001-EDIT`);
  });

  it('deleting a driver with fuel entries is blocked', async () => {
    const res = await request(`/api/drivers/${driverId}`, { method: 'DELETE', token: adminToken });
    assert.equal(res.status, 409);
  });

  it('admin deletes the entry and it disappears', async () => {
    const res = await request(`/api/fuel/${entryId}`, { method: 'DELETE', token: adminToken });
    assert.equal(res.status, 200);
    const gone = await request(`/api/fuel/${entryId}`, { token: adminToken });
    assert.equal(gone.status, 404);
  });

  it('deactivating the QA user blocks login', async () => {
    const res = await request(`/api/users/${userId}`, {
      method: 'PUT',
      token: adminToken,
      json: { isActive: false }
    });
    assert.equal(res.status, 200);
    const login = await request('/api/auth/login', {
      method: 'POST',
      json: { email: QA.email, password: QA.newPassword }
    });
    assert.equal(login.status, 403);
  });

  it('deletes the QA driver and vehicle (cleanup)', async () => {
    const driverRes = await request(`/api/drivers/${driverId}`, { method: 'DELETE', token: adminToken });
    assert.equal(driverRes.status, 200);

    const vehicle = await request<Envelope<{ assignedDriver: unknown }>>(
      `/api/vehicles/${vehicleId}`,
      { token: adminToken }
    );
    assert.equal(vehicle.json?.data?.assignedDriver, null, 'vehicle must be unassigned after driver deletion');

    const vehicleRes = await request(`/api/vehicles/${vehicleId}`, {
      method: 'DELETE',
      token: adminToken
    });
    assert.equal(vehicleRes.status, 200);
  });

  it('deletes the QA user; the login no longer exists (cleanup)', async () => {
    const res = await request(`/api/users/${userId}`, { method: 'DELETE', token: adminToken });
    assert.equal(res.status, 200);
    const login = await request('/api/auth/login', {
      method: 'POST',
      json: { email: QA.email, password: QA.newPassword }
    });
    assert.equal(login.status, 401);
  });
});