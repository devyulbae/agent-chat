# agent-chat

Agent-to-agent chat and CEO control tower.

## Locked infra
- Docker Compose (postgres + redis + fastapi + react/vite + nginx)
- External port: **50004**

## Quick start
```bash
cd /Users/sybae/code/agent-chat
docker compose up -d --build
# open http://localhost:50004
```

## Core scope
- Agent CRUD with org modes: freeform / department / squad
- Credential CRUD for LLM/OAuth providers (encrypted at rest)
- Agent chat channels/threads
- Organization map + control page

See `docs/ARCHITECTURE.md`.
