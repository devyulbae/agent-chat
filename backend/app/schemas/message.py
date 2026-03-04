from datetime import datetime

from pydantic import BaseModel


class MessageCreate(BaseModel):
    id: str
    channel_id: str
    sender_agent_id: str
    thread_id: str | None = None
    body: str


class ThreadSummaryRead(BaseModel):
    thread_id: str
    message_count: int

    @classmethod
    def from_entity(cls, entity: object) -> "ThreadSummaryRead":
        return cls(
            thread_id=getattr(entity, "thread_id"),
            message_count=getattr(entity, "message_count"),
        )


class MessageRead(BaseModel):
    id: str
    channel_id: str
    sender_agent_id: str
    thread_id: str | None
    body: str
    created_at: datetime

    @classmethod
    def from_entity(cls, entity: object) -> "MessageRead":
        return cls(
            id=getattr(entity, "id"),
            channel_id=getattr(entity, "channel_id"),
            sender_agent_id=getattr(entity, "sender_agent_id"),
            thread_id=getattr(entity, "thread_id"),
            body=getattr(entity, "body"),
            created_at=getattr(entity, "created_at"),
        )
