from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import Message
from app.schemas.message import MessageCreate


class MessageRepository(ABC):
    @abstractmethod
    def create(self, payload: MessageCreate) -> Message:
        raise NotImplementedError

    @abstractmethod
    def list_by_channel(
        self, channel_id: str, thread_id: str | None = None
    ) -> Sequence[Message]:
        raise NotImplementedError


class SQLMessageRepository(MessageRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, payload: MessageCreate) -> Message:
        row = Message(
            id=payload.id,
            channel_id=payload.channel_id,
            sender_agent_id=payload.sender_agent_id,
            thread_id=payload.thread_id,
            body=payload.body,
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row

    def list_by_channel(
        self, channel_id: str, thread_id: str | None = None
    ) -> Sequence[Message]:
        stmt = select(Message).where(Message.channel_id == channel_id)
        if thread_id is None:
            stmt = stmt.where(Message.thread_id.is_(None))
        else:
            stmt = stmt.where(Message.thread_id == thread_id)
        return self._session.execute(stmt).scalars().all()
