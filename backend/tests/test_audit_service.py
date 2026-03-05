from datetime import UTC, datetime

from app.repositories.audit_repository import InMemoryAuditRepository
from app.services.audit_service import AuditService, build_audit_event


def test_audit_service_filters_and_orders_events() -> None:
    repository = InMemoryAuditRepository()
    service = AuditService(repository=repository)

    first = build_audit_event(
        event_type="credential.updated",
        entity_type="credential",
        entity_id="cred-1",
        metadata={"provider": "openai_api", "label": "default"},
    )
    second = build_audit_event(
        event_type="credential.rotated",
        entity_type="credential",
        entity_id="cred-1",
        metadata={"provider": "openai_api", "label": "default"},
    )
    third = build_audit_event(
        event_type="credential.deleted",
        entity_type="credential",
        entity_id="cred-2",
        metadata={"provider": "slack", "label": "alerts"},
    )

    repository.add(first)
    repository.add(second)
    repository.add(third)

    # Force deterministic ordering for assertion clarity.
    repository._events[0] = first.__class__(
        **{**first.__dict__, "occurred_at": datetime(2026, 3, 5, 0, 0, tzinfo=UTC)}
    )
    repository._events[1] = second.__class__(
        **{**second.__dict__, "occurred_at": datetime(2026, 3, 5, 0, 1, tzinfo=UTC)}
    )
    repository._events[2] = third.__class__(
        **{**third.__dict__, "occurred_at": datetime(2026, 3, 5, 0, 2, tzinfo=UTC)}
    )

    items = service.list_events(entity_type="credential", entity_id="cred-1")

    assert [item.event_type for item in items] == [
        "credential.rotated",
        "credential.updated",
    ]

    updated_only = service.list_events(entity_type="credential", action="updated")
    assert [item.event_type for item in updated_only] == ["credential.updated"]

    provider_only = service.list_events(entity_type="credential", provider="openai_api")
    assert [item.event_type for item in provider_only] == [
        "credential.rotated",
        "credential.updated",
    ]

    label_only = service.list_events(entity_type="credential", label="alerts")
    assert [item.event_type for item in label_only] == ["credential.deleted"]

    paged = service.list_events(entity_type="credential", limit=1, offset=1)
    assert [item.event_type for item in paged] == ["credential.rotated"]
