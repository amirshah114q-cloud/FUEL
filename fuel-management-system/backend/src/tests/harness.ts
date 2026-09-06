/* Minimal sequential test harness — zero external dependencies.
   Suites register via describe()/it() at import time; run.ts executes them. */

type TestFn = () => Promise<void> | void;

interface TestCase {
  name: string;
  fn: TestFn;
}
interface Suite {
  name: string;
  tests: TestCase[];
}

const suites: Suite[] = [];
let current: Suite | null = null;

export function describe(name: string, setup: () => void): void {
  const suite: Suite = { name, tests: [] };
  suites.push(suite);
  current = suite;
  setup();
  current = null;
}

export function it(name: string, fn: TestFn): void {
  if (!current) throw new Error(`it("${name}") must be called inside describe()`);
  current.tests.push({ name, fn });
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runAll(): Promise<boolean> {
  let passed = 0;
  let failed = 0;

  console.log('──────────────────────────────────────────────────────');
  console.log('  FUEL MANAGEMENT API — TEST RUN');
  console.log('──────────────────────────────────────────────────────');

  for (const suite of suites) {
    console.log(`\n${suite.name}`);
    for (const test of suite.tests) {
      const started = Date.now();
      try {
        await test.fn();
        passed += 1;
        console.log(`  ✓ ${test.name}  (${Date.now() - started}ms)`);
      } catch (error) {
        failed += 1;
        console.log(`  ✗ ${test.name}  (${Date.now() - started}ms)`);
        console.log(`      ${formatError(error)}`);
      }
    }
  }

  console.log('\n──────────────────────────────────────────────────────');
  console.log(`  RESULT: ${passed} passed, ${failed} failed`);
  console.log('──────────────────────────────────────────────────────');
  return failed === 0;
}