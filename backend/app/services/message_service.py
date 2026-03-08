from typing import Sequence

from app.repositories.message_repository import MessageRepository, ThreadSummary
from app.schemas.message import MessageCreate


class MessageService:
    def __init__(self, repository: MessageRepository) -> None:
        self._repository = repository

    def create_message(self, payload: MessageCreate):
        return self._repository.create(payload)

    def list_messages(
        self, channel_id: str, thread_id: str | None = None, limit: int | None = None
    ) -> Sequence[object]:
        return self._repository.list_by_channel(channel_id, thread_id, limit)

    def list_threads(self, channel_id: str) -> Sequence[ThreadSummary]:
        return self._repository.list_threads_by_channel(channel_id)
