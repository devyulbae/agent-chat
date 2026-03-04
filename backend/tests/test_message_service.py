from app.schemas.message import MessageCreate
from app.services.message_service import MessageService


class FakeMessageRepo:
    def __init__(self) -> None:
        self.items = []

    def create(self, payload: MessageCreate):
        self.items.append(payload)
        return payload

    def list_by_channel(self, channel_id: str, thread_id: str | None = None):
        result = [item for item in self.items if item.channel_id == channel_id]
        if thread_id is None:
            return [item for item in result if item.thread_id is None]
        return [item for item in result if item.thread_id == thread_id]

    def list_threads_by_channel(self, channel_id: str):
        counts: dict[str, int] = {}
        for item in self.items:
            if item.channel_id != channel_id or item.thread_id is None:
                continue
            counts[item.thread_id] = counts.get(item.thread_id, 0) + 1
        return [
            type("ThreadSummary", (), {"thread_id": thread_id, "message_count": count})
            for thread_id, count in sorted(counts.items(), key=lambda x: (-x[1], x[0]))
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


def test_message_service_list_threads_returns_ranked_counts() -> None:
    repo = FakeMessageRepo()
    service = MessageService(repository=repo)

    repo.create(
        MessageCreate(
            id="msg-1",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id="thread-b",
            body="one",
        )
    )
    repo.create(
        MessageCreate(
            id="msg-2",
            channel_id="chan-1",
            sender_agent_id="agent-2",
            thread_id="thread-a",
            body="two",
        )
    )
    repo.create(
        MessageCreate(
            id="msg-3",
            channel_id="chan-1",
            sender_agent_id="agent-1",
            thread_id="thread-a",
            body="three",
        )
    )

    listed = service.list_threads("chan-1")

    assert [(item.thread_id, item.message_count) for item in listed] == [
        ("thread-a", 2),
        ("thread-b", 1),
    ]
