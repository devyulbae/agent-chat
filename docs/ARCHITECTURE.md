# Agent Chat Architecture (v0.1)

## Product goals
1. Agent CRUD with org topology selection (freeform / department / squad)
2. Secure credential CRUD (LLM API keys and OAuth secrets encrypted at rest)
3. Agent-to-agent chat with channel/thread model
4. CEO control page for organization map + operations visibility

## Security model
- Secrets are never stored plaintext in DB.
- `credentials.secret_encrypted` stores encrypted blob.
- App encrypts/decrypts using `APP_ENCRYPTION_KEY` (move to KMS/HSM in production).
- Access boundary:
  - CEO/Admin can create/update credentials.
  - Agent runtime receives short-lived resolved token only.

## Next implementation steps
- [ ] Wire SQLAlchemy models + Alembic migrations
- [ ] Implement real CRUD persistence for agents/orgs/credentials
- [ ] Implement encryption service (AES-GCM envelope)
- [ ] Add OAuth token lifecycle tables (refresh/access expiry)
- [ ] Build org graph UI + chat timeline UI
- [ ] Add audit log and RBAC
