import { describe, expect, it } from 'vitest'

import { buildCredentialAuditEventsRequestUrl } from './main'

describe('credential audit request URL integration', () => {
  it('keeps request URL stable when optional filters are all/blank', () => {
    const url = buildCredentialAuditEventsRequestUrl({
      credentialId: null,
      action: 'all',
      eventType: '   ',
      provider: 'all',
      label: 'all',
      limit: 20,
      offset: 0,
    })

    expect(url).toBe('/api/v1/audit-events?entity_type=credential&limit=20&offset=0')
  })

  it('trims event_type and preserves bounded contract params in request URL', () => {
    const url = buildCredentialAuditEventsRequestUrl({
      credentialId: 'cred-123',
      action: 'updated',
      eventType: '  credential.updated  ',
      provider: 'openai_api',
      label: 'primary',
      limit: 999,
      offset: -5,
    })

    expect(url).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=100&offset=0&entity_id=cred-123&action=updated&event_type=credential.updated&provider=openai_api&label=primary',
    )
  })

  it('keeps trimmed filter params stable when paging offset advances to older events', () => {
    const baseRequest = {
      credentialId: 'cred-123',
      action: 'updated',
      eventType: '  credential.updated  ',
      provider: 'openai_api',
      label: 'primary',
      limit: 20,
    }

    const refreshUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 0,
    })
    const olderPageUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 20,
    })

    expect(refreshUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=0&entity_id=cred-123&action=updated&event_type=credential.updated&provider=openai_api&label=primary',
    )
    expect(olderPageUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=20&entity_id=cred-123&action=updated&event_type=credential.updated&provider=openai_api&label=primary',
    )
  })

  it('keeps optional all/blank filters omitted when paging offset advances', () => {
    const baseRequest = {
      credentialId: null,
      action: ' all ',
      eventType: '   ',
      provider: ' all ',
      label: '  all  ',
      limit: 20,
    }

    const refreshUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 0,
    })
    const olderPageUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 20,
    })

    expect(refreshUrl).toBe('/api/v1/audit-events?entity_type=credential&limit=20&offset=0')
    expect(olderPageUrl).toBe('/api/v1/audit-events?entity_type=credential&limit=20&offset=20')
  })

  it('keeps scoped credential id while omitting whitespace event_type across paging offsets', () => {
    const baseRequest = {
      credentialId: 'cred-123',
      action: 'all',
      eventType: '   ',
      provider: 'all',
      label: 'all',
      limit: 20,
    }

    const refreshUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 0,
    })
    const olderPageUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 20,
    })

    expect(refreshUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=0&entity_id=cred-123',
    )
    expect(olderPageUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=20&entity_id=cred-123',
    )
  })

  it('keeps scoped credential and trimmed event_type while omitting all optional filters across paging offsets', () => {
    const baseRequest = {
      credentialId: 'cred-123',
      action: ' all ',
      eventType: '  credential.updated  ',
      provider: ' all ',
      label: ' all ',
      limit: 20,
    }

    const refreshUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 0,
    })
    const olderPageUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 20,
    })

    expect(refreshUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=0&entity_id=cred-123&event_type=credential.updated',
    )
    expect(olderPageUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=20&entity_id=cred-123&event_type=credential.updated',
    )
  })

  it('keeps trimmed event_type with scoped provider while omitting all label across paging offsets', () => {
    const baseRequest = {
      credentialId: 'cred-123',
      action: ' all ',
      eventType: '  credential.updated  ',
      provider: ' openai_api ',
      label: ' all ',
      limit: 20,
    }

    const refreshUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 0,
    })
    const olderPageUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 20,
    })

    expect(refreshUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=0&entity_id=cred-123&event_type=credential.updated&provider=openai_api',
    )
    expect(olderPageUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=20&entity_id=cred-123&event_type=credential.updated&provider=openai_api',
    )
  })

  it('keeps trimmed event_type with scoped action while omitting all provider/label across paging offsets', () => {
    const baseRequest = {
      credentialId: 'cred-123',
      action: ' updated ',
      eventType: '  credential.updated  ',
      provider: ' all ',
      label: ' all ',
      limit: 20,
    }

    const refreshUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 0,
    })
    const olderPageUrl = buildCredentialAuditEventsRequestUrl({
      ...baseRequest,
      offset: 20,
    })

    expect(refreshUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=0&entity_id=cred-123&action=updated&event_type=credential.updated',
    )
    expect(olderPageUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=20&entity_id=cred-123&action=updated&event_type=credential.updated',
    )
  })
})
