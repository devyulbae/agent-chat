from datetime import UTC, datetime, timedelta

from app.schemas.message import MessageCreate
from app.services.message_service import MessageService


class FakeMessageRepo:
    def __init__(self) -> None:
        self.items = []

    def create(self, payload: MessageCreate):
        created_at = datetime(2026, 1, 1, tzinfo=UTC) + timedelta(
            seconds=len(self.items)
        )
        item = type(
            "StoredMessage", (), {**payload.model_dump(), "created_at": created_at}
        )
        self.items.append(item)
        return item

    def list_by_channel(self, channel_id: str, thread_id: str | None = None):
        result = [item for item in self.items if item.channel_id == channel_id]
        if thread_id is None:
            return [item for item in result if item.thread_id is None]
        return [item for item in result if item.thread_id == thread_id]

    def list_threads_by_channel(self, channel_id: str):
        root_count = 0
        root_latest_message_at = None
        counts: dict[str, int] = {}
        latest_by_thread: dict[str, datetime] = {}
        for item in self.items:
            if item.channel_id != channel_id:
                continue
            if item.thread_id is None:
                root_count += 1
                root_latest_message_at = item.created_at
                continue
            counts[item.thread_id] = counts.get(item.thread_id, 0) + 1
            latest_by_thread[item.thread_id] = item.created_at
        summaries = [
            type(
                "ThreadSummary",
                (),
                {
                    "thread_id": thread_id,
                    "message_count": counts[thread_id],
                    "latest_message_at": latest_by_thread[thread_id],
                },
            )
            for thread_id in sorted(
                counts,
                key=lambda thread_id: (
                    -latest_by_thread[thread_id].timestamp(),
                    thread_id,
                ),
            )
        ]
        return [
            type(
                "ThreadSummary",
                (),
                {
                    "thread_id": None,
                    "message_count": root_count,
                    "latest_message_at": root_latest_message_at,
                },
            ),
            *summaries,
        ]


def test_message_service_list_defaults_to_root_thread() -> None:
    repo = FakeMessageRepo()
    service = MessageService(repository=repo)

    repo.create(
        MessageCreate(
            id="msg-1",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id=None,
            body="root",
        )
    )
    repo.create(
        MessageCreate(
            id="msg-2",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id="thread-1",
            body="reply",
        )
    )

    listed = service.list_messages("chan-1")

    assert [item.id for item in listed] == ["msg-1"]


def test_message_service_list_by_thread_id() -> None:
    repo = FakeMessageRepo()
    service = MessageService(repository=repo)

    repo.create(
        MessageCreate(
            id="msg-1",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id=None,
            body="root",
        )
    )
    repo.create(
        MessageCreate(
            id="msg-2",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id="thread-1",
            body="reply",
        )
    )

    listed = service.list_messages("chan-1", "thread-1")

    assert [item.id for item in listed] == ["msg-2"]


def test_message_service_list_threads_returns_recently_active_first() -> None:
    repo = FakeMessageRepo()
    service = MessageService(repository=repo)

    repo.create(
        MessageCreate(
            id="msg-1",
            channel_id="chan-1",
            sender_agent_id="agent-2",
            thread_id="thread-a",
            body="one",
        )
    )
    repo.create(
        MessageCreate(
            id="msg-2",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id="thread-a",
            body="two",
        )
    )
    repo.create(
        MessageCreate(
            id="msg-3",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id="thread-b",
            body="three",
        )
    )

    listed = service.list_threads("chan-1")

    assert [(item.thread_id, item.message_count) for item in listed] == [
        (None, 0),
        ("thread-b", 1),
        ("thread-a", 2),
    ]
    assert listed[1].latest_message_at is not None
    assert listed[2].latest_message_at is not None
