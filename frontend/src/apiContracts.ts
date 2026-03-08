export const CREDENTIAL_EXPIRING_WINDOW_HOURS_MIN = 1
export const CREDENTIAL_EXPIRING_WINDOW_HOURS_MAX = 24 * 30

export const AUDIT_EVENTS_LIMIT_MIN = 1
export const AUDIT_EVENTS_LIMIT_MAX = 100

export const CHANNEL_MESSAGES_LIMIT_MIN = 1
export const CHANNEL_MESSAGES_LIMIT_MAX = 500

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

export function clampChannelMessagesLimit(value: number, fallback = 200): number {
  const fallbackLimit = Math.min(
    CHANNEL_MESSAGES_LIMIT_MAX,
    Math.max(CHANNEL_MESSAGES_LIMIT_MIN, Math.trunc(fallback)),
  )

  if (!Number.isFinite(value)) {
    return fallbackLimit
  }

  return Math.min(
    CHANNEL_MESSAGES_LIMIT_MAX,
    Math.max(CHANNEL_MESSAGES_LIMIT_MIN, Math.trunc(value)),
  )
}

export type ChannelMessagesQueryParamsInput = {
  threadId: string | null
  limit: number
}

export function buildChannelMessagesQueryParams(input: ChannelMessagesQueryParamsInput): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(clampChannelMessagesLimit(input.limit)),
  })

  const trimmedThreadId = input.threadId?.trim()
  if (trimmedThreadId) {
    params.set('thread_id', trimmedThreadId)
  }

  return params
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

  const trimmedCredentialId = input.credentialId?.trim()
  if (trimmedCredentialId) {
    params.set('entity_id', trimmedCredentialId)
  }

  const normalizedAction = normalizeOptionalAuditFilter(input.action)
  if (normalizedAction) {
    params.set('action', normalizedAction)
  }

  const normalizedEventType = normalizeOptionalAuditFilter(input.eventType)
  if (normalizedEventType) {
    params.set('event_type', normalizedEventType)
  }

  const normalizedProvider = normalizeOptionalAuditFilter(input.provider)
  if (normalizedProvider) {
    params.set('provider', normalizedProvider)
  }

  const normalizedLabel = normalizeOptionalAuditFilter(input.label)
  if (normalizedLabel) {
    params.set('label', normalizedLabel)
  }

  return params
}

function normalizeOptionalAuditFilter(value: string, allKeyword = 'all'): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === allKeyword) {
    return null
  }

  return trimmed
}
