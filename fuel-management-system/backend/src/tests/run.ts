import { runAll } from './harness';
import { BASE_URL, Envelope, loginAs, request } from './http';

// Import order = execution order.
import './suites/auth.suite';
import './suites/roles.suite';
import './suites/fuel.suite';
import './suites/dashboard.suite';
import './suites/reports.suite';
import './suites/upload-ocr.suite';
import './suites/fleet-crud.suite';

async function main(): Promise<void> {
  console.log(`\nTarget API: ${BASE_URL}\n`);

  const health = await request<Envelope<{ database: string }>>('/api/health', {
    timeoutMs: 5000
  }).catch(() => null);

  if (!health || health.status !== 200) {
    console.error('✗ The backend is not reachable at the target URL.');
    console.error('  Start it first:   cd backend && npm run dev');
    console.error('  Custom target:    TEST_BASE_URL=http://192.168.1.10:5000 npm test');
    process.exit(1);
  }
  if (health.json?.data?.database !== 'connected') {
    console.error('✗ MongoDB is not connected — check MONGODB_URI and that the database is running.');
    process.exit(1);
  }

  try {
    await loginAs('admin');
  } catch {
    console.error('✗ Could not log in as the seeded admin.');
    console.error('  Seed demo data first:   cd backend && npm run seed');
    process.exit(1);
  }

  const passed = await runAll();
  process.exit(passed ? 0 : 1);
}

main();