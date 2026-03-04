from typing import Sequence

from app.repositories.channel_repository import ChannelRepository
from app.schemas.channel import ChannelCreate


class ChannelService:
    def __init__(self, repository: ChannelRepository) -> None:
        self._repository = repository

    def create_channel(self, payload: ChannelCreate):
        return self._repository.create(payload)

    def list_channels(self) -> Sequence[object]:
        return self._repository.list()
