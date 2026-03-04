from pydantic import BaseModel


class MessageCreate(BaseModel):
    id: str
    channel_id: str
    sender_agent_id: str
    thread_id: str | None = None
    body: str


class MessageRead(BaseModel):
    id: str
    channel_id: str
    sender_agent_id: str
    thread_id: str | None
    body: str

    @classmethod
    def from_entity(cls, entity: object) -> "MessageRead":
        return cls(
            id=getattr(entity, "id"),
            channel_id=getattr(entity, "channel_id"),
            sender_agent_id=getattr(entity, "sender_agent_id"),
            thread_id=getattr(entity, "thread_id"),
            body=getattr(entity, "body"),
        )
