from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.models import Message
from app.schemas.message import MessageCreate


@dataclass(frozen=True)
class ThreadSummary:
    thread_id: str | None
    message_count: int
    latest_message_at: datetime | None


class MessageRepository(ABC):
    @abstractmethod
    def create(self, payload: MessageCreate) -> Message:
        raise NotImplementedError

    @abstractmethod
    def list_by_channel(
        self, channel_id: str, thread_id: str | None = None
    ) -> Sequence[Message]:
        raise NotImplementedError

    @abstractmethod
    def list_threads_by_channel(self, channel_id: str) -> Sequence[ThreadSummary]:
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
        stmt = stmt.order_by(Message.created_at.asc(), Message.id.asc())
        return self._session.execute(stmt).scalars().all()

    def list_threads_by_channel(self, channel_id: str) -> Sequence[ThreadSummary]:
        root_summary_stmt = select(
            func.count(Message.id), func.max(Message.created_at)
        ).where(
            Message.channel_id == channel_id,
            Message.thread_id.is_(None),
        )
        root_count, root_latest_message_at = self._session.execute(
            root_summary_stmt
        ).one()

        thread_stmt = (
            select(
                Message.thread_id, func.count(Message.id), func.max(Message.created_at)
            )
            .where(Message.channel_id == channel_id, Message.thread_id.is_not(None))
            .group_by(Message.thread_id)
            .order_by(func.count(Message.id).desc(), Message.thread_id.asc())
        )
        rows = self._session.execute(thread_stmt).all()

        summaries = [
            ThreadSummary(
                thread_id=thread_id,
                message_count=message_count,
                latest_message_at=latest_message_at,
            )
            for thread_id, message_count, latest_message_at in rows
            if thread_id is not None
        ]

        return [
            ThreadSummary(
                thread_id=None,
                message_count=int(root_count),
                latest_message_at=root_latest_message_at,
            ),
            *summaries,
        ]
