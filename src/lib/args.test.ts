import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.js';
import { requireId } from './args.js';

describe('requireId', () => {
  it('returns silently for a non-empty id', () => {
    expect(() => requireId('test-id', 't_abc123')).not.toThrow();
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['tab/newline', '\t\n'],
  ])('throws VALIDATION_ERROR (exit 5) for a %s id', (_label, value) => {
    let caught: unknown;
    try {
      requireId('project-id', value);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({
      code: 'VALIDATION_ERROR',
      exitCode: 5,
      details: { field: 'project-id', reason: 'missing_required_flag' },
    });
  });

  it('names the positional id in the message, not a --flag', () => {
    let caught: ApiError | undefined;
    try {
      requireId('schedule-id', '');
    } catch (err) {
      caught = err as ApiError;
    }
    expect(caught?.nextAction).toBe('<schedule-id> is required');
    expect(caught?.nextAction).not.toContain('--');
  });
});
