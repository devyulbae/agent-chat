from __future__ import annotations

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
