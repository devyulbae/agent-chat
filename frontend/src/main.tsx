import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

type OrgType = 'freeform' | 'department' | 'squad'

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
  thread_id: string
  message_count: number
}

type Message = {
  id: string
  channel_id: string
  sender_agent_id: string
  thread_id: string | null
  body: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function App() {
  const [graph, setGraph] = useState<OrganizationsGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [channelId, setChannelId] = useState('chan-1')
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

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
    [channelId, selectedThreadId]
  )

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
    if (!channelId.trim()) {
      setIsLive(false)
      return
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsBase = `${wsProtocol}//${window.location.host}`
    const wsUrl = `${wsBase}/api/v1/ws/channels/${encodeURIComponent(channelId)}`
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
        }

        void loadThreads()
      } catch {
        // ignore malformed websocket payloads
      }
    }

    return () => {
      socket.close()
    }
  }, [channelId, loadThreads, selectedThreadId])

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

      {chatError && <p style={{ color: 'crimson' }}>Error: {chatError}</p>}

      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'flex-start' }}>
        <div>
          <h4>Threads</h4>
          {threadLoading && <p>Loading threads…</p>}
          {!threadLoading && (
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedThreadId(null)}
                  style={{
                    fontWeight: selectedThreadId === null ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  Root messages
                </button>
              </li>
              {threads.map((thread) => (
                <li key={thread.thread_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(thread.thread_id)}
                    style={{
                      fontWeight: selectedThreadId === thread.thread_id ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {thread.thread_id} ({thread.message_count})
                  </button>
                </li>
              ))}
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
                    <code>{message.sender_agent_id}</code>: {message.body}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No messages.</p>
            ))}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
