import { describe, expect, it } from 'vitest'

import { buildCredentialAuditEventsRequestUrl } from './main'

describe('credential audit request URL contract (main integration)', () => {
  it('keeps /audit-events URL params stable across all/trimmed filter transitions', () => {
    const allFiltersUrl = buildCredentialAuditEventsRequestUrl({
      credentialId: null,
      action: 'all',
      eventType: '   ',
      provider: 'all',
      label: 'all',
      limit: 20,
      offset: 0,
    })

    expect(allFiltersUrl).toBe('/api/v1/audit-events?entity_type=credential&limit=20&offset=0')

    const trimmedEventTypeUrl = buildCredentialAuditEventsRequestUrl({
      credentialId: null,
      action: 'all',
      eventType: '   credential.updated   ',
      provider: 'all',
      label: 'all',
      limit: 20,
      offset: 0,
    })

    expect(trimmedEventTypeUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=0&event_type=credential.updated',
    )

    const scopedFiltersUrl = buildCredentialAuditEventsRequestUrl({
      credentialId: 'cred-123',
      action: 'updated',
      eventType: '   ',
      provider: 'openai_api',
      label: 'primary',
      limit: 20,
      offset: 0,
    })

    expect(scopedFiltersUrl).toBe(
      '/api/v1/audit-events?entity_type=credential&limit=20&offset=0&entity_id=cred-123&action=updated&provider=openai_api&label=primary',
    )
  })
})
