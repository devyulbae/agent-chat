from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import Channel
from app.schemas.channel import ChannelCreate


class ChannelRepository(ABC):
    @abstractmethod
    def create(self, payload: ChannelCreate) -> Channel:
        raise NotImplementedError

    @abstractmethod
    def list(self) -> Sequence[Channel]:
        raise NotImplementedError


class SQLChannelRepository(ChannelRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, payload: ChannelCreate) -> Channel:
        row = Channel(
            id=payload.id,
            name=payload.name,
            organization_id=payload.organization_id,
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row

    def list(self) -> Sequence[Channel]:
        return self._session.execute(select(Channel)).scalars().all()
