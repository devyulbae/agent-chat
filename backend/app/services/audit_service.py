from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol


@dataclass(frozen=True)
class AuditEvent:
    event_type: str
    entity_type: str
    entity_id: str
    occurred_at: datetime
    metadata: dict[str, Any]


class AuditLogger(Protocol):
    def log(self, event: AuditEvent) -> None: ...


class NoOpAuditLogger:
    def log(self, event: AuditEvent) -> None:
        _ = event


class AuditEventRepository(Protocol):
    def add(self, event: AuditEvent) -> None: ...

    def list(
        self,
        *,
        entity_type: str | None = None,
        entity_id: str | None = None,
        event_type: str | None = None,
        action: str | None = None,
        provider: str | None = None,
        label: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[AuditEvent]: ...


class RepositoryAuditLogger:
    def __init__(self, repository: AuditEventRepository) -> None:
        self._repository = repository

    def log(self, event: AuditEvent) -> None:
        self._repository.add(event)


class AuditService:
    def __init__(self, repository: AuditEventRepository) -> None:
        self._repository = repository

    def list_events(
        self,
        *,
        entity_type: str | None = None,
        entity_id: str | None = None,
        event_type: str | None = None,
        action: str | None = None,
        provider: str | None = None,
        label: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[AuditEvent]:
        return self._repository.list(
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            action=action,
            provider=provider,
            label=label,
            limit=limit,
            offset=offset,
        )


def build_audit_event(
    *,
    event_type: str,
    entity_type: str,
    entity_id: str,
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    return AuditEvent(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        occurred_at=datetime.now(timezone.utc),
        metadata=metadata or {},
    )
