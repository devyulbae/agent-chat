import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

type OrgType = 'freeform' | 'department' | 'squad'
type TokenStatusFilter = 'all' | 'active' | 'expired' | 'expiring_soon'

type Organization = {
  id: string
  name: string
  org_type: OrgType
  parent_id: string | null
}

type OrganizationsGraph = {
  items: Organization[]
  by_type: Record<string, Organization[]>
}

type ThreadSummary = {
  thread_id: string | null
  message_count: number
  latest_message_at: string | null
}

type Message = {
  id: string
  channel_id: string
  sender_agent_id: string
  thread_id: string | null
  body: string
  created_at: string
}

type Credential = {
  id: string
  owner_agent_id: string
  provider: string
  label: string
  key_version: string
  last_rotated_at: string
  token_expires_at: string | null
}

type AuditEvent = {
  event_type: string
  entity_type: string
  entity_id: string
  occurred_at: string
  metadata: Record<string, unknown>
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const ROOT_THREAD_KEY = '__root__'

function buildWebSocketChannelUrl(channelId: string): string {
  const encodedChannelId = encodeURIComponent(channelId)
  const normalizedApiBase = API_BASE.replace(/\/+$/, '')
  const wsPath = `${normalizedApiBase}/ws/channels/${encodedChannelId}`

  if (/^https?:\/\//i.test(normalizedApiBase)) {
    const httpUrl = new URL(wsPath)
    httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    return httpUrl.toString()
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const normalizedPath = wsPath.startsWith('/') ? wsPath : `/${wsPath}`
  return `${wsProtocol}//${window.location.host}${normalizedPath}`
}

function toThreadKey(threadId: string | null): string {
  return threadId ?? ROOT_THREAD_KEY
}

function threadStateStorageKey(channelId: string): string {
  return `agent-chat:last-seen:${channelId}`
}

type ThreadSeenStorage = {
  lastSeenByThread: Record<string, string>
  lastSeenCountByThread: Record<string, number>
}

type UnreadClearUndoSnapshot = {
  lastSeenByThread: Record<string, string>
  lastSeenCountByThread: Record<string, number>
  unseenThreadKeys: string[]
  clearedCount: number
}

function getCredentialStatus(credential: Credential): 'active' | 'expired' | 'expiring_soon' {
  if (!credential.token_expires_at) {
    return 'active'
  }

  const now = new Date()
  const expiresAt = new Date(credential.token_expires_at)
  if (expiresAt <= now) {
    return 'expired'
  }

  const dayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (expiresAt <= dayFromNow) {
    return 'expiring_soon'
  }

  return 'active'
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function toStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function renderAuditMetadata(event: AuditEvent): string[] {
  const metadata = event.metadata ?? {}
  if (event.event_type === 'credential.updated') {
    const changedFields = toStringList(metadata.changed_fields)
    return changedFields.map((field) => `changed:${field}`)
  }

  if (event.event_type === 'credential.rotated') {
    const previousVersion = toStringValue(metadata.previous_key_version)
    const newVersion = toStringValue(metadata.new_key_version)
    if (previousVersion && newVersion) {
      return [`key:${previousVersion}→${newVersion}`]
    }
  }

  return []
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleString()
}

function formatNoticeAge(timestampMs: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))
  if (elapsedSeconds < 60) {
    return 'just now'
  }
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  return `${elapsedHours}h ago`
}

function formatEpochTimestamp(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString()
}

function toDatetimeLocalValue(value: string | null): string {
  if (!value) {
    return ''
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  const tzOffsetMs = parsed.getTimezoneOffset() * 60 * 1000
  return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

function toIsoFromDatetimeLocal(value: string): string | null {
  if (!value.trim()) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tagName = target.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }
  return target.isContentEditable
}

function App() {
  const [graph, setGraph] = useState<OrganizationsGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [channelId, setChannelId] = useState('chan-1')
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [lastSeenByThread, setLastSeenByThread] = useState<Record<string, string>>({})
  const [lastSeenCountByThread, setLastSeenCountByThread] = useState<Record<string, number>>({})
  const [unseenThreadKeys, setUnseenThreadKeys] = useState<string[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [composerSenderId, setComposerSenderId] = useState('agent-ui')
  const [composerBody, setComposerBody] = useState('')
  const [composerSubmitting, setComposerSubmitting] = useState(false)
  const [threadFilterText, setThreadFilterText] = useState('')
  const [showUnreadOnlyThreads, setShowUnreadOnlyThreads] = useState(false)
  const [includeRootInUnreadOnly, setIncludeRootInUnreadOnly] = useState(true)
  const [threadFilterJumpHint, setThreadFilterJumpHint] = useState<string | null>(null)
  const [threadCopyHint, setThreadCopyHint] = useState<string | null>(null)
  const [unreadClearUndoSnapshot, setUnreadClearUndoSnapshot] =
    useState<UnreadClearUndoSnapshot | null>(null)

  const [credentials, setCredentials] = useState<Credential[]>([])
  const [credentialFilter, setCredentialFilter] = useState<TokenStatusFilter>('all')
  const [expiringWithinHours, setExpiringWithinHours] = useState(24)
  const [credentialLoading, setCredentialLoading] = useState(false)
  const [credentialError, setCredentialError] = useState<string | null>(null)
  const [credentialProviders, setCredentialProviders] = useState<string[]>([])
  const [providerLoading, setProviderLoading] = useState(false)
  const [providerError, setProviderError] = useState<string | null>(null)
  const [credentialFormError, setCredentialFormError] = useState<string | null>(null)
  const [credentialFormNotice, setCredentialFormNotice] = useState<string | null>(null)
  const [credentialFormNoticeAt, setCredentialFormNoticeAt] = useState<number | null>(null)
  const [credentialFormNoticeTick, setCredentialFormNoticeTick] = useState(0)
  const [credentialFormNoticePinned, setCredentialFormNoticePinned] = useState(false)
  const [credentialFormNoticeHovering, setCredentialFormNoticeHovering] = useState(false)
  const [credentialFormSubmitting, setCredentialFormSubmitting] = useState(false)
  const [credentialDeleteSubmitting, setCredentialDeleteSubmitting] = useState(false)
  const [newCredentialOwnerAgentId, setNewCredentialOwnerAgentId] = useState('agent-ui')
  const [newCredentialProvider, setNewCredentialProvider] = useState('')
  const [newCredentialLabel, setNewCredentialLabel] = useState('')
  const [newCredentialSecret, setNewCredentialSecret] = useState('')
  const [newCredentialExpiresAt, setNewCredentialExpiresAt] = useState('')
  const [editCredentialLabel, setEditCredentialLabel] = useState('')
  const [editCredentialSecret, setEditCredentialSecret] = useState('')
  const [editCredentialExpiresAt, setEditCredentialExpiresAt] = useState('')
  const [editCredentialClearExpiry, setEditCredentialClearExpiry] = useState(false)
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('')
  const [auditProviderFilter, setAuditProviderFilter] = useState<string>('all')
  const [auditLabelFilter, setAuditLabelFilter] = useState<string>('all')
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all')
  const [auditEventTypeFilter, setAuditEventTypeFilter] = useState<string>('')
  const [auditLimit, setAuditLimit] = useState<number>(20)
  const [auditOffset, setAuditOffset] = useState<number>(0)
  const [credentialAuditEvents, setCredentialAuditEvents] = useState<AuditEvent[]>([])
  const [credentialAuditHasMore, setCredentialAuditHasMore] = useState(false)
  const [credentialAuditLoading, setCredentialAuditLoading] = useState(false)
  const [credentialAuditPaging, setCredentialAuditPaging] = useState(false)
  const [credentialAuditError, setCredentialAuditError] = useState<string | null>(null)
  const [credentialAuditPagingAnnouncement, setCredentialAuditPagingAnnouncement] = useState<
    string | null
  >(null)
  const [credentialAuditPagingAnnouncementAt, setCredentialAuditPagingAnnouncementAt] =
    useState<number | null>(null)
  const [credentialAuditOlderPageFailureAt, setCredentialAuditOlderPageFailureAt] =
    useState<number | null>(null)
  const [credentialAuditPagingAnnouncementTick, setCredentialAuditPagingAnnouncementTick] = useState(0)
  const [credentialAuditPagingCopyHint, setCredentialAuditPagingCopyHint] = useState<string | null>(null)

  const messageListEndRef = useRef<HTMLDivElement | null>(null)
  const composerBodyRef = useRef<HTMLTextAreaElement | null>(null)
  const threadFilterInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadGraph() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE}/organizations/graph`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Failed to load graph (${response.status})`)
        }
        const payload = (await response.json()) as OrganizationsGraph
        setGraph(payload)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void loadGraph()
    return () => controller.abort()
  }, [])

  const markThreadSeen = useCallback((threadId: string | null, marker: string, messageCount?: number) => {
    const key = toThreadKey(threadId)
    setLastSeenByThread((current) => ({ ...current, [key]: marker }))
    if (typeof messageCount === 'number') {
      setLastSeenCountByThread((current) => ({ ...current, [key]: messageCount }))
    }
    setUnseenThreadKeys((current) => current.filter((item) => item !== key))
  }, [])

  const markThreadUnseen = useCallback((threadId: string | null) => {
    const key = toThreadKey(threadId)
    setUnseenThreadKeys((current) => (current.includes(key) ? current : [...current, key]))
  }, [])

  const loadThreads = useCallback(
    async (signal?: AbortSignal) => {
      if (!channelId.trim()) {
        setThreads([])
        return
      }
      setThreadLoading(true)
      setChatError(null)
      try {
        const response = await fetch(
          `${API_BASE}/channels/${encodeURIComponent(channelId)}/threads`,
          { signal }
        )
        if (!response.ok) {
          throw new Error(`Failed to load threads (${response.status})`)
        }
        const payload = (await response.json()) as ThreadSummary[]
        setThreads(payload)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setChatError(err instanceof Error ? err.message : 'Unknown error')
        setThreads([])
      } finally {
        setThreadLoading(false)
      }
    },
    [channelId]
  )

  const loadMessages = useCallback(
    async (signal?: AbortSignal) => {
      if (!channelId.trim()) {
        setMessages([])
        return
      }
      setMessageLoading(true)
      setChatError(null)

      const params = new URLSearchParams()
      if (selectedThreadId) {
        params.set('thread_id', selectedThreadId)
      }

      const query = params.toString()
      const url = `${API_BASE}/channels/${encodeURIComponent(channelId)}/messages${query ? `?${query}` : ''}`

      try {
        const response = await fetch(url, { signal })
        if (!response.ok) {
          throw new Error(`Failed to load messages (${response.status})`)
        }
        const payload = (await response.json()) as Message[]
        setMessages(payload)
        const latestMessage = payload[payload.length - 1]
        markThreadSeen(
          selectedThreadId,
          latestMessage ? latestMessage.id : `visited:${Date.now()}`,
          payload.length
        )
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setChatError(err instanceof Error ? err.message : 'Unknown error')
        setMessages([])
      } finally {
        setMessageLoading(false)
      }
    },
    [channelId, markThreadSeen, selectedThreadId]
  )

  const selectThread = useCallback(
    (threadId: string | null) => {
      setSelectedThreadId(threadId)
      markThreadSeen(threadId, `selected:${Date.now()}`)
    },
    [markThreadSeen]
  )

  const submitMessage = useCallback(async () => {
    const trimmedChannelId = channelId.trim()
    const trimmedSenderId = composerSenderId.trim()
    const trimmedBody = composerBody.trim()
    const composerSelectionStart = composerBodyRef.current?.selectionStart ?? 0
    const composerSelectionEnd = composerBodyRef.current?.selectionEnd ?? 0

    if (!trimmedChannelId || !trimmedSenderId || !trimmedBody) {
      setChatError('Channel ID, sender agent ID, and message body are required.')
      return
    }

    setComposerSubmitting(true)
    setChatError(null)

    const messageId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `msg-${Date.now()}`

    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          channel_id: trimmedChannelId,
          sender_agent_id: trimmedSenderId,
          thread_id: selectedThreadId,
          body: trimmedBody,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send message (${response.status})`)
      }

      setComposerBody('')
      await Promise.all([loadThreads(), loadMessages()])
      requestAnimationFrame(() => {
        composerBodyRef.current?.focus()
        composerBodyRef.current?.setSelectionRange(0, 0)
      })
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unknown error')
      requestAnimationFrame(() => {
        composerBodyRef.current?.focus()
        composerBodyRef.current?.setSelectionRange(composerSelectionStart, composerSelectionEnd)
      })
    } finally {
      setComposerSubmitting(false)
    }
  }, [channelId, composerBody, composerSenderId, loadMessages, loadThreads, selectedThreadId])

  const exitThreadContext = useCallback(() => {
    setSelectedThreadId(null)
    requestAnimationFrame(() => {
      composerBodyRef.current?.focus()
    })
  }, [])

  const jumpToRootThreadContext = useCallback(() => {
    selectThread(null)
    requestAnimationFrame(() => {
      composerBodyRef.current?.focus()
    })
  }, [selectThread])

  const copySelectedThreadLabel = useCallback(async () => {
    const threadLabel = selectedThreadId ?? 'root'
    if (!navigator.clipboard?.writeText) {
      setThreadCopyHint('Clipboard API unavailable in this browser context.')
      return
    }

    try {
      await navigator.clipboard.writeText(threadLabel)
      setThreadCopyHint(`Copied thread: ${threadLabel}`)
    } catch {
      setThreadCopyHint('Failed to copy thread label.')
    }
  }, [selectedThreadId])

  const copyCredentialAuditTimestamp = useCallback(async (timestamp: number | null, copyLabel: string) => {
    if (!timestamp || credentialAuditPaging) {
      return
    }
    if (!navigator.clipboard?.writeText) {
      setCredentialAuditPagingCopyHint('Clipboard API unavailable in this browser context.')
      return
    }

    const completionLabel = formatEpochTimestamp(timestamp)
    try {
      await navigator.clipboard.writeText(completionLabel)
      setCredentialAuditPagingCopyHint(`Copied ${copyLabel}: ${completionLabel}`)
    } catch {
      setCredentialAuditPagingCopyHint(`Failed to copy ${copyLabel}.`)
    }
  }, [credentialAuditPaging])

  const handleComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (!composerBody.trim() && selectedThreadId) {
          event.preventDefault()
          exitThreadContext()
        }
        return
      }

      if (event.key !== 'Enter' || event.shiftKey || composerSubmitting) {
        return
      }
      event.preventDefault()
      void submitMessage()
    },
    [composerBody, composerSubmitting, exitThreadContext, selectedThreadId, submitMessage]
  )

  const handleThreadFilterKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        if (!threadFilterText) {
          return
        }
        event.preventDefault()
        setThreadFilterText('')
        setThreadFilterJumpHint(null)
        return
      }

      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        if (!visibleThreadIds.length) {
          setThreadFilterJumpHint(null)
          return
        }
        event.preventDefault()
        const topResult = visibleThreadIds[0]
        selectThread(topResult)
        if (topResult === null && filteredChildThreads.length > 0) {
          setThreadFilterJumpHint('Jumped to Root first (include root is enabled). Press J/K, ↑/↓, or End for child results.')
          return
        }
        setThreadFilterJumpHint(null)
      }
    },
    [filteredChildThreads.length, selectThread, threadFilterText, visibleThreadIds]
  )

  const loadCredentials = useCallback(
    async (signal?: AbortSignal) => {
      setCredentialLoading(true)
      setCredentialError(null)

      const params = new URLSearchParams()
      if (credentialFilter !== 'all') {
        params.set('token_status', credentialFilter)
      }
      params.set('expiring_within_hours', String(expiringWithinHours))

      const query = params.toString()
      const url = `${API_BASE}/credentials${query ? `?${query}` : ''}`

      try {
        const response = await fetch(url, { signal })
        if (!response.ok) {
          throw new Error(`Failed to load credentials (${response.status})`)
        }
        const payload = (await response.json()) as Credential[]
        setCredentials(payload)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setCredentialError(err instanceof Error ? err.message : 'Unknown error')
        setCredentials([])
      } finally {
        setCredentialLoading(false)
      }
    },
    [credentialFilter, expiringWithinHours]
  )

  const loadCredentialProviders = useCallback(
    async (ownerAgentId?: string, signal?: AbortSignal) => {
      setProviderLoading(true)
      setProviderError(null)
      try {
        const params = new URLSearchParams()
        const trimmedOwnerAgentId = ownerAgentId?.trim() ?? ''
        if (trimmedOwnerAgentId) {
          params.set('owner_agent_id', trimmedOwnerAgentId)
        }
        const query = params.toString()
        const url = `${API_BASE}/credentials/providers${query ? `?${query}` : ''}`

        const response = await fetch(url, { signal })
        if (!response.ok) {
          throw new Error(`Failed to load credential providers (${response.status})`)
        }
        const payload = (await response.json()) as string[]
        setCredentialProviders(payload)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setProviderError(err instanceof Error ? err.message : 'Unknown error')
        setCredentialProviders([])
      } finally {
        setProviderLoading(false)
      }
    },
    []
  )

  const loadCredentialAuditEvents = useCallback(
    async (
      credentialId: string | null,
      action: string,
      eventType: string,
      provider: string,
      label: string,
      limit: number,
      offset: number,
      append: boolean,
      signal?: AbortSignal
    ) => {
      setCredentialAuditLoading(true)
      setCredentialAuditPaging(append)
      setCredentialAuditError(null)
      if (append) {
        setCredentialAuditPagingAnnouncement('Loading older audit events…')
        setCredentialAuditPagingAnnouncementAt(null)
        setCredentialAuditOlderPageFailureAt(null)
      } else {
        setCredentialAuditPagingAnnouncement(null)
        setCredentialAuditPagingAnnouncementAt(null)
        setCredentialAuditOlderPageFailureAt(null)
      }

      const params = new URLSearchParams({
        entity_type: 'credential',
        limit: String(limit),
        offset: String(offset),
      })
      if (credentialId) {
        params.set('entity_id', credentialId)
      }
      if (action !== 'all') {
        params.set('action', action)
      }
      const trimmedEventType = eventType.trim()
      if (trimmedEventType) {
        params.set('event_type', trimmedEventType)
      }
      if (provider !== 'all') {
        params.set('provider', provider)
      }
      if (label !== 'all') {
        params.set('label', label)
      }

      try {
        const response = await fetch(`${API_BASE}/audit-events?${params.toString()}`, { signal })
        if (!response.ok) {
          throw new Error(`Failed to load audit trail (${response.status})`)
        }
        const payload = (await response.json()) as AuditEvent[]
        setCredentialAuditHasMore(payload.length === limit)
        if (append) {
          setCredentialAuditPagingAnnouncement(
            payload.length > 0
              ? `Loaded ${payload.length} older audit event${payload.length === 1 ? '' : 's'}.`
              : 'No additional older audit events found.'
          )
          setCredentialAuditPagingAnnouncementAt(Date.now())
        }
        setCredentialAuditEvents((current) => {
          if (!append) {
            return payload
          }
          const merged = [...current, ...payload]
          const seen = new Set<string>()
          return merged.filter((item) => {
            const key = `${item.event_type}-${item.entity_id}-${item.occurred_at}`
            if (seen.has(key)) {
              return false
            }
            seen.add(key)
            return true
          })
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setCredentialAuditError(
          append ? `Failed to load older page. ${errorMessage}` : errorMessage
        )
        if (append) {
          const failureAt = Date.now()
          setCredentialAuditPagingAnnouncement(`Older-page load failed. ${errorMessage}`)
          setCredentialAuditPagingAnnouncementAt(failureAt)
          setCredentialAuditOlderPageFailureAt(failureAt)
        }
        if (!append) {
          setCredentialAuditHasMore(false)
          setCredentialAuditEvents([])
        }
      } finally {
        setCredentialAuditLoading(false)
        setCredentialAuditPaging(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!credentialAuditPagingAnnouncement || credentialAuditPaging) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCredentialAuditPagingAnnouncement(null)
      setCredentialAuditPagingAnnouncementAt(null)
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [credentialAuditPaging, credentialAuditPagingAnnouncement])

  useEffect(() => {
    const raw = window.localStorage.getItem(threadStateStorageKey(channelId))
    setUnreadClearUndoSnapshot(null)
    if (!raw) {
      setLastSeenByThread({})
      setLastSeenCountByThread({})
      setUnseenThreadKeys([])
      return
    }

    try {
      const parsed = JSON.parse(raw) as ThreadSeenStorage | Record<string, string>
      if ('lastSeenByThread' in parsed) {
        setLastSeenByThread(parsed.lastSeenByThread ?? {})
        setLastSeenCountByThread(parsed.lastSeenCountByThread ?? {})
      } else {
        setLastSeenByThread(parsed)
        setLastSeenCountByThread({})
      }
    } catch {
      setLastSeenByThread({})
      setLastSeenCountByThread({})
    }
    setUnseenThreadKeys([])
  }, [channelId])

  useEffect(() => {
    const payload: ThreadSeenStorage = {
      lastSeenByThread,
      lastSeenCountByThread,
    }
    window.localStorage.setItem(threadStateStorageKey(channelId), JSON.stringify(payload))
  }, [channelId, lastSeenByThread, lastSeenCountByThread])

  useEffect(() => {
    setUnseenThreadKeys((current) => {
      const next = new Set<string>()
      threads.forEach((thread) => {
        const key = toThreadKey(thread.thread_id)
        const seenCount = lastSeenCountByThread[key]
        if (typeof seenCount !== 'number') {
          if (current.includes(key)) {
            next.add(key)
          }
          return
        }
        if (selectedThreadId !== thread.thread_id && thread.message_count > seenCount) {
          next.add(key)
        }
      })
      return Array.from(next)
    })
  }, [lastSeenCountByThread, selectedThreadId, threads])

  useEffect(() => {
    const controller = new AbortController()
    void loadThreads(controller.signal)
    setSelectedThreadId(null)
    return () => controller.abort()
  }, [channelId, loadThreads])

  useEffect(() => {
    const controller = new AbortController()
    void loadMessages(controller.signal)
    return () => controller.abort()
  }, [loadMessages])

  useEffect(() => {
    messageListEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  useEffect(() => {
    const controller = new AbortController()
    void loadCredentials(controller.signal)
    return () => controller.abort()
  }, [loadCredentials])

  useEffect(() => {
    const controller = new AbortController()
    void loadCredentialProviders(newCredentialOwnerAgentId, controller.signal)
    return () => controller.abort()
  }, [loadCredentialProviders, newCredentialOwnerAgentId])

  const trimmedOwnerAgentId = newCredentialOwnerAgentId.trim()

  const credentialProvidersWithFallback = useMemo(() => {
    const fromCredentials = credentials.map((item) => item.provider)
    return Array.from(new Set([...credentialProviders, ...fromCredentials])).sort()
  }, [credentialProviders, credentials])

  const providerScopeHint =
    trimmedOwnerAgentId.length > 0
      ? `Showing provider suggestions for owner ${trimmedOwnerAgentId}.`
      : 'Showing provider suggestions across all owners.'

  const auditLabelOptions = useMemo(() => {
    const providerScopedCredentials =
      auditProviderFilter === 'all'
        ? credentials
        : credentials.filter((item) => item.provider === auditProviderFilter)
    return Array.from(new Set(providerScopedCredentials.map((item) => item.label))).sort()
  }, [auditProviderFilter, credentials])

  const filteredCredentialsForAudit = useMemo(() => {
    return credentials.filter((item) => {
      const matchesProvider = auditProviderFilter === 'all' || item.provider === auditProviderFilter
      const matchesLabel = auditLabelFilter === 'all' || item.label === auditLabelFilter
      return matchesProvider && matchesLabel
    })
  }, [auditLabelFilter, auditProviderFilter, credentials])

  const auditScopeHint = useMemo(() => {
    const scopeParts: string[] = []
    if (auditProviderFilter !== 'all') {
      scopeParts.push(`provider=${auditProviderFilter}`)
    }
    if (auditLabelFilter !== 'all') {
      scopeParts.push(`label=${auditLabelFilter}`)
    }
    if (auditActionFilter !== 'all') {
      scopeParts.push(`action=${auditActionFilter}`)
    }
    if (auditEventTypeFilter.trim()) {
      scopeParts.push(`event_type=${auditEventTypeFilter.trim()}`)
    }

    const scopeSuffix = scopeParts.length ? ` (${scopeParts.join(', ')})` : ''
    if (!selectedCredentialId) {
      return `Viewing all filtered credentials${scopeSuffix}.`
    }

    const selected = filteredCredentialsForAudit.find((item) => item.id === selectedCredentialId)
    if (!selected) {
      return `Viewing selected credential${scopeSuffix}.`
    }

    return `Viewing selected credential: ${selected.label} (${selected.provider})${scopeSuffix}.`
  }, [
    auditActionFilter,
    auditEventTypeFilter,
    auditLabelFilter,
    auditProviderFilter,
    filteredCredentialsForAudit,
    selectedCredentialId,
  ])

  const auditResultHint = useMemo(() => {
    if (credentialAuditLoading) {
      return 'Loading audit events…'
    }

    const countLabel = `${credentialAuditEvents.length} event${credentialAuditEvents.length === 1 ? '' : 's'}`
    if (credentialAuditError) {
      if (credentialAuditEvents.length > 0) {
        return `Showing ${countLabel} (latest loaded pages retained).`
      }
      return 'Unable to summarize audit results while loading failed.'
    }

    return `Showing ${countLabel} (page size ${auditLimit}, offset ${auditOffset}).`
  }, [
    auditLimit,
    auditOffset,
    credentialAuditError,
    credentialAuditEvents.length,
    credentialAuditLoading,
  ])

  const isAuditResultCapped =
    !credentialAuditLoading && !credentialAuditError && credentialAuditHasMore

  const auditPaginationHint = useMemo(() => {
    if (credentialAuditLoading || credentialAuditError || credentialAuditEvents.length === 0) {
      return null
    }

    const loadedPages = Math.max(1, Math.floor(auditOffset / auditLimit) + 1)
    if (credentialAuditHasMore) {
      return `Loaded ${loadedPages} page${loadedPages === 1 ? '' : 's'}.`
    }
    return `Loaded ${loadedPages} page${loadedPages === 1 ? '' : 's'} · end reached.`
  }, [
    auditLimit,
    auditOffset,
    credentialAuditError,
    credentialAuditEvents.length,
    credentialAuditHasMore,
    credentialAuditLoading,
  ])

  const hasOlderAuditPageError =
    credentialAuditError?.startsWith('Failed to load older page.') &&
    credentialAuditEvents.length > 0

  const canRetryOlderAuditPage = hasOlderAuditPageError && !credentialAuditPaging
  const canCopyOlderAuditPageFailureTime =
    hasOlderAuditPageError && Boolean(credentialAuditOlderPageFailureAt) && !credentialAuditPaging

  const selectedCredential = useMemo(
    () => credentials.find((item) => item.id === selectedCredentialId) ?? null,
    [credentials, selectedCredentialId]
  )

  const normalizedSelectedCredentialExpiresAt = selectedCredential
    ? toDatetimeLocalValue(selectedCredential.token_expires_at)
    : ''
  const isEditLabelChanged = selectedCredential
    ? editCredentialLabel.trim() !== selectedCredential.label
    : false
  const isEditSecretProvided = editCredentialSecret.trim().length > 0
  const isEditExpiryChanged = selectedCredential
    ? editCredentialClearExpiry
      ? selectedCredential.token_expires_at !== null
      : editCredentialExpiresAt !== normalizedSelectedCredentialExpiresAt
    : false
  const hasPendingCredentialEditChange =
    isEditLabelChanged || isEditSecretProvided || isEditExpiryChanged
  const pendingCredentialEditFields = [
    isEditLabelChanged ? 'label' : null,
    isEditSecretProvided ? 'secret' : null,
    isEditExpiryChanged ? 'token_expires_at' : null,
  ].filter((field): field is string => Boolean(field))
  const pendingCredentialFieldHints: Record<string, string> = {
    label: 'PATCH updates credential label.',
    secret: 'PATCH rotates credential secret when non-blank.',
    token_expires_at: editCredentialClearExpiry
      ? 'PATCH clears token_expires_at (expiry removed).'
      : 'PATCH sets token_expires_at to the selected datetime.',
  }
  const parsedCreateExpiryPreview = newCredentialExpiresAt
    ? new Date(newCredentialExpiresAt)
    : null
  const hasInvalidCreateExpiryPreview =
    newCredentialExpiresAt.length > 0 &&
    (!parsedCreateExpiryPreview || Number.isNaN(parsedCreateExpiryPreview.getTime()))
  const createExpiryPreview = !newCredentialExpiresAt
    ? 'No expiry (optional).'
    : hasInvalidCreateExpiryPreview
      ? 'Enter a valid datetime.'
      : `Will set expiry to ${parsedCreateExpiryPreview.toLocaleString()}.`

  const parsedEditExpiryPreview = editCredentialExpiresAt
    ? new Date(editCredentialExpiresAt)
    : null
  const tokenExpiryPreview = !selectedCredential
    ? null
    : !isEditExpiryChanged
      ? 'Expiry unchanged.'
      : editCredentialClearExpiry
        ? 'Will clear expiry.'
        : !editCredentialExpiresAt
          ? 'Will clear expiry (empty datetime).'
          : parsedEditExpiryPreview && !Number.isNaN(parsedEditExpiryPreview.getTime())
            ? `Will set expiry to ${parsedEditExpiryPreview.toLocaleString()}.`
            : 'Enter a valid datetime to set expiry.'
  const hasInvalidEditExpiryPreview =
    Boolean(selectedCredential) &&
    isEditExpiryChanged &&
    !editCredentialClearExpiry &&
    editCredentialExpiresAt.length > 0 &&
    tokenExpiryPreview === 'Enter a valid datetime to set expiry.'

  useEffect(() => {
    if (!selectedCredential) {
      setEditCredentialLabel('')
      setEditCredentialSecret('')
      setEditCredentialExpiresAt('')
      setEditCredentialClearExpiry(false)
      return
    }

    setEditCredentialLabel(selectedCredential.label)
    setEditCredentialSecret('')
    setEditCredentialExpiresAt(toDatetimeLocalValue(selectedCredential.token_expires_at))
    setEditCredentialClearExpiry(false)
  }, [selectedCredential])

  useEffect(() => {
    if (!credentialFormNotice) {
      setCredentialFormNoticeAt(null)
      setCredentialFormNoticePinned(false)
      setCredentialFormNoticeHovering(false)
    }
  }, [credentialFormNotice])

  useEffect(() => {
    if (!credentialFormNotice || !credentialFormNoticeAt) {
      return
    }
    const intervalId = window.setInterval(() => {
      setCredentialFormNoticeTick((current) => current + 1)
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [credentialFormNotice, credentialFormNoticeAt])

  const credentialFormNoticeAgeLabel = useMemo(() => {
    if (!credentialFormNoticeAt) {
      return ''
    }
    return ` (${formatNoticeAge(credentialFormNoticeAt)})`
  }, [credentialFormNoticeAt, credentialFormNoticeTick])

  useEffect(() => {
    if (!credentialAuditPagingAnnouncementAt || credentialAuditPaging) {
      return
    }
    const intervalId = window.setInterval(() => {
      setCredentialAuditPagingAnnouncementTick((current) => current + 1)
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [credentialAuditPaging, credentialAuditPagingAnnouncementAt])

  const credentialAuditPagingAnnouncementAgeLabel = useMemo(() => {
    if (!credentialAuditPagingAnnouncementAt || credentialAuditPaging) {
      return ''
    }
    return ` (${formatNoticeAge(credentialAuditPagingAnnouncementAt)})`
  }, [credentialAuditPaging, credentialAuditPagingAnnouncementAt, credentialAuditPagingAnnouncementTick])

  const olderAuditPageFailureAgeLabel = useMemo(() => {
    if (!hasOlderAuditPageError || !credentialAuditOlderPageFailureAt || credentialAuditPaging) {
      return null
    }
    return `failed ${formatNoticeAge(credentialAuditOlderPageFailureAt)}`
  }, [
    credentialAuditOlderPageFailureAt,
    credentialAuditPaging,
    credentialAuditPagingAnnouncementTick,
    hasOlderAuditPageError,
  ])

  const olderAuditPageFailureTitle = useMemo(() => {
    if (!hasOlderAuditPageError || !credentialAuditOlderPageFailureAt || credentialAuditPaging) {
      return undefined
    }
    return `Failure completed at ${formatEpochTimestamp(credentialAuditOlderPageFailureAt)}`
  }, [credentialAuditOlderPageFailureAt, credentialAuditPaging, hasOlderAuditPageError])

  const credentialAuditPagingAnnouncementTitle = useMemo(() => {
    if (!credentialAuditPagingAnnouncementAt || credentialAuditPaging) {
      return undefined
    }
    return `Completed at ${formatEpochTimestamp(credentialAuditPagingAnnouncementAt)}`
  }, [credentialAuditPaging, credentialAuditPagingAnnouncementAt])

  useEffect(() => {
    if (!credentialFormNotice || credentialFormNoticePinned || credentialFormNoticeHovering) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCredentialFormNotice(null)
    }, 10_000)

    return () => window.clearTimeout(timeoutId)
  }, [credentialFormNotice, credentialFormNoticeHovering, credentialFormNoticePinned])

  const submitCreateCredential = useCallback(async () => {
    const provider = newCredentialProvider.trim()
    const ownerAgentId = newCredentialOwnerAgentId.trim()
    const label = newCredentialLabel.trim()
    const secret = newCredentialSecret.trim()

    if (!provider || !ownerAgentId || !label || !secret) {
      setCredentialFormError('Owner, provider, label, and secret are required to create a credential.')
      setCredentialFormNotice(null)
      return
    }

    setCredentialFormSubmitting(true)
    setCredentialFormError(null)
    setCredentialFormNotice(null)

    try {
      const response = await fetch(`${API_BASE}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `cred-${Date.now()}`,
          owner_agent_id: ownerAgentId,
          provider,
          label,
          secret,
          token_expires_at: toIsoFromDatetimeLocal(newCredentialExpiresAt),
        }),
      })
      if (!response.ok) {
        throw new Error(`Failed to create credential (${response.status})`)
      }

      setNewCredentialLabel('')
      setNewCredentialSecret('')
      setNewCredentialExpiresAt('')
      await Promise.all([loadCredentials(), loadCredentialProviders(ownerAgentId)])
      setCredentialFormNotice('Credential created successfully.')
      setCredentialFormNoticeAt(Date.now())
      setCredentialFormNoticePinned(false)
    } catch (err) {
      setCredentialFormError(err instanceof Error ? err.message : 'Unknown error')
      setCredentialFormNotice(null)
    } finally {
      setCredentialFormSubmitting(false)
    }
  }, [
    loadCredentialProviders,
    loadCredentials,
    newCredentialExpiresAt,
    newCredentialLabel,
    newCredentialOwnerAgentId,
    newCredentialProvider,
    newCredentialSecret,
  ])

  const submitUpdateCredential = useCallback(async () => {
    if (!selectedCredential) {
      setCredentialFormError('Select a credential to update.')
      setCredentialFormNotice(null)
      return
    }

    const nextLabel = editCredentialLabel.trim()
    if (!nextLabel) {
      setCredentialFormError('Label is required to update a credential.')
      setCredentialFormNotice(null)
      return
    }

    const payload: Record<string, unknown> = { label: nextLabel }
    const trimmedSecret = editCredentialSecret.trim()
    if (trimmedSecret.length > 0) {
      payload.secret = trimmedSecret
    }
    if (editCredentialClearExpiry) {
      payload.clear_token_expires_at = true
    } else {
      payload.token_expires_at = toIsoFromDatetimeLocal(editCredentialExpiresAt)
    }

    if (!hasPendingCredentialEditChange) {
      setCredentialFormError('No update to apply. Change label, provide a new secret, or update expiry.')
      setCredentialFormNotice(null)
      return
    }

    setCredentialFormSubmitting(true)
    setCredentialFormError(null)
    setCredentialFormNotice(null)
    try {
      const response = await fetch(`${API_BASE}/credentials/${encodeURIComponent(selectedCredential.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(`Failed to update credential (${response.status})`)
      }
      setEditCredentialSecret('')
      await loadCredentials()
      setCredentialFormNotice('Selected credential updated successfully.')
      setCredentialFormNoticeAt(Date.now())
      setCredentialFormNoticePinned(false)
    } catch (err) {
      setCredentialFormError(err instanceof Error ? err.message : 'Unknown error')
      setCredentialFormNotice(null)
    } finally {
      setCredentialFormSubmitting(false)
    }
  }, [
    editCredentialClearExpiry,
    editCredentialExpiresAt,
    editCredentialLabel,
    editCredentialSecret,
    hasPendingCredentialEditChange,
    loadCredentials,
    selectedCredential,
  ])

  const submitDeleteCredential = useCallback(async () => {
    if (!selectedCredential) {
      setCredentialFormError('Select a credential to delete.')
      setCredentialFormNotice(null)
      return
    }

    const confirmDelete = window.confirm(
      `Delete credential "${selectedCredential.label}" (${selectedCredential.provider})? This cannot be undone.`
    )
    if (!confirmDelete) {
      return
    }

    setCredentialDeleteSubmitting(true)
    setCredentialFormError(null)
    setCredentialFormNotice(null)
    try {
      const response = await fetch(`${API_BASE}/credentials/${encodeURIComponent(selectedCredential.id)}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`Failed to delete credential (${response.status})`)
      }

      setSelectedCredentialId('')
      await Promise.all([
        loadCredentials(),
        loadCredentialProviders(selectedCredential.owner_agent_id),
      ])
      setCredentialFormNotice('Selected credential deleted successfully.')
      setCredentialFormNoticeAt(Date.now())
      setCredentialFormNoticePinned(false)
    } catch (err) {
      setCredentialFormError(err instanceof Error ? err.message : 'Unknown error')
      setCredentialFormNotice(null)
    } finally {
      setCredentialDeleteSubmitting(false)
    }
  }, [loadCredentialProviders, loadCredentials, selectedCredential])

  useEffect(() => {
    if (auditLabelFilter === 'all') {
      return
    }
    if (!auditLabelOptions.includes(auditLabelFilter)) {
      setAuditLabelFilter('all')
    }
  }, [auditLabelFilter, auditLabelOptions])

  useEffect(() => {
    if (!selectedCredentialId) {
      return
    }
    if (!filteredCredentialsForAudit.some((item) => item.id === selectedCredentialId)) {
      setSelectedCredentialId('')
    }
  }, [filteredCredentialsForAudit, selectedCredentialId])

  useEffect(() => {
    const controller = new AbortController()
    setAuditOffset(0)
    void loadCredentialAuditEvents(
      selectedCredentialId,
      auditActionFilter,
      auditEventTypeFilter,
      auditProviderFilter,
      auditLabelFilter,
      auditLimit,
      0,
      false,
      controller.signal
    )
    return () => controller.abort()
  }, [
    auditActionFilter,
    auditEventTypeFilter,
    auditLabelFilter,
    auditLimit,
    auditProviderFilter,
    loadCredentialAuditEvents,
    selectedCredentialId,
  ])

  useEffect(() => {
    if (!channelId.trim()) {
      setIsLive(false)
      return
    }

    const wsUrl = buildWebSocketChannelUrl(channelId)
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      setIsLive(true)
    }

    socket.onclose = () => {
      setIsLive(false)
    }

    socket.onerror = () => {
      setIsLive(false)
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event?: string
          message?: Message
        }
        if (payload.event !== 'new_message' || !payload.message) {
          return
        }

        if (payload.message.thread_id === selectedThreadId) {
          setMessages((current) => {
            if (current.some((item) => item.id === payload.message?.id)) {
              return current
            }
            return [...current, payload.message as Message]
          })
          markThreadSeen(payload.message.thread_id, payload.message.id)
        } else {
          markThreadUnseen(payload.message.thread_id)
        }

        void loadThreads()
      } catch {
        // ignore malformed websocket payloads
      }
    }

    return () => {
      socket.close()
    }
  }, [channelId, loadThreads, markThreadSeen, markThreadUnseen, selectedThreadId])

  const rootThreadSummary = useMemo(
    () => threads.find((item) => item.thread_id === null) ?? null,
    [threads]
  )

  const childThreads = useMemo(() => threads.filter((item) => item.thread_id !== null), [threads])

  const sortedChildThreads = useMemo(() => {
    return [...childThreads].sort((left, right) => {
      const leftLatest = left.latest_message_at ? new Date(left.latest_message_at).getTime() : 0
      const rightLatest = right.latest_message_at ? new Date(right.latest_message_at).getTime() : 0
      if (leftLatest !== rightLatest) {
        return rightLatest - leftLatest
      }
      if (left.message_count !== right.message_count) {
        return right.message_count - left.message_count
      }
      return (left.thread_id ?? '').localeCompare(right.thread_id ?? '')
    })
  }, [childThreads])

  const filteredChildThreads = useMemo(() => {
    const query = threadFilterText.trim().toLowerCase()

    return sortedChildThreads.filter((thread) => {
      const matchesQuery =
        query.length === 0 || (thread.thread_id ?? '').toLowerCase().includes(query)
      if (!matchesQuery) {
        return false
      }

      if (!showUnreadOnlyThreads) {
        return true
      }

      return unseenThreadKeys.includes(toThreadKey(thread.thread_id))
    })
  }, [showUnreadOnlyThreads, sortedChildThreads, threadFilterText, unseenThreadKeys])

  const unreadChildThreadCount = useMemo(
    () =>
      sortedChildThreads.filter((thread) => unseenThreadKeys.includes(toThreadKey(thread.thread_id))).length,
    [sortedChildThreads, unseenThreadKeys]
  )

  const hasUnreadRootThread = unseenThreadKeys.includes(ROOT_THREAD_KEY)
  const showRootThreadInList = !showUnreadOnlyThreads || includeRootInUnreadOnly || hasUnreadRootThread
  const visibleThreadCount = filteredChildThreads.length + (showRootThreadInList ? 1 : 0)

  const visibleThreadIds = useMemo<(string | null)[]>(() => {
    const ids: (string | null)[] = []
    if (showRootThreadInList) {
      ids.push(null)
    }
    return ids.concat(filteredChildThreads.map((thread) => thread.thread_id))
  }, [filteredChildThreads, showRootThreadInList])

  const selectedVisibleThreadIndex = visibleThreadIds.findIndex((threadId) => threadId === selectedThreadId)
  const selectedVisibleThreadHiddenByFilter =
    selectedThreadId !== null && selectedVisibleThreadIndex < 0 && visibleThreadIds.length > 0
  const selectedVisibleThreadLabel =
    selectedVisibleThreadIndex >= 0
      ? visibleThreadIds[selectedVisibleThreadIndex] === null
        ? 'Root'
        : visibleThreadIds[selectedVisibleThreadIndex]
      : selectedVisibleThreadHiddenByFilter
        ? `${selectedThreadId} (hidden by current filters)`
        : 'none'

  const threadFilterSummary = useMemo(() => {
    const totalChildCount = sortedChildThreads.length

    if (showUnreadOnlyThreads) {
      const unreadTotalCount = unreadChildThreadCount + (hasUnreadRootThread ? 1 : 0)
      const rootMode = includeRootInUnreadOnly ? 'including root' : 'excluding root unless unread'
      return `Showing ${visibleThreadCount} of ${unreadTotalCount} unread thread${unreadTotalCount === 1 ? '' : 's'} (${rootMode})`
    }

    if (threadFilterText.trim()) {
      return `Showing ${visibleThreadCount} thread${visibleThreadCount === 1 ? '' : 's'} (${totalChildCount} child total)`
    }

    return `Total threads visible: ${visibleThreadCount} (${totalChildCount} child)`
  }, [
    hasUnreadRootThread,
    includeRootInUnreadOnly,
    showUnreadOnlyThreads,
    sortedChildThreads.length,
    threadFilterText,
    unreadChildThreadCount,
    visibleThreadCount,
  ])

  const unreadRootOnlyHint = useMemo(() => {
    if (!showUnreadOnlyThreads || filteredChildThreads.length > 0 || !showRootThreadInList) {
      return null
    }

    if (hasUnreadRootThread) {
      return 'Root thread is the only unread result right now.'
    }

    if (includeRootInUnreadOnly) {
      return 'No unread child threads match. Root is shown as context.'
    }

    return null
  }, [
    filteredChildThreads.length,
    hasUnreadRootThread,
    includeRootInUnreadOnly,
    showRootThreadInList,
    showUnreadOnlyThreads,
  ])

  const hasThreadViewFiltersActive =
    threadFilterText.trim().length > 0 || showUnreadOnlyThreads || !includeRootInUnreadOnly

  const resetThreadViewFilters = useCallback(() => {
    setThreadFilterText('')
    setShowUnreadOnlyThreads(false)
    setIncludeRootInUnreadOnly(true)
    setThreadFilterJumpHint(null)
  }, [])

  useEffect(() => {
    setThreadFilterJumpHint(null)
  }, [includeRootInUnreadOnly, showUnreadOnlyThreads, threadFilterText])

  useEffect(() => {
    if (!threadCopyHint) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setThreadCopyHint(null)
    }, 4000)
    return () => window.clearTimeout(timeoutId)
  }, [threadCopyHint])

  useEffect(() => {
    if (!credentialAuditPagingCopyHint) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setCredentialAuditPagingCopyHint(null)
    }, 4000)
    return () => window.clearTimeout(timeoutId)
  }, [credentialAuditPagingCopyHint])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return
      }
      if (event.key !== 'Escape') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      if (!hasThreadViewFiltersActive) {
        return
      }
      event.preventDefault()
      resetThreadViewFilters()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasThreadViewFiltersActive, resetThreadViewFilters])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (event.key !== '/') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      event.preventDefault()
      threadFilterInputRef.current?.focus()
      threadFilterInputRef.current?.select()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const unreadThreadIds = useMemo(() => {
    return threads
      .filter((thread) => unseenThreadKeys.includes(toThreadKey(thread.thread_id)))
      .map((thread) => thread.thread_id)
  }, [threads, unseenThreadKeys])

  const unreadNavigationHint =
    unreadThreadIds.length > 0
      ? `Unread threads: ${unreadThreadIds.length} • Press U to jump • Shift+U to clear`
      : 'No unread threads right now. Jump/clear controls enable when new activity arrives.'

  const jumpToNextUnread = useCallback(() => {
    if (!unreadThreadIds.length) {
      return
    }
    const currentIndex = unreadThreadIds.findIndex((threadId) => threadId === selectedThreadId)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % unreadThreadIds.length : 0
    selectThread(unreadThreadIds[nextIndex])
  }, [unreadThreadIds, selectedThreadId, selectThread])

  const moveVisibleThreadSelection = useCallback(
    (step: 1 | -1) => {
      if (!visibleThreadIds.length) {
        return
      }
      const currentIndex = selectedVisibleThreadIndex
      const fallbackIndex = step > 0 ? 0 : visibleThreadIds.length - 1
      const startIndex = currentIndex >= 0 ? currentIndex : fallbackIndex
      const nextIndex = (startIndex + step + visibleThreadIds.length) % visibleThreadIds.length
      selectThread(visibleThreadIds[nextIndex])
    },
    [selectThread, selectedVisibleThreadIndex, visibleThreadIds]
  )

  const jumpToVisibleThreadBoundary = useCallback(
    (boundary: 'first' | 'last') => {
      if (!visibleThreadIds.length) {
        return
      }
      const targetIndex = boundary === 'first' ? 0 : visibleThreadIds.length - 1
      selectThread(visibleThreadIds[targetIndex])
    },
    [selectThread, visibleThreadIds]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (event.shiftKey) {
        return
      }
      if (event.key.toLowerCase() !== 'u') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      if (!unreadThreadIds.length) {
        return
      }
      event.preventDefault()
      jumpToNextUnread()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpToNextUnread, unreadThreadIds.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return
      }
      if (event.key.toLowerCase() !== 'r') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      event.preventDefault()
      jumpToRootThreadContext()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpToRootThreadContext])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      const lowered = event.key.toLowerCase()
      const isArrowKey = event.key === 'ArrowDown' || event.key === 'ArrowUp'
      const isBoundaryKey = event.key === 'Home' || event.key === 'End'
      const isPagingKey = event.key === 'PageDown' || event.key === 'PageUp'
      if (lowered !== 'j' && lowered !== 'k' && !isArrowKey && !isBoundaryKey && !isPagingKey) {
        return
      }
      if (!visibleThreadIds.length) {
        return
      }
      event.preventDefault()
      if (event.key === 'Home') {
        jumpToVisibleThreadBoundary('first')
        return
      }
      if (event.key === 'End') {
        jumpToVisibleThreadBoundary('last')
        return
      }
      if (event.key === 'PageDown') {
        jumpToVisibleThreadBoundary('last')
        return
      }
      if (event.key === 'PageUp') {
        jumpToVisibleThreadBoundary('first')
        return
      }
      const step = lowered === 'j' || event.key === 'ArrowDown' ? 1 : -1
      moveVisibleThreadSelection(step)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpToVisibleThreadBoundary, moveVisibleThreadSelection, visibleThreadIds.length])

  const clearAllUnreadMarkers = useCallback(() => {
    if (!threads.length || unreadThreadIds.length === 0) {
      return
    }

    setUnreadClearUndoSnapshot({
      lastSeenByThread,
      lastSeenCountByThread,
      unseenThreadKeys,
      clearedCount: unreadThreadIds.length,
    })

    const marker = `cleared:${Date.now()}`
    const nextLastSeenByThread = { ...lastSeenByThread }
    const nextLastSeenCountByThread = { ...lastSeenCountByThread }

    threads.forEach((thread) => {
      const key = toThreadKey(thread.thread_id)
      nextLastSeenByThread[key] = marker
      nextLastSeenCountByThread[key] = thread.message_count
    })

    setLastSeenByThread(nextLastSeenByThread)
    setLastSeenCountByThread(nextLastSeenCountByThread)
    setUnseenThreadKeys([])
  }, [
    lastSeenByThread,
    lastSeenCountByThread,
    threads,
    unreadThreadIds.length,
    unseenThreadKeys,
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return
      }
      if (event.key.toLowerCase() !== 'u') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      if (!unreadThreadIds.length) {
        return
      }
      event.preventDefault()
      clearAllUnreadMarkers()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearAllUnreadMarkers, unreadThreadIds.length])

  const undoClearAllUnreadMarkers = useCallback(() => {
    if (!unreadClearUndoSnapshot) {
      return
    }
    setLastSeenByThread(unreadClearUndoSnapshot.lastSeenByThread)
    setLastSeenCountByThread(unreadClearUndoSnapshot.lastSeenCountByThread)
    setUnseenThreadKeys(unreadClearUndoSnapshot.unseenThreadKeys)
    setUnreadClearUndoSnapshot(null)
  }, [unreadClearUndoSnapshot])

  useEffect(() => {
    if (!unreadClearUndoSnapshot) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setUnreadClearUndoSnapshot(null)
    }, 10_000)

    return () => window.clearTimeout(timeoutId)
  }, [unreadClearUndoSnapshot])

  const typeCounts = useMemo(() => {
    if (!graph) {
      return { freeform: 0, department: 0, squad: 0 }
    }
    return {
      freeform: graph.by_type.freeform?.length ?? 0,
      department: graph.by_type.department?.length ?? 0,
      squad: graph.by_type.squad?.length ?? 0,
    }
  }, [graph])

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Agent Chat Control Tower</h2>
      <p>Port 50004 / Stack: React+TS+Vite + FastAPI + Postgres + Redis + Nginx</p>

      <h3>Organization Graph</h3>
      {loading && <p>Loading organization graph…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {!loading && !error && (
        <>
          <ul>
            <li>Freeform: {typeCounts.freeform}</li>
            <li>Department: {typeCounts.department}</li>
            <li>Squad: {typeCounts.squad}</li>
            <li>Total: {graph?.items.length ?? 0}</li>
          </ul>

          <h4>Nodes</h4>
          {graph?.items.length ? (
            <ul>
              {graph.items.map((org) => (
                <li key={org.id}>
                  <strong>{org.name}</strong> ({org.org_type})
                  {org.parent_id ? ` → parent: ${org.parent_id}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p>No organizations yet.</p>
          )}
        </>
      )}

      <hr style={{ margin: '24px 0' }} />

      <h3>Chat Thread Explorer</h3>
      <label htmlFor="channel-id">Channel ID:</label>{' '}
      <input
        id="channel-id"
        value={channelId}
        onChange={(event) => setChannelId(event.target.value)}
        placeholder="chan-1"
      />{' '}
      <span
        style={{
          fontSize: 12,
          color: isLive ? 'seagreen' : 'dimgray',
          fontWeight: 600,
        }}
      >
        {isLive ? 'LIVE' : 'OFFLINE'}
      </span>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label htmlFor="composer-sender">Sender:</label>
        <input
          id="composer-sender"
          value={composerSenderId}
          onChange={(event) => setComposerSenderId(event.target.value)}
          placeholder="agent-1"
        />
        <label htmlFor="composer-body">Message:</label>
        <textarea
          id="composer-body"
          ref={composerBodyRef}
          value={composerBody}
          onChange={(event) => setComposerBody(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={selectedThreadId ? `Reply in ${selectedThreadId}` : 'Root message'}
          rows={2}
          style={{ minWidth: 260, resize: 'vertical' }}
        />
        <small style={{ color: 'dimgray' }}>
          Enter to send • Shift+Enter newline • Esc (empty) to return to root • Shift+R jump root
        </small>
        <button type="button" onClick={() => void submitMessage()} disabled={composerSubmitting}>
          {composerSubmitting ? 'Sending…' : selectedThreadId ? 'Reply to thread' : 'Send root message'}
        </button>
        {selectedThreadId && (
          <button type="button" onClick={exitThreadContext} title="Return composer context to root thread">
            Return to root context
          </button>
        )}
        <button type="button" onClick={jumpToRootThreadContext} title="Shift+R">
          Jump root
        </button>
        <button type="button" onClick={jumpToNextUnread} disabled={unreadThreadIds.length === 0}>
          Jump to next unread
        </button>
        <button
          type="button"
          onClick={clearAllUnreadMarkers}
          disabled={unreadThreadIds.length === 0}
          title="Shift+U"
        >
          Clear all unread markers
        </button>
        {unreadClearUndoSnapshot && (
          <small style={{ color: '#555', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            Cleared {unreadClearUndoSnapshot.clearedCount} unread marker
            {unreadClearUndoSnapshot.clearedCount === 1 ? '' : 's'}.
            <button type="button" onClick={undoClearAllUnreadMarkers}>
              Undo
            </button>
          </small>
        )}
        <small style={{ color: unreadThreadIds.length > 0 ? '#555' : '#777' }}>{unreadNavigationHint}</small>
      </div>

      {chatError && <p style={{ color: 'crimson' }}>Error: {chatError}</p>}

      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'flex-start' }}>
        <div>
          <h4>Threads</h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <label htmlFor="thread-filter-input" style={{ fontSize: 13, color: '#444' }}>
              Thread filter
            </label>
            <input
              id="thread-filter-input"
              ref={threadFilterInputRef}
              aria-label="Filter threads by thread ID"
              aria-describedby="thread-filter-hint"
              value={threadFilterText}
              onChange={(event) => setThreadFilterText(event.target.value)}
              onKeyDown={handleThreadFilterKeyDown}
              placeholder="Filter thread IDs"
            />
            <button
              type="button"
              aria-label="Clear thread ID filter"
              onClick={() => setThreadFilterText('')}
              disabled={!threadFilterText.trim()}
              title="Clear thread filter (Esc)"
            >
              Clear filter
            </button>
            <button
              type="button"
              onClick={resetThreadViewFilters}
              disabled={!hasThreadViewFiltersActive}
              title="Reset thread filter + unread toggles (Shift+Esc)"
            >
              Reset view
            </button>
            <small id="thread-filter-hint" style={{ color: '#666' }}>
              / to focus · Enter to jump top result · Esc to clear · Shift+Esc to reset view · J/K or ↑/↓ to move selection · Home/End (or PgUp/PgDn) to jump first/last
            </small>
            <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={showUnreadOnlyThreads}
                onChange={(event) => setShowUnreadOnlyThreads(event.target.checked)}
              />
              unread only
            </label>
            <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={includeRootInUnreadOnly}
                disabled={!showUnreadOnlyThreads}
                onChange={(event) => setIncludeRootInUnreadOnly(event.target.checked)}
              />
              include root
            </label>
            <small style={{ color: '#666' }}>{threadFilterSummary}</small>
            <small style={{ color: '#666' }}>
              Selection: {selectedVisibleThreadIndex >= 0 ? selectedVisibleThreadIndex + 1 : 0}/
              {visibleThreadIds.length} ({selectedVisibleThreadLabel})
            </small>
            {selectedVisibleThreadHiddenByFilter && (
              <button
                type="button"
                onClick={() => selectThread(visibleThreadIds[0] ?? null)}
                title="Selected thread is hidden by filters. Jump to first visible result."
              >
                Jump to first visible
              </button>
            )}
            <button
              type="button"
              onClick={() => void copySelectedThreadLabel()}
              title="Copy selected thread label"
            >
              Copy selected
            </button>
            {threadCopyHint && (
              <small aria-live="polite" role="status" style={{ color: '#666' }}>
                {threadCopyHint}
              </small>
            )}
            {unreadRootOnlyHint && <small style={{ color: '#666' }}>{unreadRootOnlyHint}</small>}
            {threadFilterJumpHint && <small style={{ color: '#666' }}>{threadFilterJumpHint}</small>}
          </div>
          {threadLoading && <p>Loading threads…</p>}
          {!threadLoading && (
            <ul>
              {showRootThreadInList && (
                <li>
                  <button
                    type="button"
                    onClick={() => selectThread(null)}
                    style={{
                      fontWeight: selectedThreadId === null ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    Root messages ({rootThreadSummary?.message_count ?? 0})
                    {rootThreadSummary?.latest_message_at
                      ? ` · last ${formatTimestamp(rootThreadSummary.latest_message_at)}`
                      : ''}
                    {unseenThreadKeys.includes(ROOT_THREAD_KEY) ? ' • new' : ''}
                  </button>
                </li>
              )}
              {filteredChildThreads.map((thread) => (
                <li key={thread.thread_id}>
                  <button
                    type="button"
                    onClick={() => selectThread(thread.thread_id)}
                    style={{
                      fontWeight: selectedThreadId === thread.thread_id ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {thread.thread_id} ({thread.message_count})
                    {thread.latest_message_at ? ` · last ${formatTimestamp(thread.latest_message_at)}` : ''}
                    {unseenThreadKeys.includes(toThreadKey(thread.thread_id)) ? ' • new' : ''}
                  </button>
                </li>
              ))}
              {(!!threadFilterText.trim() || showUnreadOnlyThreads) && visibleThreadCount === 0 && (
                <li style={{ color: '#666' }}>
                  {showUnreadOnlyThreads ? 'No unread thread matches current filter.' : 'No thread matches.'}
                </li>
              )}
            </ul>
          )}
        </div>

        <div>
          <h4>{selectedThreadId ? `Messages in ${selectedThreadId}` : 'Root messages'}</h4>
          {messageLoading && <p>Loading messages…</p>}
          {!messageLoading &&
            (messages.length ? (
              <ul>
                {messages.map((message) => (
                  <li key={message.id}>
                    <code>{message.sender_agent_id}</code> ·{' '}
                    <small>{formatTimestamp(message.created_at)}</small>: {message.body}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No messages.</p>
            ))}
          <div ref={messageListEndRef} />
        </div>
      </div>

      <hr style={{ margin: '24px 0' }} />

      <h3>Credential Token Lifecycle</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label htmlFor="credential-status">Status:</label>
        <select
          id="credential-status"
          value={credentialFilter}
          onChange={(event) => setCredentialFilter(event.target.value as TokenStatusFilter)}
        >
          <option value="all">all</option>
          <option value="active">active</option>
          <option value="expired">expired</option>
          <option value="expiring_soon">expiring_soon</option>
        </select>

        <label htmlFor="expiring-hours">Expiring window (hours):</label>
        <input
          id="expiring-hours"
          type="number"
          min={1}
          max={24 * 30}
          value={expiringWithinHours}
          onChange={(event) => setExpiringWithinHours(Number(event.target.value) || 24)}
        />

        <button type="button" onClick={() => void loadCredentials()}>
          Refresh
        </button>
      </div>

      <h4 style={{ marginTop: 16 }}>Credential Create/Edit</h4>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label htmlFor="credential-owner">Owner:</label>
        <input
          id="credential-owner"
          value={newCredentialOwnerAgentId}
          onChange={(event) => setNewCredentialOwnerAgentId(event.target.value)}
          placeholder="agent-ui"
        />

        <label htmlFor="credential-provider-input">Provider:</label>
        <input
          id="credential-provider-input"
          value={newCredentialProvider}
          onChange={(event) => setNewCredentialProvider(event.target.value)}
          list="credential-provider-options"
          placeholder="openai_api"
        />
        <datalist id="credential-provider-options">
          {credentialProvidersWithFallback.map((provider) => (
            <option key={provider} value={provider} />
          ))}
        </datalist>

        <label htmlFor="credential-label">Label:</label>
        <input
          id="credential-label"
          value={newCredentialLabel}
          onChange={(event) => setNewCredentialLabel(event.target.value)}
          placeholder="Primary OpenAI key"
        />

        <label htmlFor="credential-secret">Secret:</label>
        <input
          id="credential-secret"
          type="password"
          value={newCredentialSecret}
          onChange={(event) => setNewCredentialSecret(event.target.value)}
          placeholder="sk-..."
        />

        <label htmlFor="credential-expires">Expires at:</label>
        <input
          id="credential-expires"
          type="datetime-local"
          value={newCredentialExpiresAt}
          onChange={(event) => setNewCredentialExpiresAt(event.target.value)}
          title="Use local date/time picker format (YYYY-MM-DDTHH:mm)."
          aria-label="New credential expiry datetime (local format YYYY-MM-DDTHH:mm)"
          aria-describedby="credential-expires-hint credential-expires-preview"
        />
        <small id="credential-expires-hint" style={{ fontSize: 12, color: '#666' }}>
          Optional • format: YYYY-MM-DDTHH:mm
        </small>
        <small
          id="credential-expires-preview"
          aria-live="polite"
          style={{
            fontSize: 12,
            color: hasInvalidCreateExpiryPreview ? '#8a4b00' : '#666',
            background: hasInvalidCreateExpiryPreview ? '#fff4e5' : 'transparent',
            border: hasInvalidCreateExpiryPreview ? '1px solid #ffd8a8' : 'none',
            borderRadius: hasInvalidCreateExpiryPreview ? 6 : 0,
            padding: hasInvalidCreateExpiryPreview ? '2px 6px' : 0,
          }}
        >
          Expiry preview: {createExpiryPreview}
        </small>

        <button type="button" onClick={() => void submitCreateCredential()} disabled={credentialFormSubmitting}>
          {credentialFormSubmitting ? 'Saving…' : 'Create credential'}
        </button>

      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <strong>Selected credential edit:</strong>
        <input
          value={editCredentialLabel}
          onChange={(event) => setEditCredentialLabel(event.target.value)}
          placeholder="Updated label"
          disabled={!selectedCredential}
        />
        <input
          type="password"
          value={editCredentialSecret}
          onChange={(event) => setEditCredentialSecret(event.target.value)}
          placeholder="Leave blank to keep existing secret"
          disabled={!selectedCredential}
        />
        <label htmlFor="selected-credential-expires">Expires at:</label>
        <input
          id="selected-credential-expires"
          type="datetime-local"
          value={editCredentialExpiresAt}
          onChange={(event) => setEditCredentialExpiresAt(event.target.value)}
          disabled={!selectedCredential || editCredentialClearExpiry}
          title="Use local date/time picker format (YYYY-MM-DDTHH:mm). Invalid partial values are ignored until complete."
          aria-label="Credential expiry datetime (local format YYYY-MM-DDTHH:mm)"
          aria-describedby="selected-credential-expires-hint selected-credential-expires-preview"
        />
        <small id="selected-credential-expires-hint" style={{ fontSize: 12, color: '#666' }}>
          Optional • format: YYYY-MM-DDTHH:mm
        </small>
        <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={editCredentialClearExpiry}
            onChange={(event) => setEditCredentialClearExpiry(event.target.checked)}
            disabled={!selectedCredential}
          />
          clear expiry
        </label>
        {selectedCredential && editCredentialClearExpiry && (
          <small style={{ fontSize: 12, color: '#8a4b00' }}>
            Clear expiry overrides any typed datetime.
          </small>
        )}
        <button
          type="button"
          onClick={() => void submitUpdateCredential()}
          disabled={!selectedCredential || credentialFormSubmitting || credentialDeleteSubmitting || !hasPendingCredentialEditChange}
        >
          {credentialFormSubmitting ? 'Saving…' : 'Update selected credential'}
        </button>
        <button
          type="button"
          onClick={() => void submitDeleteCredential()}
          disabled={!selectedCredential || credentialFormSubmitting || credentialDeleteSubmitting}
          style={{ color: '#b00020' }}
        >
          {credentialDeleteSubmitting ? 'Deleting…' : 'Delete selected credential'}
        </button>
      </div>
      {selectedCredential && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>PATCH fields:</span>
          {pendingCredentialEditFields.length > 0 ? (
            pendingCredentialEditFields.map((field) => (
              <span
                key={field}
                title={pendingCredentialFieldHints[field]}
                aria-label={`${`changed:${field}`}. ${pendingCredentialFieldHints[field]}`}
                style={{
                  fontSize: 12,
                  background: '#edf5ff',
                  color: '#1f4b99',
                  border: '1px solid #cfe0ff',
                  borderRadius: 999,
                  padding: '2px 8px',
                  cursor: 'help',
                }}
              >
                changed:{field}
              </span>
            ))
          ) : (
            <span style={{ fontSize: 12, color: '#888' }}>none</span>
          )}
          {pendingCredentialEditFields.length > 0 && (
            <span style={{ fontSize: 12, color: '#777' }}>Hover chips for PATCH behavior.</span>
          )}
          <span
            id="selected-credential-expires-preview"
            style={{
              fontSize: 12,
              color: hasInvalidEditExpiryPreview ? '#8a4b00' : '#555',
              background: hasInvalidEditExpiryPreview ? '#fff4e5' : 'transparent',
              border: hasInvalidEditExpiryPreview ? '1px solid #ffd8a8' : 'none',
              borderRadius: hasInvalidEditExpiryPreview ? 6 : 0,
              padding: hasInvalidEditExpiryPreview ? '2px 6px' : 0,
            }}
            aria-live="polite"
          >
            Expiry preview: {tokenExpiryPreview}
          </span>
        </div>
      )}
      <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
        Secret is optional when updating. If left blank, the existing secret remains unchanged.
        {selectedCredential && !hasPendingCredentialEditChange
          ? ' Edit a field to enable update.'
          : ''}
      </p>

      <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>{providerScopeHint}</p>
      {providerLoading && <p>Loading provider suggestions…</p>}
      {providerError && <p style={{ color: 'crimson' }}>Provider load error: {providerError}</p>}
      {!providerLoading &&
        !providerError &&
        trimmedOwnerAgentId.length > 0 &&
        credentialProviders.length === 0 && (
          <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
            No providers found for this owner yet. You can still type a new provider value manually.
          </p>
        )}
      {selectedCredential && (
        <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
          Selected credential provider: <code>{selectedCredential.provider}</code> · expires:{' '}
          {selectedCredential.token_expires_at
            ? formatTimestamp(selectedCredential.token_expires_at)
            : 'no expiry'}
        </p>
      )}
      {credentialFormError && <p style={{ color: 'crimson' }}>Form error: {credentialFormError}</p>}
      {credentialFormNotice && (
        <p
          role="status"
          aria-live="polite"
          onMouseEnter={() => setCredentialFormNoticeHovering(true)}
          onMouseLeave={() => setCredentialFormNoticeHovering(false)}
          style={{ color: '#1f6f3e', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
        >
          <span>
            {credentialFormNotice}
            {credentialFormNoticeAgeLabel}
          </span>
          <button
            type="button"
            onClick={() => setCredentialFormNoticePinned((current) => !current)}
            style={{ fontSize: 12, padding: '2px 8px' }}
          >
            {credentialFormNoticePinned ? 'Unpin notice' : 'Pin notice'}
          </button>
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <label htmlFor="credential-audit-provider">Provider:</label>
        <select
          id="credential-audit-provider"
          value={auditProviderFilter}
          onChange={(event) => setAuditProviderFilter(event.target.value)}
        >
          <option value="all">all</option>
          {credentialProvidersWithFallback.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>

        <label htmlFor="credential-audit-label">Label:</label>
        <select
          id="credential-audit-label"
          value={auditLabelFilter}
          onChange={(event) => setAuditLabelFilter(event.target.value)}
        >
          <option value="all">all</option>
          {auditLabelOptions.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>

        <label htmlFor="credential-audit-action">Action:</label>
        <select
          id="credential-audit-action"
          value={auditActionFilter}
          onChange={(event) => setAuditActionFilter(event.target.value)}
        >
          <option value="all">all</option>
          <option value="updated">updated</option>
          <option value="rotated">rotated</option>
          <option value="deleted">deleted</option>
        </select>

        <label htmlFor="credential-audit-event-type">Event type:</label>
        <input
          id="credential-audit-event-type"
          value={auditEventTypeFilter}
          onChange={(event) => setAuditEventTypeFilter(event.target.value)}
          placeholder="credential.updated"
          style={{ minWidth: 180 }}
        />

        <label htmlFor="credential-audit-limit">Limit:</label>
        <select
          id="credential-audit-limit"
          value={String(auditLimit)}
          onChange={(event) => setAuditLimit(Number(event.target.value))}
          title="Maximum number of latest events to fetch"
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>

        <label htmlFor="credential-audit-select">Audit trail credential:</label>
        <select
          id="credential-audit-select"
          value={selectedCredentialId}
          onChange={(event) => setSelectedCredentialId(event.target.value)}
          disabled={!filteredCredentialsForAudit.length}
        >
          {!filteredCredentialsForAudit.length ? (
            <option value="">No credentials</option>
          ) : (
            <>
              <option value="">All filtered credentials</option>
              {filteredCredentialsForAudit.map((credential) => (
                <option key={credential.id} value={credential.id}>
                  {credential.label} ({credential.provider})
                </option>
              ))}
            </>
          )}
        </select>

        <button
          type="button"
          onClick={() => {
            setAuditOffset(0)
            void loadCredentialAuditEvents(
              selectedCredentialId,
              auditActionFilter,
              auditEventTypeFilter,
              auditProviderFilter,
              auditLabelFilter,
              auditLimit,
              0,
              false
            )
          }}
        >
          Refresh audit trail
        </button>

        {(credentialAuditHasMore || credentialAuditPaging) && (
          <button
            type="button"
            disabled={credentialAuditPaging}
            onClick={() => {
              const nextOffset = credentialAuditEvents.length
              setAuditOffset(nextOffset)
              void loadCredentialAuditEvents(
                selectedCredentialId,
                auditActionFilter,
                auditEventTypeFilter,
                auditProviderFilter,
                auditLabelFilter,
                auditLimit,
                nextOffset,
                true
              )
            }}
            title={
              credentialAuditPaging
                ? 'Loading older audit events…'
                : `Load older audit events (offset ${credentialAuditEvents.length})`
            }
          >
            {credentialAuditPaging ? 'Loading older page…' : 'Load older page'}
          </button>
        )}
      </div>
      <p
        style={{ fontSize: 12, color: '#666', marginTop: 6 }}
        tabIndex={hasOlderAuditPageError ? 0 : -1}
        aria-label={
          hasOlderAuditPageError
            ? 'Audit pagination hint area. Press Escape to dismiss older-page error.'
            : undefined
        }
        onKeyDown={(event) => {
          if (
            hasOlderAuditPageError &&
            event.key === 'Escape' &&
            !event.shiftKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey
          ) {
            event.preventDefault()
            event.stopPropagation()
            setCredentialAuditError(null)
            setCredentialAuditOlderPageFailureAt(null)
          }
        }}
      >
        {auditScopeHint} {auditResultHint}{' '}
        {isAuditResultCapped && (
          <span
            title={`Audit API returns up to ${auditLimit} events per request; load older pages to continue.`}
            style={{
              display: 'inline-block',
              padding: '1px 6px',
              borderRadius: 999,
              border: '1px solid #c9b458',
              color: '#6f5a00',
              backgroundColor: '#fff7cf',
              fontWeight: 600,
            }}
          >
            capped to latest {auditLimit}
          </span>
        )}{' '}
        {auditPaginationHint && (
          <span
            style={{
              display: 'inline-block',
              padding: '1px 6px',
              borderRadius: 999,
              border: '1px solid #d0d7de',
              color: '#444',
              backgroundColor: '#f6f8fa',
              fontWeight: 600,
            }}
          >
            {auditPaginationHint}
          </span>
        )}{' '}
        {canRetryOlderAuditPage && (
          <button
            type="button"
            style={{ fontSize: 12, padding: '1px 8px' }}
            title={`Retry loading older audit page (offset ${auditOffset})`}
            onClick={() => {
              void loadCredentialAuditEvents(
                selectedCredentialId,
                auditActionFilter,
                auditEventTypeFilter,
                auditProviderFilter,
                auditLabelFilter,
                auditLimit,
                auditOffset,
                true
              )
            }}
          >
            Retry older page
          </button>
        )}{' '}
        {hasOlderAuditPageError && (
          <button
            type="button"
            style={{ fontSize: 12, padding: '1px 8px' }}
            title="Dismiss older-page load error"
            onClick={() => {
              setCredentialAuditError(null)
              setCredentialAuditOlderPageFailureAt(null)
            }}
          >
            Dismiss
          </button>
        )}{' '}
        {canCopyOlderAuditPageFailureTime && (
          <button
            type="button"
            style={{ fontSize: 12, padding: '1px 8px' }}
            title="Copy older-page failure completion timestamp"
            onClick={() => {
              void copyCredentialAuditTimestamp(credentialAuditOlderPageFailureAt, 'failure time')
            }}
          >
            Copy failure time
          </button>
        )}{' '}
        {olderAuditPageFailureAgeLabel && (
          <span title={olderAuditPageFailureTitle} style={{ fontSize: 12, color: '#666' }}>
            {olderAuditPageFailureAgeLabel}
          </span>
        )}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, minHeight: 18 }}>
        <p
          aria-live="polite"
          role="status"
          title={credentialAuditPagingAnnouncementTitle}
          style={{ fontSize: 12, color: '#666', margin: 0 }}
        >
          {credentialAuditPagingAnnouncement
            ? `${credentialAuditPagingAnnouncement}${credentialAuditPagingAnnouncementAgeLabel}`
            : ''}
        </p>
        {credentialAuditPagingAnnouncement && credentialAuditPagingAnnouncementAt && !credentialAuditPaging && (
          <button
            type="button"
            style={{ fontSize: 11, padding: '1px 8px' }}
            title="Copy completion timestamp"
            onClick={() => {
              void copyCredentialAuditTimestamp(credentialAuditPagingAnnouncementAt, 'completion time')
            }}
          >
            Copy time
          </button>
        )}
      </div>
      {credentialAuditPagingCopyHint && (
        <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{credentialAuditPagingCopyHint}</p>
      )}

      {credentialError && <p style={{ color: 'crimson' }}>Error: {credentialError}</p>}
      {credentialLoading && <p>Loading credentials…</p>}

      {!credentialLoading &&
        (credentials.length ? (
          <ul>
            {credentials.map((credential) => {
              const status = getCredentialStatus(credential)
              const statusColor =
                status === 'expired'
                  ? 'crimson'
                  : status === 'expiring_soon'
                    ? 'darkorange'
                    : 'seagreen'
              return (
                <li key={credential.id}>
                  <strong>{credential.label}</strong> [{credential.provider}] — owner:{' '}
                  <code>{credential.owner_agent_id}</code>{' '}
                  <span style={{ color: statusColor, fontWeight: 700 }}>{status}</span>
                  {credential.token_expires_at
                    ? ` (expires ${new Date(credential.token_expires_at).toLocaleString()})`
                    : ' (no expiry)'}
                </li>
              )
            })}
          </ul>
        ) : (
          <p>No credentials in selected lifecycle view.</p>
        ))}

      <h4>Credential Audit Trail</h4>
      {credentialAuditError && <p style={{ color: 'crimson' }}>Error: {credentialAuditError}</p>}
      {credentialAuditLoading && <p>Loading audit trail…</p>}
      {!credentialAuditLoading &&
        (credentialAuditEvents.length ? (
          <ul>
            {credentialAuditEvents.map((event, index) => {
              const metadataChips = renderAuditMetadata(event)
              return (
                <li key={`${event.event_type}-${event.occurred_at}-${index}`}>
                  <strong>{event.event_type}</strong> — {new Date(event.occurred_at).toLocaleString()}
                  {metadataChips.length ? (
                    <span style={{ marginLeft: 8, display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                      {metadataChips.map((chip) => (
                        <code
                          key={chip}
                          style={{
                            fontSize: 12,
                            background: '#f5f5f5',
                            borderRadius: 4,
                            padding: '1px 6px',
                          }}
                        >
                          {chip}
                        </code>
                      ))}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p>No audit events for current filters.</p>
        ))}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
