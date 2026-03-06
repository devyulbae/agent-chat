export const CREDENTIAL_EXPIRING_WINDOW_HOURS_MIN = 1
export const CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX = 24 * 30

export const AUDIT_EVENTS_LIMIT_MIN = 1
export const AUDIT_EVENTS_LIMIT_MAX = 100

export function clampCredentialExpiringWindowHours(value: number): number {
  if (!Number.isFinite(value)) {
    return 24
  }

  return Math.min(
    CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX,
    Math.max(CREDENTIAL_EXPIRING_WINDOW_HOURS_MIN, Math.trunc(value)),
  )
}

export function clampAuditEventLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return AUDIT_EVENTS_LIMIT_MAX
  }

  return Math.min(AUDIT_EVENTS_LIMIT_MAX, Math.max(AUDIT_EVENTS_LIMIT_MIN, Math.trunc(value)))
}

export function normalizeAuditOffset(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.trunc(value))
}
