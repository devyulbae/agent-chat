from typing import Literal

from pydantic import BaseModel


class AgentCreate(BaseModel):
    id: str
    name: str
    persona: str
    org_type: Literal["freeform", "department", "squad"]
    org_unit: str


class AgentRead(BaseModel):
    id: str
    name: str
    persona: str
    org_type: str
    org_unit: str

    @classmethod
    def from_entity(cls, entity: object) -> "AgentRead":
        return cls(
            id=getattr(entity, "id"),
            name=getattr(entity, "name"),
            persona=getattr(entity, "persona"),
            org_type=getattr(entity, "org_type"),
            org_unit=getattr(entity, "org_unit"),
        )
