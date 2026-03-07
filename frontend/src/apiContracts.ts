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

export type CredentialAuditEventsQueryParamsInput = {
  credentialId: string | null
  action: string
  eventType: string
  provider: string
  label: string
  limit: number
  offset: number
}

export function buildCredentialAuditEventsQueryParams(
  input: CredentialAuditEventsQueryParamsInput,
): URLSearchParams {
  const boundedLimit = clampAuditEventLimit(input.limit)
  const boundedOffset = normalizeAuditOffset(input.offset)

  const params = new URLSearchParams({
    entity_type: 'credential',
    limit: String(boundedLimit),
    offset: String(boundedOffset),
  })

  if (input.credentialId) {
    params.set('entity_id', input.credentialId)
  }
  if (input.action !== 'all') {
    params.set('action', input.action)
  }

  const trimmedEventType = input.eventType.trim()
  if (trimmedEventType) {
    params.set('event_type', trimmedEventType)
  }

  if (input.provider !== 'all') {
    params.set('provider', input.provider)
  }
  if (input.label !== 'all') {
    params.set('label', input.label)
  }

  return params
}
