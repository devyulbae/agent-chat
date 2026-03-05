from __future__ import annotations

from collections.abc import Sequence

from app.services.audit_service import AuditEvent


class InMemoryAuditRepository:
    def __init__(self) -> None:
        self._events: list[AuditEvent] = []

    def add(self, event: AuditEvent) -> None:
        self._events.append(event)

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
    ) -> Sequence[AuditEvent]:
        items = self._events
        if entity_type is not None:
            items = [item for item in items if item.entity_type == entity_type]
        if entity_id is not None:
            items = [item for item in items if item.entity_id == entity_id]
        if event_type is not None:
            items = [item for item in items if item.event_type == event_type]
        if action is not None:
            items = [
                item
                for item in items
                if item.event_type.rsplit(".", maxsplit=1)[-1] == action
            ]
        if provider is not None:
            items = [
                item for item in items if item.metadata.get("provider") == provider
            ]
        if label is not None:
            items = [item for item in items if item.metadata.get("label") == label]

        ordered = sorted(items, key=lambda item: item.occurred_at, reverse=True)
        return ordered[:limit]
