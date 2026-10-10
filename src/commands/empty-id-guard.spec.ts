import { describe, expect, it, vi } from 'vitest';
import { runGet as projectGet } from './project.js';
import {
  runDelete as scheduleDelete,
  runGet as scheduleGet,
  runRunList as scheduleRunList,
  runUpdate as scheduleUpdate,
} from './schedule.js';
import {
  runCodeGet,
  runFailureGet,
  runFailureSummary,
  runGet as testGet,
  runResult,
  runResultHistory,
  runSteps,
  runTestCancel,
  runTestRerun,
  runTestRun,
} from './test.js';

/**
 * Regression coverage for the missing positional-id guard: an unset shell
 * variable (`testsprite test get "$ID"` → `""`) is a *present* argument to
 * Commander, so before the fix these commands interpolated an empty path
 * segment into the URL (leaking an internal dry-run error, exit 1). They must
 * now fail fast with a local VALIDATION_ERROR (exit 5) and never hit the
 * network.
 */

const common = () => ({ profile: 'default', output: 'json' as const, debug: false });

const spy = vi.fn();
const deps = {
  fetchImpl: spy as unknown as typeof globalThis.fetch,
  stdout: () => undefined,
  stderr: () => undefined,
};

const cases: Array<[string, string, (id: string) => Promise<unknown>]> = [
  ['project get', 'project-id', id => projectGet({ ...common(), projectId: id }, deps)],
  ['test get', 'test-id', id => testGet({ ...common(), testId: id }, deps)],
  ['test code get', 'test-id', id => runCodeGet({ ...common(), testId: id }, deps)],
  ['test steps', 'test-id', id => runSteps({ ...common(), testId: id }, deps)],
  ['test result', 'test-id', id => runResult({ ...common(), testId: id }, deps)],
  ['test result --history', 'test-id', id => runResultHistory({ ...common(), testId: id }, deps)],
  ['test failure summary', 'test-id', id => runFailureSummary({ ...common(), testId: id }, deps)],
  [
    'test failure get',
    'test-id',
    id => runFailureGet({ ...common(), testId: id, failedOnly: false }, deps),
  ],
  ['test run', 'test-id', id => runTestRun({ ...common(), testId: id }, deps)],
  ['test rerun', 'test-id', id => runTestRerun({ ...common(), testIds: [id] }, deps)],
  ['test cancel', 'run-id', id => runTestCancel({ ...common(), runIds: [id] }, deps)],
  ['schedule get', 'schedule-id', id => scheduleGet({ ...common(), scheduleId: id }, deps)],
  ['schedule update', 'schedule-id', id => scheduleUpdate({ ...common(), scheduleId: id }, deps)],
  ['schedule delete', 'schedule-id', id => scheduleDelete({ ...common(), scheduleId: id }, deps)],
  ['schedule run list', 'schedule-id', id => scheduleRunList({ ...common(), scheduleId: id }, deps)],
];

describe('empty positional id → VALIDATION_ERROR (exit 5), no network', () => {
  it.each(cases)('%s rejects an empty and whitespace id', async (_name, field, call) => {
    await expect(call('')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      exitCode: 5,
      details: { field },
    });
    await expect(call('   ')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      exitCode: 5,
      details: { field },
    });
  });

  it('never issues a request for the empty-id cases', () => {
    expect(spy).not.toHaveBeenCalled();
  });

  it('a valid id passes the guard (rejection is not the guard error)', async () => {
    const err = (await projectGet({ ...common(), projectId: 'p_valid' }, deps).catch(e => e)) as {
      details?: { field?: string };
    };
    expect(err?.details?.field).not.toBe('project-id');
  });
});
