from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.services.audit_service import AuditEvent


class AuditEventRead(BaseModel):
    event_type: str
    entity_type: str
    entity_id: str
    occurred_at: datetime
    metadata: dict[str, Any]

    @classmethod
    def from_entity(cls, event: AuditEvent) -> "AuditEventRead":
        return cls(
            event_type=event.event_type,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            occurred_at=event.occurred_at,
            metadata=event.metadata,
        )
