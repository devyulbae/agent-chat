import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return <div style={{padding:20,fontFamily:'sans-serif'}}>
    <h2>Agent Chat Control Tower</h2>
    <p>Port 50004 / Stack: React+TS+Vite + FastAPI + Postgres + Redis + Nginx</p>
    <ul>
      <li>Agent CRUD (org type: freeform/department/squad)</li>
      <li>Credential CRUD (encrypted at rest)</li>
      <li>Org view + Agent-to-Agent chat monitor</li>
    </ul>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
