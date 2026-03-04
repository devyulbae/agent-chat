from pydantic import BaseModel


class CredentialCreate(BaseModel):
    id: str
    owner_agent_id: str
    provider: str
    label: str
    secret: str


class CredentialRead(BaseModel):
    id: str
    owner_agent_id: str
    provider: str
    label: str

    @classmethod
    def from_entity(cls, entity: object) -> "CredentialRead":
        return cls(
            id=getattr(entity, "id"),
            owner_agent_id=getattr(entity, "owner_agent_id"),
            provider=getattr(entity, "provider"),
            label=getattr(entity, "label"),
        )
