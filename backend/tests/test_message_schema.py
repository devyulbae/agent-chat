from datetime import datetime, timezone

from app.schemas.message import MessageRead


def test_message_read_from_entity_includes_created_at() -> None:
    created_at = datetime(2026, 3, 5, 6, 40, tzinfo=timezone.utc)
    entity = type(
        "MessageEntity",
        (),
        {
            "id": "msg-1",
            "channel_id": "chan-1",
            "sender_agent_id": "agent-1",
            "thread_id": "thread-1",
            "body": "hello",
            "created_at": created_at,
        },
    )

    payload = MessageRead.from_entity(entity)

    assert payload.created_at == created_at
