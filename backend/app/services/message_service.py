from typing import Sequence

from app.repositories.message_repository import MessageRepository
from app.schemas.message import MessageCreate


class MessageService:
    def __init__(self, repository: MessageRepository) -> None:
        self._repository = repository

    def create_message(self, payload: MessageCreate):
        return self._repository.create(payload)

    def list_messages(self, channel_id: str) -> Sequence[object]:
        return self._repository.list_by_channel(channel_id)
