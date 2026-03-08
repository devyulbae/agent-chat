import { describe, expect, it } from 'vitest'
import {
  AUDIT_EVENTS_LIMIT_MAX,
  CHANNEL_MESSAGES_LIMIT_MAX,
  CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX,
  buildChannelMessagesQueryParams,
  buildCredentialAuditEventsQueryParams,
  buildCredentialsQueryParams,
  clampAuditEventLimit,
  clampChannelMessagesLimit,
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

  it('clamps channel messages limit to API bounds', () => {
    expect(clampChannelMessagesLimit(Number.NaN)).toBe(200)
    expect(clampChannelMessagesLimit(0)).toBe(1)
    expect(clampChannelMessagesLimit(CHANNEL_MESSAGES_LIMIT_MAX + 5)).toBe(CHANNEL_MESSAGES_LIMIT_MAX)
    expect(clampChannelMessagesLimit(Number.NaN, 999)).toBe(CHANNEL_MESSAGES_LIMIT_MAX)
  })

  it('builds credentials params with bounded expiring window and optional token status', () => {
    const params = buildCredentialsQueryParams({
      tokenStatus: '  ALL ',
      expiringWithinHours: CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX + 100,
    })
    const filteredParams = buildCredentialsQueryParams({
      tokenStatus: ' expiring_soon ',
      expiringWithinHours: Number.NaN,
    })

    expect(params.get('expiring_within_hours')).toBe(String(CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX))
    expect(params.has('token_status')).toBe(false)

    expect(filteredParams.get('expiring_within_hours')).toBe('24')
    expect(filteredParams.get('token_status')).toBe('expiring_soon')
  })

  it('builds channel messages params with bounded limit and optional trimmed thread id', () => {
    const withThread = buildChannelMessagesQueryParams({
      threadId: '  thread-1  ',
      limit: 999,
    })
    const withoutThread = buildChannelMessagesQueryParams({
      threadId: '   ',
      limit: -5,
    })

    expect(withThread.get('thread_id')).toBe('thread-1')
    expect(withThread.get('limit')).toBe(String(CHANNEL_MESSAGES_LIMIT_MAX))

    expect(withoutThread.has('thread_id')).toBe(false)
    expect(withoutThread.get('limit')).toBe('1')
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


  it('normalizes optional audit filters by trimming and omitting all/blank values', () => {
    const params = buildCredentialAuditEventsQueryParams({
      credentialId: '  cred-123  ',
      action: '  ALL  ',
      eventType: '  credential.deleted  ',
      provider: '  openai_api  ',
      label: '  all  ',
      limit: 20,
      offset: 0,
    })

    expect(params.get('entity_id')).toBe('cred-123')
    expect(params.has('action')).toBe(false)
    expect(params.get('event_type')).toBe('credential.deleted')
    expect(params.get('provider')).toBe('openai_api')
    expect(params.has('label')).toBe(false)
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
