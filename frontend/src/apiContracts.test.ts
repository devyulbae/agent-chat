import { describe, expect, it } from 'vitest'
import {
  AUDIT_EVENTS_LIMIT_MAX,
  CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX,
  buildCredentialAuditEventsQueryParams,
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

  it('builds audit-events query params with bounded limit/offset and trimmed optional filters', () => {
    const params = buildCredentialAuditEventsQueryParams({
      credentialId: 'cred-123',
      action: 'updated',
      eventType: '  credential.updated  ',
      provider: 'openai_api',
      label: 'primary',
      limit: AUDIT_EVENTS_LIMIT_MAX + 7,
      offset: -5,
    })

    expect(params.get('entity_type')).toBe('credential')
    expect(params.get('entity_id')).toBe('cred-123')
    expect(params.get('action')).toBe('updated')
    expect(params.get('event_type')).toBe('credential.updated')
    expect(params.get('provider')).toBe('openai_api')
    expect(params.get('label')).toBe('primary')
    expect(params.get('limit')).toBe(String(AUDIT_EVENTS_LIMIT_MAX))
    expect(params.get('offset')).toBe('0')
  })

  it('omits optional audit-events filters when all/blank values are passed', () => {
    const params = buildCredentialAuditEventsQueryParams({
      credentialId: null,
      action: 'all',
      eventType: '   ',
      provider: 'all',
      label: 'all',
      limit: 20,
      offset: 12.9,
    })

    expect(params.get('entity_type')).toBe('credential')
    expect(params.get('limit')).toBe('20')
    expect(params.get('offset')).toBe('12')
    expect(params.has('entity_id')).toBe(false)
    expect(params.has('action')).toBe(false)
    expect(params.has('event_type')).toBe(false)
    expect(params.has('provider')).toBe(false)
    expect(params.has('label')).toBe(false)
  })
})
