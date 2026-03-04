from pydantic import BaseModel


class ChannelCreate(BaseModel):
    id: str
    name: str
    organization_id: str | None = None


class ChannelRead(BaseModel):
    id: str
    name: str
    organization_id: str | None

    @classmethod
    def from_entity(cls, entity: object) -> "ChannelRead":
        return cls(
            id=getattr(entity, "id"),
            name=getattr(entity, "name"),
            organization_id=getattr(entity, "organization_id"),
        )
