import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {
  getBoundaryDirectionChipPresentation,
  getBoundaryDirectionChipPresentationFromHint,
  getBoundaryDirectionFromHint,
  getBoundaryDirectionStatusCue,
  getHintShortcutSource,
  getThreadFilterResetHint,
  getThreadShortcutLegendButtonAriaKeyshortcuts,
  getThreadShortcutLegendDismissControlCopy,
  getThreadShortcutLegendRegionAriaKeyshortcuts,
  getThreadShortcutLegendToggleControlCopy,
  getThreadShortcutLegendToggleStatusHint,
  getUnreadBoundaryJumpStatusAriaLabel,
  getUnreadClearUndoStatusHint,
  getUnreadJumpWrapStatusCue,
  getUnreadNavigationHintAriaLabel,
  getUnreadNavigationWrapCueForAria,
  isThreadShortcutLegendDismissKey,
  isThreadShortcutLegendToggleKey,
} from './threadHintParsers'
import {
  getShortcutChipPropsFromHint,
  getShortcutChipPropsFromSource,
  getStatusAriaLabelWithShortcutChip,
  getStatusAriaLabelWithShortcutChips,
  renderShortcutChipPresentation,
  type ShortcutChipProps,
} from './threadHintChips'
import {
  AUDIT_EVENTS_LIMIT_MAX,
  buildChannelMessagesQueryParams,
  buildCredentialAuditEventsQueryParams,
  buildCredentialsQueryParams,
  clampAuditEventLimit,
  clampCredentialExpiringWindowHours,
  normalizeAuditOffset,
  type CredentialAuditEventsQueryParamsInput,
} from './apiContracts'
import {
  getSelectedVisibleThreadBoundaryRecoveryButtonTitle,
  getSelectedVisibleThreadButtonRecoveryHint,
  getSelectedVisibleThreadInlineRecoveryHint,
  getSelectedVisibleThreadPositionLabel,
  getSelectedVisibleThreadPositionTitle,
  getSelectedVisibleThreadShortcutRecoveryHint,
  getThreadSelectionButtonAriaCurrent,
  isSelectedVisibleThreadHiddenByFilter,
} from './threadSelectionStatus'

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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const ROOT_THREAD_KEY = '__root__'
const MESSAGE_PAGE_LIMIT = 200

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
  const chips: string[] = []

  const provider = toStringValue(metadata.provider)
  if (provider) {
    chips.push(`provider:${provider}`)
  }

  const label = toStringValue(metadata.label)
  if (label) {
    chips.push(`label:${label}`)
  }

  if (event.event_type === 'credential.updated') {
    const changedFields = toStringList(metadata.changed_fields)
    chips.push(...changedFields.map((field) => `changed:${field}`))
  }

  if (event.event_type === 'credential.rotated') {
    const previousVersion = toStringValue(metadata.previous_key_version)
    const newVersion = toStringValue(metadata.new_key_version)
    if (previousVersion && newVersion) {
      chips.push(`key:${previousVersion}→${newVersion}`)
    }
  }

  return chips
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

export function buildCredentialAuditEventsRequestUrl(
  input: CredentialAuditEventsQueryParamsInput,
): string {
  const params = buildCredentialAuditEventsQueryParams(input)
  return `${API_BASE}/audit-events?${params.toString()}`
}

type ThreadShortcutLegendPresentation = {
  ariaExpanded: boolean
  buttonAriaKeyshortcuts: string
  regionAriaKeyshortcuts: string
  statusHint: string
  toggleControlCopy: string
  dismissControlCopy: string
}

export type ThreadShortcutLegendRegionPresentation = {
  id: 'thread-shortcut-legend'
  role: 'region'
  ariaLabel: 'Thread keyboard shortcuts'
  ariaKeyshortcuts: string
}

export type ThreadShortcutLegendKeyboardTransition = {
  nextVisibility: boolean
  statusHint: string | null
}

export type ThreadShortcutLegendKeyboardRenderState = {
  handled: boolean
  nextVisibility: boolean
  statusHint: string | null
  statusAriaLabel: string | null
}

export function getThreadShortcutLegendPresentation(
  isVisible: boolean,
): ThreadShortcutLegendPresentation {
  return {
    ariaExpanded: isVisible,
    buttonAriaKeyshortcuts: getThreadShortcutLegendButtonAriaKeyshortcuts(isVisible),
    regionAriaKeyshortcuts: getThreadShortcutLegendRegionAriaKeyshortcuts(),
    statusHint: getThreadShortcutLegendToggleStatusHint(isVisible),
    toggleControlCopy: getThreadShortcutLegendToggleControlCopy(),
    dismissControlCopy: getThreadShortcutLegendDismissControlCopy(),
  }
}

export function getThreadShortcutLegendRegionPresentation(
  isVisible: boolean,
): ThreadShortcutLegendRegionPresentation | null {
  if (!isVisible) {
    return null
  }

  return {
    id: 'thread-shortcut-legend',
    role: 'region',
    ariaLabel: 'Thread keyboard shortcuts',
    ariaKeyshortcuts: getThreadShortcutLegendRegionAriaKeyshortcuts(),
  }
}

export function getThreadShortcutLegendKeyboardTransition(
  isVisible: boolean,
  key: string,
  shiftKey: boolean,
): ThreadShortcutLegendKeyboardTransition {
  if (isThreadShortcutLegendToggleKey(key, shiftKey)) {
    const nextVisibility = !isVisible
    return {
      nextVisibility,
      statusHint: getThreadShortcutLegendPresentation(nextVisibility).statusHint,
    }
  }

  if (!shiftKey && isVisible && isThreadShortcutLegendDismissKey(key)) {
    return {
      nextVisibility: false,
      statusHint: getThreadShortcutLegendPresentation(false).statusHint,
    }
  }

  return {
    nextVisibility: isVisible,
    statusHint: null,
  }
}

export type ThreadShortcutLegendKeyboardDispatchInput = {
  isVisible: boolean
  key: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  defaultPrevented: boolean
  repeat: boolean
  isEditableTarget: boolean
  isComposing?: boolean
}

export type ThreadShortcutLegendKeyboardDispatchOutcome = {
  handled: boolean
  nextVisibility: boolean
  statusHint: string | null
}

export function getThreadShortcutLegendKeyboardDispatchOutcome(
  input: ThreadShortcutLegendKeyboardDispatchInput,
): ThreadShortcutLegendKeyboardDispatchOutcome {
  if (
    input.defaultPrevented ||
    input.repeat ||
    input.isComposing ||
    input.metaKey ||
    input.ctrlKey ||
    input.altKey ||
    input.isEditableTarget
  ) {
    return {
      handled: false,
      nextVisibility: input.isVisible,
      statusHint: null,
    }
  }

  const transition = getThreadShortcutLegendKeyboardTransition(
    input.isVisible,
    input.key,
    input.shiftKey,
  )

  if (transition.nextVisibility === input.isVisible && transition.statusHint === null) {
    return {
      handled: false,
      nextVisibility: input.isVisible,
      statusHint: null,
    }
  }

  return {
    handled: true,
    nextVisibility: transition.nextVisibility,
    statusHint: transition.statusHint,
  }
}

export function getThreadShortcutLegendKeyboardRenderState(
  input: ThreadShortcutLegendKeyboardDispatchInput,
): ThreadShortcutLegendKeyboardRenderState {
  const dispatchOutcome = getThreadShortcutLegendKeyboardDispatchOutcome(input)
  const statusShortcutChip = getShortcutChipPropsFromHint(
    dispatchOutcome.statusHint,
    'filter jump',
    'thread-jump',
  )

  return {
    ...dispatchOutcome,
    statusAriaLabel: getStatusAriaLabelWithShortcutChip(dispatchOutcome.statusHint, statusShortcutChip),
  }
}

export type ThreadFilterInputKeyboardDispatchInput = {
  key: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  defaultPrevented: boolean
  repeat?: boolean
  hasThreadFilter: boolean
}

export type ThreadFilterInputKeyboardDispatchOutcome = {
  handled: boolean
  action:
    | 'none'
    | 'clearFilter'
    | 'resetView'
    | 'jumpFirstVisible'
    | 'jumpLastVisible'
    | 'toggleUnreadOnly'
    | 'toggleIncludeRootInUnreadOnly'
}

export function getThreadFilterInputKeyboardDispatchOutcome(
  input: ThreadFilterInputKeyboardDispatchInput,
): ThreadFilterInputKeyboardDispatchOutcome {
  if (input.defaultPrevented || input.repeat || input.metaKey || input.ctrlKey || input.altKey) {
    return {
      handled: false,
      action: 'none',
    }
  }

  if (input.key === 'Escape') {
    if (input.shiftKey) {
      return {
        handled: true,
        action: 'resetView',
      }
    }

    if (!input.hasThreadFilter) {
      return {
        handled: false,
        action: 'none',
      }
    }

    return {
      handled: true,
      action: 'clearFilter',
    }
  }

  if (input.shiftKey && (input.key === 'U' || input.key === 'u')) {
    return {
      handled: true,
      action: 'toggleUnreadOnly',
    }
  }

  if (input.shiftKey && (input.key === 'I' || input.key === 'i')) {
    return {
      handled: true,
      action: 'toggleIncludeRootInUnreadOnly',
    }
  }

  if (input.key === 'Enter' || input.key === 'NumpadEnter') {
    return {
      handled: true,
      action: input.shiftKey ? 'jumpLastVisible' : 'jumpFirstVisible',
    }
  }

  if (!input.shiftKey) {
    return {
      handled: false,
      action: 'none',
    }
  }

  if (input.key === 'Home' || input.key === 'PageUp') {
    return {
      handled: true,
      action: 'jumpFirstVisible',
    }
  }

  if (input.key === 'End' || input.key === 'PageDown') {
    return {
      handled: true,
      action: 'jumpLastVisible',
    }
  }

  return {
    handled: false,
    action: 'none',
  }
}

export type ThreadFilterInputToggleIncludeRootOutcome = {
  nextShowUnreadOnlyThreads: boolean
  nextIncludeRootInUnreadOnly: boolean
  statusHint: string
}

export function getThreadFilterInputToggleIncludeRootOutcome(
  currentIncludeRootInUnreadOnly: boolean,
): ThreadFilterInputToggleIncludeRootOutcome {
  const nextIncludeRootInUnreadOnly = !currentIncludeRootInUnreadOnly

  return {
    nextShowUnreadOnlyThreads: true,
    nextIncludeRootInUnreadOnly,
    statusHint: `Unread-only root inclusion ${
      nextIncludeRootInUnreadOnly ? 'enabled' : 'disabled'
    } from filter input (Shift+I).`,
  }
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
  const [threadRootJumpHint, setThreadRootJumpHint] = useState<string | null>(null)
  const [threadBoundaryJumpHint, setThreadBoundaryJumpHint] = useState<string | null>(null)
  const [threadCopyHint, setThreadCopyHint] = useState<string | null>(null)
  const [showThreadShortcutLegend, setShowThreadShortcutLegend] = useState(false)
  const [threadShortcutLegendToggleHint, setThreadShortcutLegendToggleHint] = useState<string | null>(null)
  const [unreadNavigationWrapCue, setUnreadNavigationWrapCue] = useState<string | null>(null)
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

      const params = buildChannelMessagesQueryParams({
        threadId: selectedThreadId,
        limit: MESSAGE_PAGE_LIMIT,
      })

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

  const jumpToRootThreadContext = useCallback(
    (source: 'Shift+Home' | 'Shift+R' | 'R' | 'button' = 'button') => {
      const alreadyAtRoot = selectedThreadId === null
      const targetLabel = 'Root'
      selectThread(null)
      if (alreadyAtRoot) {
        setThreadRootJumpHint(
          source === 'button'
            ? `Already at root thread · ${targetLabel}.`
            : `Already at root thread (${source} confirmed) · ${targetLabel}.`
        )
      } else {
        setThreadRootJumpHint(
          source === 'button'
            ? `Jumped to root thread · ${targetLabel}.`
            : `Jumped to root thread (${source}) · ${targetLabel}.`
        )
      }
      requestAnimationFrame(() => {
        composerBodyRef.current?.focus()
      })
    },
    [selectThread, selectedThreadId]
  )

  const copySelectedThreadLabel = useCallback(
    async (source: 'Y' | 'button' = 'Y') => {
      const threadLabel = selectedThreadId ?? 'root'
      if (!navigator.clipboard?.writeText) {
        setThreadCopyHint('Clipboard API unavailable in this browser context.')
        return
      }

      try {
        await navigator.clipboard.writeText(threadLabel)
        setThreadCopyHint(
          source === 'button'
            ? `Copied thread (button) · ${threadLabel}.`
            : `Copied thread (Y) · ${threadLabel}.`,
        )
      } catch {
        setThreadCopyHint('Failed to copy thread label.')
      }
    },
    [selectedThreadId],
  )

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

  const filteredChildThreadsRef = useRef<ThreadSummary[]>([])
  const visibleThreadIdsRef = useRef<(string | null)[]>([])

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

  const recoverToVisibleBoundaryThread = useCallback(
    (source: 'Enter' | 'Shift+Enter' | 'button', boundary: 'first' | 'last') => {
      const currentVisibleThreadIds = visibleThreadIdsRef.current
      const currentFilteredChildThreads = filteredChildThreadsRef.current

      if (!currentVisibleThreadIds.length) {
        setThreadFilterJumpHint(null)
        return
      }

      const boundaryIndex = boundary === 'first' ? 0 : currentVisibleThreadIds.length - 1
      const boundaryVisibleThreadId = currentVisibleThreadIds[boundaryIndex] ?? null
      const boundaryLabel = boundary === 'first' ? 'first' : 'last'
      const positionHint = `${boundaryIndex + 1}/${currentVisibleThreadIds.length}`
      const targetLabel = boundaryVisibleThreadId === null ? 'Root' : boundaryVisibleThreadId
      const selectedWasHiddenByFilter = !currentVisibleThreadIds.some(
        (threadId) => threadId === selectedThreadId,
      )
      const alreadyAtBoundaryVisible = selectedThreadId === boundaryVisibleThreadId

      selectThread(boundaryVisibleThreadId)

      if (selectedWasHiddenByFilter) {
        setThreadBoundaryJumpHint(
          `Recovered to ${boundaryLabel} visible thread (${source}) · ${targetLabel} · ${positionHint} · ${getBoundaryDirectionStatusCue(boundary)}.`
        )
        setThreadFilterJumpHint(null)
        return
      }

      if (alreadyAtBoundaryVisible) {
        setThreadBoundaryJumpHint(
          `Already at ${boundaryLabel} visible thread (${source}) · ${targetLabel} · ${positionHint}.`
        )
        setThreadFilterJumpHint(null)
        return
      }

      if (boundaryVisibleThreadId === null && currentFilteredChildThreads.length > 0) {
        setThreadFilterJumpHint(
          'Jumped to Root first (include root is enabled). Press J/K, ↑/↓, or End for child results.',
        )
        return
      }

      setThreadFilterJumpHint(null)
    },
    [selectThread, selectedThreadId],
  )

  const recoverToFirstVisibleThread = useCallback(
    (source: 'Enter' | 'button') => recoverToVisibleBoundaryThread(source, 'first'),
    [recoverToVisibleBoundaryThread]
  )

  const recoverToLastVisibleThread = useCallback(
    (source: 'Shift+Enter' | 'button') => recoverToVisibleBoundaryThread(source, 'last'),
    [recoverToVisibleBoundaryThread]
  )

  const handleThreadFilterKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const dispatchOutcome = getThreadFilterInputKeyboardDispatchOutcome({
        key: event.key,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        defaultPrevented: event.defaultPrevented,
        repeat: event.repeat,
        hasThreadFilter: Boolean(threadFilterText),
      })

      if (!dispatchOutcome.handled) {
        return
      }

      event.preventDefault()

      if (dispatchOutcome.action === 'clearFilter') {
        setThreadFilterText('')
        setThreadFilterJumpHint(null)
        return
      }

      if (dispatchOutcome.action === 'resetView') {
        setThreadFilterText('')
        setShowUnreadOnlyThreads(false)
        setIncludeRootInUnreadOnly(true)
        setThreadFilterJumpHint(getThreadFilterResetHint('input'))
        return
      }

      if (dispatchOutcome.action === 'toggleUnreadOnly') {
        setShowUnreadOnlyThreads((current) => {
          const next = !current
          setThreadFilterJumpHint(
            `Unread-only filter ${next ? 'enabled' : 'disabled'} from filter input (Shift+U).`
          )
          return next
        })
        return
      }

      if (dispatchOutcome.action === 'toggleIncludeRootInUnreadOnly') {
        setShowUnreadOnlyThreads(true)
        setIncludeRootInUnreadOnly((current) => {
          const outcome = getThreadFilterInputToggleIncludeRootOutcome(current)
          setShowUnreadOnlyThreads(outcome.nextShowUnreadOnlyThreads)
          setThreadFilterJumpHint(outcome.statusHint)
          return outcome.nextIncludeRootInUnreadOnly
        })
        return
      }

      if (dispatchOutcome.action === 'jumpLastVisible') {
        recoverToLastVisibleThread('Shift+Enter')
        return
      }

      if (dispatchOutcome.action === 'jumpFirstVisible') {
        recoverToFirstVisibleThread('Enter')
      }
    },
    [recoverToFirstVisibleThread, recoverToLastVisibleThread, threadFilterText]
  )

  const loadCredentials = useCallback(
    async (signal?: AbortSignal) => {
      setCredentialLoading(true)
      setCredentialError(null)

      const query = buildCredentialsQueryParams({
        tokenStatus: credentialFilter,
        expiringWithinHours,
      }).toString()
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

      const boundedLimit = clampAuditEventLimit(limit)
      const boundedOffset = normalizeAuditOffset(offset)
      const requestUrl = buildCredentialAuditEventsRequestUrl({
        credentialId,
        action,
        eventType,
        provider,
        label,
        limit,
        offset,
      })

      try {
        const response = await fetch(requestUrl, { signal })
        if (!response.ok) {
          throw new Error(`Failed to load audit trail (${response.status})`)
        }
        const payload = (await response.json()) as AuditEvent[]
        setCredentialAuditHasMore(payload.length === boundedLimit)
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

  const auditApiSourceFilterParts = useMemo(() => {
    const sourceParts: Array<{ id: string; label: string; fullLabel: string; isTruncated: boolean }> =
      []
    if (auditProviderFilter !== 'all') {
      const fullLabel = `provider=${auditProviderFilter}`
      sourceParts.push({ id: fullLabel, label: fullLabel, fullLabel, isTruncated: false })
    }
    if (auditLabelFilter !== 'all') {
      const fullLabel = `label=${auditLabelFilter}`
      sourceParts.push({ id: fullLabel, label: fullLabel, fullLabel, isTruncated: false })
    }
    if (auditActionFilter !== 'all') {
      const fullLabel = `action=${auditActionFilter}`
      sourceParts.push({ id: fullLabel, label: fullLabel, fullLabel, isTruncated: false })
    }
    if (auditEventTypeFilter.trim()) {
      const fullLabel = `event_type=${auditEventTypeFilter.trim()}`
      const maxEventTypeChipLength = 44
      const isTruncated = fullLabel.length > maxEventTypeChipLength
      const label = isTruncated
        ? `${fullLabel.slice(0, maxEventTypeChipLength - 1)}…`
        : fullLabel
      sourceParts.push({ id: fullLabel, label, fullLabel, isTruncated })
    }

    return sourceParts
  }, [auditActionFilter, auditEventTypeFilter, auditLabelFilter, auditProviderFilter])

  const auditApiSourceFiltersAriaLabel = useMemo(() => {
    if (auditApiSourceFilterParts.length === 0) {
      return ''
    }

    const fullLabels = auditApiSourceFilterParts.map((part) => part.fullLabel).join(', ')
    return `API source filters applied by backend audit endpoint: ${fullLabels}.`
  }, [auditApiSourceFilterParts])

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

  useEffect(() => {
    filteredChildThreadsRef.current = filteredChildThreads
    visibleThreadIdsRef.current = visibleThreadIds
  }, [filteredChildThreads, visibleThreadIds])

  const selectedVisibleThreadIndex = visibleThreadIds.findIndex((threadId) => threadId === selectedThreadId)
  const selectedVisibleThreadHiddenByFilter = isSelectedVisibleThreadHiddenByFilter(
    selectedVisibleThreadIndex,
    selectedThreadId,
    showRootThreadInList,
  )
  const selectedVisibleThreadLabel =
    selectedVisibleThreadIndex >= 0
      ? visibleThreadIds[selectedVisibleThreadIndex] === null
        ? 'Root'
        : visibleThreadIds[selectedVisibleThreadIndex]
      : selectedVisibleThreadHiddenByFilter
        ? `${selectedThreadId === null ? 'Root' : selectedThreadId} (hidden by current filters)`
        : 'none'
  const selectedVisibleThreadPositionLabel = getSelectedVisibleThreadPositionLabel(
    selectedVisibleThreadHiddenByFilter,
    selectedVisibleThreadIndex,
    visibleThreadIds.length,
  )
  const selectedVisibleThreadPositionTitle = getSelectedVisibleThreadPositionTitle(
    selectedVisibleThreadHiddenByFilter,
  )
  const selectedVisibleThreadFirstRecoveryButtonTitle =
    getSelectedVisibleThreadBoundaryRecoveryButtonTitle(selectedVisibleThreadHiddenByFilter, 'first')
  const selectedVisibleThreadLastRecoveryButtonTitle =
    getSelectedVisibleThreadBoundaryRecoveryButtonTitle(selectedVisibleThreadHiddenByFilter, 'last')
  const selectedVisibleThreadRecoveryHint = getSelectedVisibleThreadButtonRecoveryHint(
    selectedVisibleThreadHiddenByFilter,
    selectedVisibleThreadPositionLabel,
  )
  const selectedVisibleThreadShortcutRecoveryHint = getSelectedVisibleThreadShortcutRecoveryHint(
    selectedVisibleThreadHiddenByFilter,
    selectedVisibleThreadPositionLabel,
  )
  const selectedVisibleThreadInlineRecoveryHint = getSelectedVisibleThreadInlineRecoveryHint(
    selectedVisibleThreadHiddenByFilter,
    selectedVisibleThreadPositionLabel,
  )
  const selectedVisibleThreadFirstRecoveryShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource('J', 'boundary jump', 'thread-jump'),
    [],
  )
  const selectedVisibleThreadLastRecoveryShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource('K', 'boundary jump', 'thread-jump'),
    [],
  )
  const selectedVisibleThreadRecoveryDirectionChipPresentations = useMemo(
    () => [
      {
        ...getBoundaryDirectionChipPresentation('first'),
        context: 'thread-jump' as const,
      },
      {
        ...getBoundaryDirectionChipPresentation('last'),
        context: 'thread-jump' as const,
      },
    ],
    [],
  )
  const selectedVisibleThreadInlineRecoveryShortcutChipPresentations = useMemo(
    () => [
      selectedVisibleThreadFirstRecoveryShortcutChipPresentation,
      selectedVisibleThreadLastRecoveryShortcutChipPresentation,
      getShortcutChipPropsFromSource('ArrowUp', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('ArrowDown', 'boundary jump', 'thread-jump'),
    ],
    [selectedVisibleThreadFirstRecoveryShortcutChipPresentation, selectedVisibleThreadLastRecoveryShortcutChipPresentation],
  )
  const selectedVisibleThreadInlineRecoveryChipPresentations = useMemo(
    () => [
      ...selectedVisibleThreadInlineRecoveryShortcutChipPresentations,
      ...selectedVisibleThreadRecoveryDirectionChipPresentations,
    ],
    [
      selectedVisibleThreadInlineRecoveryShortcutChipPresentations,
      selectedVisibleThreadRecoveryDirectionChipPresentations,
    ],
  )
  const selectedVisibleThreadInlineRecoveryAriaLabel = useMemo(
    () =>
      getStatusAriaLabelWithShortcutChips(
        selectedVisibleThreadInlineRecoveryHint,
        selectedVisibleThreadInlineRecoveryChipPresentations,
      ),
    [selectedVisibleThreadInlineRecoveryHint, selectedVisibleThreadInlineRecoveryChipPresentations],
  )
  const selectedVisibleThreadShortcutRecoveryStatusAriaLabel = useMemo(
    () =>
      getStatusAriaLabelWithShortcutChips(
        selectedVisibleThreadShortcutRecoveryHint,
        selectedVisibleThreadInlineRecoveryChipPresentations,
      ),
    [selectedVisibleThreadInlineRecoveryChipPresentations, selectedVisibleThreadShortcutRecoveryHint],
  )

  const boundaryJumpSourceShortcut = useMemo(
    () => getHintShortcutSource(threadBoundaryJumpHint),
    [threadBoundaryJumpHint]
  )

  const boundaryJumpUsesShiftPageShortcut =
    boundaryJumpSourceShortcut === 'Shift+PageUp' || boundaryJumpSourceShortcut === 'Shift+PageDown'

  const boundaryJumpShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource(boundaryJumpSourceShortcut, 'boundary jump', 'thread-jump'),
    [boundaryJumpSourceShortcut],
  )

  const boundaryJumpDirectionChipPresentation = useMemo(() => {
    const directionChipPresentation = getBoundaryDirectionChipPresentationFromHint(threadBoundaryJumpHint)
    if (!directionChipPresentation) {
      return null
    }

    return {
      ...directionChipPresentation,
      context: 'thread-jump' as const,
    }
  }, [threadBoundaryJumpHint])

  const boundaryJumpStatusAriaLabel = useMemo(() => {
    const composedAriaLabel = getStatusAriaLabelWithShortcutChips(threadBoundaryJumpHint, [
      boundaryJumpShortcutChipPresentation,
      boundaryJumpDirectionChipPresentation,
    ])

    return getUnreadBoundaryJumpStatusAriaLabel(
      composedAriaLabel,
      boundaryJumpSourceShortcut,
      unreadNavigationWrapCue,
    )
  }, [
    boundaryJumpDirectionChipPresentation,
    boundaryJumpShortcutChipPresentation,
    boundaryJumpSourceShortcut,
    threadBoundaryJumpHint,
    unreadNavigationWrapCue,
  ])

  const rootJumpSourceShortcut = useMemo(() => getHintShortcutSource(threadRootJumpHint), [threadRootJumpHint])

  const rootJumpShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource(rootJumpSourceShortcut, 'root jump', 'thread-jump'),
    [rootJumpSourceShortcut],
  )

  const rootJumpStatusAriaLabel = useMemo(
    () => getStatusAriaLabelWithShortcutChip(threadRootJumpHint, rootJumpShortcutChipPresentation),
    [rootJumpShortcutChipPresentation, threadRootJumpHint],
  )

  const filterJumpSourceShortcut = useMemo(
    () => getHintShortcutSource(threadFilterJumpHint),
    [threadFilterJumpHint],
  )

  const filterJumpShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource(filterJumpSourceShortcut, 'filter jump', 'filter-jump'),
    [filterJumpSourceShortcut],
  )

  const threadCopyShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromHint(threadCopyHint, 'thread copy', 'thread-jump'),
    [threadCopyHint],
  )

  const threadCopyStatusAriaLabel = useMemo(
    () => getStatusAriaLabelWithShortcutChip(threadCopyHint, threadCopyShortcutChipPresentation),
    [threadCopyHint, threadCopyShortcutChipPresentation],
  )

  const threadShortcutLegendToggleShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromHint(threadShortcutLegendToggleHint, 'filter jump', 'thread-jump'),
    [threadShortcutLegendToggleHint],
  )

  const threadShortcutLegendToggleStatusAriaLabel = useMemo(
    () =>
      getStatusAriaLabelWithShortcutChip(
        threadShortcutLegendToggleHint,
        threadShortcutLegendToggleShortcutChipPresentation,
      ),
    [threadShortcutLegendToggleHint, threadShortcutLegendToggleShortcutChipPresentation],
  )

  const composerHintShortcutChipPresentations = useMemo(
    () => [
      getShortcutChipPropsFromSource('Enter', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('Shift+Enter', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('Escape', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('C', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('R', 'root jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+Home', 'root jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+R', 'root jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+PageUp', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+PageDown', 'boundary jump', 'thread-jump'),
    ].filter((chip): chip is ShortcutChipProps => chip !== null),
    [],
  )

  const threadFilterHintShortcutChipPresentations = useMemo(
    () => [
      getShortcutChipPropsFromSource('Slash', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('Enter', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('Shift+Enter', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('Escape', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('Shift+Escape', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('Shift+I', 'filter jump', 'filter-jump'),
      getShortcutChipPropsFromSource('J', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('K', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('ArrowUp', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('ArrowDown', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Home', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('End', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('PageUp', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('PageDown', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('G', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+G', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+PageUp', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+PageDown', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Shift+End', 'boundary jump', 'thread-jump'),
      getShortcutChipPropsFromSource('Y', 'thread copy', 'thread-jump'),
    ].filter((chip): chip is ShortcutChipProps => chip !== null),
    [],
  )

  const filterJumpStatusAriaLabel = useMemo(
    () => getStatusAriaLabelWithShortcutChip(threadFilterJumpHint, filterJumpShortcutChipPresentation),
    [threadFilterJumpHint, filterJumpShortcutChipPresentation],
  )

  const rootJumpHintHelp = useMemo(() => {
    if (!threadRootJumpHint) {
      return null
    }

    const rootShortcutSourceHelp =
      rootJumpSourceShortcut === 'Shift+Home' ||
      rootJumpSourceShortcut === 'Shift+R' ||
      rootJumpSourceShortcut === 'R'
        ? rootJumpSourceShortcut === 'R'
          ? 'R jumps directly to root context while preserving active filters.'
          : `${rootJumpSourceShortcut} keeps active filters while jumping to root context.`
        : null

    const rootDirectionHelp =
      rootJumpSourceShortcut === 'Shift+Home'
        ? 'Direction: hard jump to Root thread.'
        : rootJumpSourceShortcut === 'Shift+R' || rootJumpSourceShortcut === 'R'
          ? 'Direction: root context recall.'
          : null

    const rootHelpSuffix = [rootShortcutSourceHelp, rootDirectionHelp].filter(Boolean).join(' ')

    if (threadRootJumpHint.startsWith('Jumped to root thread')) {
      return `Jumped to root = switched focus to Root thread context.${
        rootHelpSuffix ? ` ${rootHelpSuffix}` : ''
      }`
    }

    if (threadRootJumpHint.startsWith('Already at root thread')) {
      return `Already at root = no-op confirmation (selection did not move).${
        rootHelpSuffix ? ` ${rootHelpSuffix}` : ''
      }`
    }

    return null
  }, [rootJumpSourceShortcut, threadRootJumpHint])

  const firstVisibleJumpHintHelp = useMemo(() => {
    if (!threadBoundaryJumpHint) {
      return null
    }

    const sourceShortcutHelp =
      boundaryJumpUsesShiftPageShortcut && boundaryJumpSourceShortcut
        ? `${boundaryJumpSourceShortcut} keeps active filters while jumping to boundary.`
        : null

    const boundaryDirection = getBoundaryDirectionFromHint(threadBoundaryJumpHint)
    const boundaryDirectionHelp =
      boundaryDirection === 'first'
        ? 'Direction: toward first visible.'
        : boundaryDirection === 'last'
          ? 'Direction: toward last visible.'
          : null

    const boundaryJumpHelpSuffix = [sourceShortcutHelp, boundaryDirectionHelp].filter(Boolean).join(' ')

    if (threadBoundaryJumpHint.startsWith('Recovered to first visible thread')) {
      return `Recovered = hidden selection was restored to the first visible result.${
        boundaryJumpHelpSuffix ? ` ${boundaryJumpHelpSuffix}` : ''
      }`
    }
    if (threadBoundaryJumpHint.startsWith('Recovered to last visible thread')) {
      return `Recovered = hidden selection was restored to the last visible result.${
        boundaryJumpHelpSuffix ? ` ${boundaryJumpHelpSuffix}` : ''
      }`
    }
    if (threadBoundaryJumpHint.startsWith('Already at first visible thread')) {
      return `Already at first = no-op confirmation (selection did not move).${
        boundaryJumpHelpSuffix ? ` ${boundaryJumpHelpSuffix}` : ''
      }`
    }
    if (threadBoundaryJumpHint.startsWith('Already at last visible thread')) {
      return `Already at last = no-op confirmation (selection did not move).${
        boundaryJumpHelpSuffix ? ` ${boundaryJumpHelpSuffix}` : ''
      }`
    }
    if (threadBoundaryJumpHint.startsWith('Jumped to first visible thread')) {
      return `Jumped to first = normal boundary jump to the first visible result.${
        boundaryJumpHelpSuffix ? ` ${boundaryJumpHelpSuffix}` : ''
      }`
    }
    if (threadBoundaryJumpHint.startsWith('Jumped to last visible thread')) {
      return `Jumped to last = normal boundary jump to the last visible result.${
        boundaryJumpHelpSuffix ? ` ${boundaryJumpHelpSuffix}` : ''
      }`
    }
    return null
  }, [boundaryJumpSourceShortcut, boundaryJumpUsesShiftPageShortcut, threadBoundaryJumpHint])

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

  const resetThreadViewFilters = useCallback((source: 'button' | 'shortcut' = 'button') => {
    setThreadFilterText('')
    setShowUnreadOnlyThreads(false)
    setIncludeRootInUnreadOnly(true)
    setThreadFilterJumpHint(getThreadFilterResetHint(source))
  }, [])

  useEffect(() => {
    setThreadFilterJumpHint((current) => {
      if (!current) {
        return null
      }

      const isResetHint = current.includes('(Shift+Esc)')
      const isDefaultThreadViewState =
        threadFilterText.trim().length === 0 && !showUnreadOnlyThreads && includeRootInUnreadOnly

      if (isResetHint && isDefaultThreadViewState) {
        return current
      }

      return null
    })
  }, [includeRootInUnreadOnly, showUnreadOnlyThreads, threadFilterText])

  useEffect(() => {
    if (!threadRootJumpHint) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setThreadRootJumpHint(null)
    }, 1500)
    return () => window.clearTimeout(timeoutId)
  }, [threadRootJumpHint])

  useEffect(() => {
    if (!threadBoundaryJumpHint) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setThreadBoundaryJumpHint(null)
    }, 1500)
    return () => window.clearTimeout(timeoutId)
  }, [threadBoundaryJumpHint])

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
    if (!threadShortcutLegendToggleHint) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setThreadShortcutLegendToggleHint(null)
    }, 1500)
    return () => window.clearTimeout(timeoutId)
  }, [threadShortcutLegendToggleHint])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (event.key.toLowerCase() !== 'y') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      event.preventDefault()
      void copySelectedThreadLabel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [copySelectedThreadLabel])

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
      resetThreadViewFilters('shortcut')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasThreadViewFiltersActive, resetThreadViewFilters])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const dispatchOutcome = getThreadShortcutLegendKeyboardDispatchOutcome({
        isVisible: showThreadShortcutLegend,
        key: event.key,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        defaultPrevented: event.defaultPrevented,
        repeat: event.repeat,
        isEditableTarget: isEditableElement(event.target),
        isComposing: event.isComposing,
      })

      if (!dispatchOutcome.handled) {
        return
      }

      event.preventDefault()
      setShowThreadShortcutLegend(dispatchOutcome.nextVisibility)
      setThreadShortcutLegendToggleHint(dispatchOutcome.statusHint)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showThreadShortcutLegend])

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (event.key.toLowerCase() !== 'c') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      event.preventDefault()
      composerBodyRef.current?.focus()
      composerBodyRef.current?.setSelectionRange(composerBody.length, composerBody.length)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [composerBody.length])

  const unreadThreadIds = useMemo(() => {
    return threads
      .filter((thread) => unseenThreadKeys.includes(toThreadKey(thread.thread_id)))
      .map((thread) => thread.thread_id)
  }, [threads, unseenThreadKeys])

  const unreadNavigationNextShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource('U', 'boundary jump', 'thread-jump'),
    [],
  )

  const unreadNavigationNextAltShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource('N', 'boundary jump', 'thread-jump'),
    [],
  )

  const unreadNavigationPreviousShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource('P', 'boundary jump', 'thread-jump'),
    [],
  )

  const unreadNavigationClearShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource('Shift+U', 'boundary jump', 'thread-jump'),
    [],
  )

  const unreadNavigationToFirstDirectionChipPresentation = useMemo(
    () => ({ ...getBoundaryDirectionChipPresentation('first'), context: 'thread-jump' as const }),
    [],
  )

  const unreadNavigationToLastDirectionChipPresentation = useMemo(
    () => ({ ...getBoundaryDirectionChipPresentation('last'), context: 'thread-jump' as const }),
    [],
  )

  const unreadNavigationDirectionCueCopy =
    `${unreadNavigationToFirstDirectionChipPresentation.badge} / ${unreadNavigationToLastDirectionChipPresentation.badge}`

  const unreadNavigationClearControlCopy = unreadNavigationClearShortcutChipPresentation
    ? `${unreadNavigationClearShortcutChipPresentation.badge} clear`
    : 'Shift+U clear'
  const unreadNavigationUndoClearShortcutChipPresentation = useMemo(
    () => getShortcutChipPropsFromSource('Z', 'boundary jump', 'thread-jump'),
    [],
  )
  const unreadNavigationUndoClearControlCopy = unreadNavigationUndoClearShortcutChipPresentation
    ? `${unreadNavigationUndoClearShortcutChipPresentation.badge} undo clear`
    : 'Z undo clear'
  const unreadNavigationNextControlCopy =
    unreadNavigationNextShortcutChipPresentation && unreadNavigationNextAltShortcutChipPresentation
      ? `${unreadNavigationNextShortcutChipPresentation.badge}/${unreadNavigationNextAltShortcutChipPresentation.badge} next`
      : 'U/N next'
  const unreadNavigationPreviousControlCopy = unreadNavigationPreviousShortcutChipPresentation
    ? `${unreadNavigationPreviousShortcutChipPresentation.badge} previous`
    : 'P previous'
  const unreadNavigationPreviousControlAriaLabel =
    `Jump to previous unread thread · ${unreadNavigationPreviousControlCopy}`
  const unreadNavigationNextControlAriaLabel =
    `Jump to next unread thread · ${unreadNavigationNextControlCopy}`
  const unreadNavigationClearControlAriaLabel =
    `Clear all unread thread markers · ${unreadNavigationClearControlCopy}`
  const unreadNavigationUndoControlAriaLabel =
    `Undo clear unread markers · ${unreadNavigationUndoClearControlCopy}`

  const unreadNavigationHint =
    unreadThreadIds.length > 0
      ? `Unread threads: ${unreadThreadIds.length} • ${unreadNavigationNextControlCopy} • ${unreadNavigationPreviousControlCopy} • ${unreadNavigationDirectionCueCopy} • ${unreadNavigationClearControlCopy}${unreadClearUndoSnapshot ? ` • ${unreadNavigationUndoClearControlCopy}` : ''}${unreadNavigationWrapCue ? ` • ${unreadNavigationWrapCue}` : ''}`
      : 'No unread threads right now. Jump/clear controls enable when new activity arrives.'

  const unreadNavigationHintAriaLabel = useMemo(() => {
    const shortcutComposedAriaLabel = getStatusAriaLabelWithShortcutChips(unreadNavigationHint, [
      unreadNavigationNextShortcutChipPresentation,
      unreadNavigationNextAltShortcutChipPresentation,
      unreadNavigationPreviousShortcutChipPresentation,
      unreadNavigationToFirstDirectionChipPresentation,
      unreadNavigationToLastDirectionChipPresentation,
      unreadNavigationClearShortcutChipPresentation,
      unreadNavigationUndoClearShortcutChipPresentation,
    ])

    const navigationWrapCueAria = getUnreadNavigationWrapCueForAria(
      unreadNavigationWrapCue,
      threadBoundaryJumpHint,
      boundaryJumpSourceShortcut,
      boundaryJumpStatusAriaLabel,
    )

    return getUnreadNavigationHintAriaLabel(shortcutComposedAriaLabel, navigationWrapCueAria)
  }, [
    boundaryJumpSourceShortcut,
    boundaryJumpStatusAriaLabel,
    threadBoundaryJumpHint,
    unreadNavigationClearShortcutChipPresentation,
    unreadNavigationHint,
    unreadNavigationNextAltShortcutChipPresentation,
    unreadNavigationNextShortcutChipPresentation,
    unreadNavigationPreviousShortcutChipPresentation,
    unreadNavigationToFirstDirectionChipPresentation,
    unreadNavigationToLastDirectionChipPresentation,
    unreadNavigationUndoClearShortcutChipPresentation,
    unreadNavigationWrapCue,
  ])

  useEffect(() => {
    if (unreadThreadIds.length > 0) {
      return
    }
    setUnreadNavigationWrapCue(null)
  }, [unreadThreadIds.length])

  const jumpUnreadByStep = useCallback(
    (step: 1 | -1, sourceKey: 'U' | 'N' | 'P') => {
      if (!unreadThreadIds.length) {
        return
      }
      const currentIndex = unreadThreadIds.findIndex((threadId) => threadId === selectedThreadId)
      const fallbackIndex = step > 0 ? 0 : unreadThreadIds.length - 1
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + step + unreadThreadIds.length) % unreadThreadIds.length
          : fallbackIndex
      const targetThreadId = unreadThreadIds[nextIndex]
      selectThread(targetThreadId)

      const directionLabel = step > 0 ? 'next' : 'previous'
      const targetLabel = targetThreadId === null ? 'Root' : targetThreadId
      const boundaryDirection = step > 0 ? 'first' : 'last'
      const wrapCue = getUnreadJumpWrapStatusCue(step, currentIndex, nextIndex)
      setUnreadNavigationWrapCue(wrapCue)
      setThreadBoundaryJumpHint(
        `Jumped to ${directionLabel} unread thread (${sourceKey}) · ${targetLabel} · ${nextIndex + 1}/${unreadThreadIds.length}${wrapCue ? ` · ${wrapCue}` : ''} · ${getBoundaryDirectionStatusCue(boundaryDirection)}.`
      )
    },
    [unreadThreadIds, selectedThreadId, selectThread],
  )

  const jumpToNextUnread = useCallback(() => {
    jumpUnreadByStep(1, 'U')
  }, [jumpUnreadByStep])

  const moveVisibleThreadSelection = useCallback(
    (step: 1 | -1, sourceKey: 'J' | 'K' | 'ArrowDown' | 'ArrowUp') => {
      if (!visibleThreadIds.length) {
        return
      }
      const currentIndex = selectedVisibleThreadIndex
      const fallbackIndex = step > 0 ? 0 : visibleThreadIds.length - 1
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + step + visibleThreadIds.length) % visibleThreadIds.length
          : fallbackIndex
      const targetThreadId = visibleThreadIds[nextIndex]
      const alreadyAtTarget = selectedThreadId === targetThreadId
      const recoveredFromHiddenSelection = currentIndex < 0
      selectThread(targetThreadId)
      const directionLabel = step > 0 ? 'next' : 'previous'
      const targetLabel = targetThreadId === null ? 'Root' : targetThreadId
      const positionHint = `${nextIndex + 1}/${visibleThreadIds.length}`
      setThreadBoundaryJumpHint(
        alreadyAtTarget
          ? `Already at only visible thread (${sourceKey} confirmed) · ${targetLabel} · ${positionHint}.`
          : recoveredFromHiddenSelection
            ? `Recovered hidden selection (${sourceKey}) · ${targetLabel} · ${positionHint} · ${getBoundaryDirectionStatusCue(step > 0 ? 'first' : 'last')}.`
            : `Moved to ${directionLabel} visible thread (${sourceKey}) · ${targetLabel} · ${positionHint}.`
      )
    },
    [selectThread, selectedThreadId, selectedVisibleThreadIndex, visibleThreadIds]
  )

  const jumpToVisibleThreadBoundary = useCallback(
    (
      boundary: 'first' | 'last',
      sourceKey:
        | 'Home'
        | 'End'
        | 'PageUp'
        | 'PageDown'
        | 'Shift+Home'
        | 'Shift+PageUp'
        | 'Shift+End'
        | 'Shift+PageDown'
        | 'G'
        | 'Shift+G'
    ) => {
      if (!visibleThreadIds.length) {
        return
      }
      const targetIndex = boundary === 'first' ? 0 : visibleThreadIds.length - 1
      const targetThreadId = visibleThreadIds[targetIndex]
      const alreadyAtBoundary = selectedThreadId === targetThreadId
      const recoveredFromHiddenSelection = selectedVisibleThreadIndex < 0
      selectThread(targetThreadId)
      const boundaryLabel = boundary === 'first' ? 'first' : 'last'
      const targetLabel = targetThreadId === null ? 'Root' : targetThreadId
      const positionHint = `${targetIndex + 1}/${visibleThreadIds.length}`
      setThreadBoundaryJumpHint(
        alreadyAtBoundary
          ? `Already at ${boundaryLabel} visible thread (${sourceKey} confirmed) · ${targetLabel} · ${positionHint}.`
          : recoveredFromHiddenSelection
            ? `Recovered to ${boundaryLabel} visible thread (${sourceKey}) · ${targetLabel} · ${positionHint} · ${getBoundaryDirectionStatusCue(boundary)}.`
            : `Jumped to ${boundaryLabel} visible thread (${sourceKey}) · ${targetLabel} · ${positionHint}.`
      )
    },
    [selectThread, selectedThreadId, selectedVisibleThreadIndex, visibleThreadIds]
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
      const key = event.key.toLowerCase()
      if (key !== 'u' && key !== 'n' && key !== 'p') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      if (!unreadThreadIds.length) {
        return
      }
      event.preventDefault()
      if (key === 'p') {
        jumpUnreadByStep(-1, 'P')
        return
      }
      jumpUnreadByStep(1, key === 'n' ? 'N' : 'U')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpUnreadByStep, unreadThreadIds.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (event.key.toLowerCase() !== 'r') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      event.preventDefault()
      jumpToRootThreadContext('R')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpToRootThreadContext])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return
      }
      const rootShortcutSource =
        event.key === 'Home' ? 'Shift+Home' : event.key.toLowerCase() === 'r' ? 'Shift+R' : null
      if (!rootShortcutSource) {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      event.preventDefault()
      jumpToRootThreadContext(rootShortcutSource)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpToRootThreadContext])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return
      }
      const isShiftBoundaryShortcut =
        event.key === 'Home' || event.key === 'PageUp' || event.key === 'End' || event.key === 'PageDown'
      if (!isShiftBoundaryShortcut) {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      if (!visibleThreadIds.length) {
        return
      }
      event.preventDefault()
      if (event.key === 'Home' || event.key === 'PageUp') {
        jumpToVisibleThreadBoundary('first', event.key === 'PageUp' ? 'Shift+PageUp' : 'Shift+Home')
        return
      }
      jumpToVisibleThreadBoundary('last', event.key === 'PageDown' ? 'Shift+PageDown' : 'Shift+End')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpToVisibleThreadBoundary, visibleThreadIds.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      if (!visibleThreadIds.length) {
        return
      }

      const lowered = event.key.toLowerCase()
      const isShiftG = event.shiftKey && lowered === 'g'
      const isPlainG = !event.shiftKey && lowered === 'g'
      if (!isShiftG && !isPlainG) {
        return
      }

      event.preventDefault()
      if (isShiftG) {
        jumpToVisibleThreadBoundary('last', 'Shift+G')
        return
      }
      jumpToVisibleThreadBoundary('first', 'G')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpToVisibleThreadBoundary, visibleThreadIds.length])

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
        jumpToVisibleThreadBoundary('first', 'Home')
        return
      }
      if (event.key === 'End') {
        jumpToVisibleThreadBoundary('last', 'End')
        return
      }
      if (event.key === 'PageDown') {
        jumpToVisibleThreadBoundary('last', 'PageDown')
        return
      }
      if (event.key === 'PageUp') {
        jumpToVisibleThreadBoundary('first', 'PageUp')
        return
      }
      const isForwardStep = lowered === 'j' || event.key === 'ArrowDown'
      const step = isForwardStep ? 1 : -1
      const sourceKey: 'J' | 'K' | 'ArrowDown' | 'ArrowUp' =
        lowered === 'j' ? 'J' : lowered === 'k' ? 'K' : event.key === 'ArrowDown' ? 'ArrowDown' : 'ArrowUp'
      moveVisibleThreadSelection(step, sourceKey)
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
    const unreadClearShortcutBadge = unreadNavigationClearShortcutChipPresentation?.badge ?? 'Shift+U'
    setThreadBoundaryJumpHint(
      `Cleared unread markers (${unreadClearShortcutBadge}) · ${unreadThreadIds.length} thread(s).`,
    )
  }, [
    lastSeenByThread,
    lastSeenCountByThread,
    threads,
    unreadNavigationClearShortcutChipPresentation,
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
    setThreadBoundaryJumpHint(getUnreadClearUndoStatusHint(unreadClearUndoSnapshot.clearedCount))
    setUnreadClearUndoSnapshot(null)
  }, [unreadClearUndoSnapshot])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (event.key.toLowerCase() !== 'z') {
        return
      }
      if (isEditableElement(event.target)) {
        return
      }
      if (!unreadClearUndoSnapshot) {
        return
      }
      event.preventDefault()
      undoClearAllUnreadMarkers()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undoClearAllUnreadMarkers, unreadClearUndoSnapshot])

  useEffect(() => {
    if (!unreadClearUndoSnapshot) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setUnreadClearUndoSnapshot(null)
    }, 10_000)

    return () => window.clearTimeout(timeoutId)
  }, [unreadClearUndoSnapshot])

  const threadShortcutLegendPresentation = useMemo(
    () => getThreadShortcutLegendPresentation(showThreadShortcutLegend),
    [showThreadShortcutLegend],
  )
  const threadShortcutLegendRegionPresentation = useMemo(
    () => getThreadShortcutLegendRegionPresentation(showThreadShortcutLegend),
    [showThreadShortcutLegend],
  )

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
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: '100%', overflowX: 'hidden' }}>
      <h2>Agent Chat Control Tower</h2>
      <p>Port 50004 / Stack: React+TS+Vite + FastAPI + Postgres + Redis + Nginx</p>

      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          padding: '10px 0',
          background: 'rgba(2, 6, 23, 0.92)',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
          marginBottom: 12,
        }}
      >
        <a href="#overview" style={{ textDecoration: 'none' }}>
          <button type="button">Overview</button>
        </a>
        <a href="#chat" style={{ textDecoration: 'none' }}>
          <button type="button">Chat</button>
        </a>
        <a href="#credentials" style={{ textDecoration: 'none' }}>
          <button type="button">Credentials</button>
        </a>
        <a href="#audit" style={{ textDecoration: 'none' }}>
          <button type="button">Audit</button>
        </a>
        <a href="/workflow-console.html" style={{ textDecoration: 'none' }}>
          <button type="button">Workflow</button>
        </a>
      </div>

      <h3 id="overview">Organization Graph</h3>
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

      <h3 id="chat">Chat Thread Explorer</h3>
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
          {composerHintShortcutChipPresentations.map((chip) => renderShortcutChipPresentation(chip))}
          send/newline/root/focus/root jump/first-last visible helpers
        </small>
        <button type="button" onClick={() => void submitMessage()} disabled={composerSubmitting}>
          {composerSubmitting ? 'Sending…' : selectedThreadId ? 'Reply to thread' : 'Send root message'}
        </button>
        {selectedThreadId && (
          <button type="button" onClick={exitThreadContext} title="Return composer context to root thread">
            Return to root context
          </button>
        )}
        <button
          type="button"
          onClick={() => jumpToRootThreadContext('button')}
          title="R or Shift+Home (or Shift+R) · Root hints show 1/N where N is currently visible filtered threads"
          aria-keyshortcuts="R Shift+Home Shift+R"
        >
          Jump root (R/⇧Home/⇧R)
        </button>
        <button
          type="button"
          onClick={() => jumpUnreadByStep(-1, 'P')}
          disabled={unreadThreadIds.length === 0}
          title={unreadNavigationPreviousControlCopy}
          aria-label={unreadNavigationPreviousControlAriaLabel}
          aria-keyshortcuts="P"
        >
          Prev unread
        </button>
        <button
          type="button"
          onClick={jumpToNextUnread}
          disabled={unreadThreadIds.length === 0}
          title={unreadNavigationNextControlCopy}
          aria-label={unreadNavigationNextControlAriaLabel}
          aria-keyshortcuts="U N"
        >
          Next unread
        </button>
        <button
          type="button"
          onClick={clearAllUnreadMarkers}
          disabled={unreadThreadIds.length === 0}
          title={unreadNavigationClearControlCopy}
          aria-label={unreadNavigationClearControlAriaLabel}
          aria-keyshortcuts="Shift+U"
        >
          Clear all unread markers
        </button>
        {unreadClearUndoSnapshot && (
          <small style={{ color: '#555', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            Cleared {unreadClearUndoSnapshot.clearedCount} unread marker
            {unreadClearUndoSnapshot.clearedCount === 1 ? '' : 's'}.
            <button
              type="button"
              onClick={undoClearAllUnreadMarkers}
              title={unreadNavigationUndoClearControlCopy}
              aria-label={unreadNavigationUndoControlAriaLabel}
              aria-keyshortcuts="Z"
            >
              Undo
            </button>
          </small>
        )}
        <small
          aria-label={unreadNavigationHintAriaLabel}
          style={{ color: unreadThreadIds.length > 0 ? '#555' : '#777' }}
        >
          {unreadThreadIds.length > 0 && (
            <>
              {renderShortcutChipPresentation(unreadNavigationNextShortcutChipPresentation)}
              {renderShortcutChipPresentation(unreadNavigationNextAltShortcutChipPresentation)}
              {renderShortcutChipPresentation(unreadNavigationPreviousShortcutChipPresentation)}
              {renderShortcutChipPresentation(unreadNavigationToFirstDirectionChipPresentation)}
              {renderShortcutChipPresentation(unreadNavigationToLastDirectionChipPresentation)}
              {renderShortcutChipPresentation(unreadNavigationClearShortcutChipPresentation)}
              {unreadClearUndoSnapshot &&
                renderShortcutChipPresentation(unreadNavigationUndoClearShortcutChipPresentation)}
            </>
          )}
          {unreadNavigationHint}
        </small>
      </div>

      {chatError && <p style={{ color: 'crimson' }}>Error: {chatError}</p>}

      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
              onClick={() => resetThreadViewFilters('button')}
              disabled={!hasThreadViewFiltersActive}
              title="Reset thread filter + unread toggles (Shift+Esc)"
            >
              Reset view
            </button>
            <button
              type="button"
              onClick={() =>
                setShowThreadShortcutLegend((current) => {
                  const nextVisibility = !current
                  setThreadShortcutLegendToggleHint(getThreadShortcutLegendPresentation(nextVisibility).statusHint)
                  return nextVisibility
                })
              }
              title={
                showThreadShortcutLegend
                  ? `Hide thread shortcut legend (${threadShortcutLegendPresentation.dismissControlCopy})`
                  : `Show thread shortcut legend (${threadShortcutLegendPresentation.toggleControlCopy})`
              }
              aria-label={
                showThreadShortcutLegend
                  ? `Hide thread shortcut legend (${threadShortcutLegendPresentation.dismissControlCopy})`
                  : `Show thread shortcut legend (${threadShortcutLegendPresentation.toggleControlCopy})`
              }
              aria-keyshortcuts={threadShortcutLegendPresentation.buttonAriaKeyshortcuts}
              aria-expanded={threadShortcutLegendPresentation.ariaExpanded}
              aria-controls="thread-shortcut-legend"
            >
              {showThreadShortcutLegend ? 'Hide shortcuts' : 'Show shortcuts'}
            </button>
            <small id="thread-filter-hint" style={{ color: '#666' }}>
              {threadFilterHintShortcutChipPresentations.map((chip) => renderShortcutChipPresentation(chip))}
              focus/jump/reset shortcuts · Shift+U toggles unread-only · Shift+I toggles include-root for unread-only · Enter/Shift+Enter jump first/last visible result · Home/End/PgUp/PgDn jump boundaries (Shift+End/Shift+PgDn hard-jump last) · J/K/↑/↓ move selection (recovers hidden selection to first/last visible)
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
            <small style={{ color: '#666' }} title={selectedVisibleThreadPositionTitle}>
              Selection: {selectedVisibleThreadPositionLabel} ({selectedVisibleThreadLabel})
            </small>
            {selectedVisibleThreadInlineRecoveryHint && (
              <small
                aria-live="polite"
                role="status"
                aria-label={selectedVisibleThreadInlineRecoveryAriaLabel}
                style={{ color: '#7a4b00' }}
                title="Hidden selection recovers to boundary on next J/K or Arrow key."
              >
                {selectedVisibleThreadInlineRecoveryChipPresentations.map((chip) => renderShortcutChipPresentation(chip))}
                {selectedVisibleThreadInlineRecoveryHint}
              </small>
            )}
            {selectedVisibleThreadHiddenByFilter && (
              <>
                <button
                  type="button"
                  onClick={() => recoverToFirstVisibleThread('button')}
                  title={selectedVisibleThreadFirstRecoveryButtonTitle}
                >
                  Jump to first visible
                </button>
                <button
                  type="button"
                  onClick={() => recoverToLastVisibleThread('button')}
                  title={selectedVisibleThreadLastRecoveryButtonTitle}
                >
                  Jump to last visible
                </button>
                {selectedVisibleThreadRecoveryHint && (
                  <small style={{ color: '#666' }}>{selectedVisibleThreadRecoveryHint}</small>
                )}
                {selectedVisibleThreadShortcutRecoveryHint && (
                  <small
                    aria-live="polite"
                    role="status"
                    aria-label={selectedVisibleThreadShortcutRecoveryStatusAriaLabel}
                    style={{ color: '#666' }}
                  >
                    {selectedVisibleThreadInlineRecoveryChipPresentations.map((chip) =>
                      renderShortcutChipPresentation(chip),
                    )}
                    {selectedVisibleThreadShortcutRecoveryHint}
                  </small>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => void copySelectedThreadLabel('button')}
              title="Copy selected thread label (Y)"
              aria-keyshortcuts="Y"
            >
              Copy selected
            </button>
            {threadRootJumpHint && (
              <small
                aria-live="polite"
                role="status"
                aria-label={rootJumpStatusAriaLabel}
                title={
                  threadRootJumpHint.includes(' · 1/')
                    ? 'In root hints, N in 1/N is the number of currently visible threads after filters.'
                    : undefined
                }
                style={{ color: '#1f4b99' }}
              >
                {renderShortcutChipPresentation(rootJumpShortcutChipPresentation)}
                {threadRootJumpHint}
              </small>
            )}
            {rootJumpHintHelp && (
              <small style={{ color: '#666' }} title="Helps distinguish root jump vs no-op confirmation.">
                {rootJumpHintHelp}
              </small>
            )}
            {threadBoundaryJumpHint && (
              <small
                aria-live="polite"
                role="status"
                aria-label={boundaryJumpStatusAriaLabel}
                style={{ color: '#1f4b99' }}
              >
                {renderShortcutChipPresentation(boundaryJumpShortcutChipPresentation)}
                {renderShortcutChipPresentation(boundaryJumpDirectionChipPresentation)}
                {threadBoundaryJumpHint}
              </small>
            )}
            {firstVisibleJumpHintHelp && (
              <small style={{ color: '#666' }} title="Helps distinguish no-op confirmation vs hidden-selection recovery.">
                {firstVisibleJumpHintHelp}
              </small>
            )}
            {threadCopyHint && (
              <small
                aria-live="polite"
                role="status"
                aria-label={threadCopyStatusAriaLabel}
                style={{ color: '#666' }}
              >
                {renderShortcutChipPresentation(threadCopyShortcutChipPresentation)}
                {threadCopyHint}
              </small>
            )}
            {threadShortcutLegendToggleHint && (
              <small
                aria-live="polite"
                role="status"
                aria-label={threadShortcutLegendToggleStatusAriaLabel}
                style={{ color: '#1f4b99' }}
              >
                {renderShortcutChipPresentation(threadShortcutLegendToggleShortcutChipPresentation)}
                {threadShortcutLegendToggleHint}
              </small>
            )}
            {unreadRootOnlyHint && <small style={{ color: '#666' }}>{unreadRootOnlyHint}</small>}
            {threadFilterJumpHint && (
              <small
                aria-live="polite"
                role="status"
                aria-label={filterJumpStatusAriaLabel}
                style={{ color: '#666' }}
              >
                {renderShortcutChipPresentation(filterJumpShortcutChipPresentation)}
                {threadFilterJumpHint}
              </small>
            )}
            {threadShortcutLegendRegionPresentation && (
              <small
                id={threadShortcutLegendRegionPresentation.id}
                role={threadShortcutLegendRegionPresentation.role}
                aria-label={threadShortcutLegendRegionPresentation.ariaLabel}
                aria-keyshortcuts={threadShortcutLegendRegionPresentation.ariaKeyshortcuts}
                style={{ color: '#444', display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
              >
                <strong>Thread shortcuts:</strong>
                J/K or ↑/↓ move · Home/End/PgUp/PgDn jump · Shift+End/Shift+PgDn hard-jump last ·
                U/N next unread · P previous unread · Shift+U clear unread · Z undo clear ·
                R/Shift+Home jump root · / focus filter ·
                C focus composer · Y copy selected · Esc close legend
              </small>
            )}
          </div>
          {threadLoading && <p>Loading threads…</p>}
          {!threadLoading && (
            <ul>
              {showRootThreadInList && (
                <li>
                  <button
                    type="button"
                    onClick={() => selectThread(null)}
                    aria-current={getThreadSelectionButtonAriaCurrent(selectedThreadId, null)}
                    style={{
                      fontWeight: selectedThreadId === null ? 700 : 400,
                      cursor: 'pointer',
                      maxWidth: 'min(90vw, 420px)',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      textAlign: 'left',
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
                    aria-current={getThreadSelectionButtonAriaCurrent(selectedThreadId, thread.thread_id)}
                    style={{
                      fontWeight: selectedThreadId === thread.thread_id ? 700 : 400,
                      cursor: 'pointer',
                      maxWidth: 'min(90vw, 420px)',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      textAlign: 'left',
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
                  <li
                    key={message.id}
                    style={{ maxWidth: 'min(92vw, 760px)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
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

      <h3 id="credentials">Credential Token Lifecycle</h3>
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
          onChange={(event) => {
            const raw = event.target.value
            if (raw.trim() === '') {
              setExpiringWithinHours(24)
              return
            }
            setExpiringWithinHours(clampCredentialExpiringWindowHours(Number(raw)))
          }}
          onBlur={() => setExpiringWithinHours((current) => clampCredentialExpiringWindowHours(current))}
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
          onChange={(event) => setAuditLimit(clampAuditEventLimit(Number(event.target.value)))}
          title="Maximum number of latest events to fetch"
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value={String(AUDIT_EVENTS_LIMIT_MAX)}>{AUDIT_EVENTS_LIMIT_MAX}</option>
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
        {auditApiSourceFilterParts.length > 0 && (
          <span
            title="Provider/label/action/event_type filters are applied server-side by GET /audit-events."
            aria-live="polite"
            aria-label={auditApiSourceFiltersAriaLabel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '1px 6px',
              borderRadius: 999,
              border: '1px solid #9ec5ff',
              color: '#0b3d91',
              backgroundColor: '#eaf2ff',
              fontWeight: 600,
            }}
          >
            <span>API filters:</span>
            {auditApiSourceFilterParts.map((part) => (
              <span
                key={part.id}
                title={
                  part.isTruncated
                    ? `${part.fullLabel} (truncated in badge; hover to inspect full value)`
                    : undefined
                }
                style={{
                  display: 'inline-block',
                  padding: '0 4px',
                  borderRadius: 4,
                  border: '1px solid #b5cdfa',
                  backgroundColor: '#f5f9ff',
                  fontFamily:
                    'ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, monospace',
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                {part.label}
              </span>
            ))}
          </span>
        )}{' '}
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

      <h4 id="audit">Credential Audit Trail</h4>
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

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message ?? 'Unknown UI error' }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('RootErrorBoundary caught UI error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
          <h2>Agent Chat Control Tower</h2>
          <p style={{ color: 'crimson' }}>UI render error: {this.state.message}</p>
          <p>페이지 렌더링 중 오류가 발생했습니다. 새로고침 후 동일하면 개발 로그를 확인합니다.</p>
        </div>
      )
    }

    return this.props.children
  }
}

if (rootElement) {
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  )
}
