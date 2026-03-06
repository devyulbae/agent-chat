import { describe, expect, it } from 'vitest'
import {
  AUDIT_EVENTS_LIMIT_MAX,
  CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX,
  clampAuditEventLimit,
  clampCredentialExpiringWindowHours,
  normalizeAuditOffset,
} from './apiContracts'

describe('apiContracts helpers', () => {
  it('clamps credential expiring window to API bounds', () => {
    expect(clampCredentialExpiringWindowHours(Number.NaN)).toBe(24)
    expect(clampCredentialExpiringWindowHours(0)).toBe(1)
    expect(clampCredentialExpiringWindowHours(CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX + 5)).toBe(
      CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX,
    )
  })

  it('clamps audit event page limit to API bounds', () => {
    expect(clampAuditEventLimit(Number.NaN)).toBe(AUDIT_EVENTS_LIMIT_MAX)
    expect(clampAuditEventLimit(0)).toBe(1)
    expect(clampAuditEventLimit(AUDIT_EVENTS_LIMIT_MAX + 1)).toBe(AUDIT_EVENTS_LIMIT_MAX)
  })

  it('normalizes audit offset to non-negative integer', () => {
    expect(normalizeAuditOffset(Number.NaN)).toBe(0)
    expect(normalizeAuditOffset(-50)).toBe(0)
    expect(normalizeAuditOffset(12.8)).toBe(12)
  })
})
