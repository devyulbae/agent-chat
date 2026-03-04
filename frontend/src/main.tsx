import React, { useEffect, useMemo, useState } from 'react'
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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function App() {
  const [graph, setGraph] = useState<OrganizationsGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
