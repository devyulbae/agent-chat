from typing import Literal

from pydantic import BaseModel


class OrganizationCreate(BaseModel):
    id: str
    name: str
    org_type: Literal["freeform", "department", "squad"]


class OrganizationRead(BaseModel):
    id: str
    name: str
    org_type: str

    @classmethod
    def from_entity(cls, entity: object) -> "OrganizationRead":
        return cls(
            id=getattr(entity, "id"),
            name=getattr(entity, "name"),
            org_type=getattr(entity, "org_type"),
        )
