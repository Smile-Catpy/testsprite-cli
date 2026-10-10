import { ApiError } from './errors.js';

/**
 * Throw a local `VALIDATION_ERROR` (exit 5) when a required positional id
 * (`<project-id>`, `<test-id>`, `<schedule-id>`, `<run-id>`) is missing,
 * empty, or whitespace-only.
 *
 * Why this exists: Commander treats an empty string as a *present* argument,
 * so `testsprite project get "$PROJECT_ID"` with an unset shell variable
 * (`$PROJECT_ID` → `""`) satisfies the required-positional check. Without this
 * guard the command interpolates an empty path segment into the request URL
 * (`…/projects/`, `…/tests//code`) and issues a malformed request: under
 * `--dry-run` it surfaced as an internal "No dry-run sample registered…"
 * error (exit 1) instead of a user-actionable message, and against the live
 * API it sent a bogus round-trip. Every id-taking command routes through here
 * so a missing id fails fast with one consistent envelope.
 *
 * Wording is the positional form (`<project-id> is required`) — an id is not a
 * `--flag`, so the "Flag `--…`" phrasing the flag validators use would be
 * wrong here.
 */
export function requireId(field: string, value: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ApiError.fromEnvelope({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request.',
        nextAction: `<${field}> is required`,
        requestId: 'local',
        details: { field, reason: 'missing_required_flag' },
      },
    });
  }
}
