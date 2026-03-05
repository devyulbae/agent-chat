from pydantic import BaseModel
from typing import Literal

ProjectLevel = Literal["L1", "L2", "L3", "L4"]


class ProjectControlCreate(BaseModel):
    id: str
    project_key: str
    level: ProjectLevel
    owner: str


class ProjectControlUpdate(BaseModel):
    level: ProjectLevel | None = None
    burst_until: str | None = None


class ProjectControlRead(BaseModel):
    id: str
    project_key: str
    level: ProjectLevel
    owner: str
    recommended_cron: str
    burst_until: str | None

    @classmethod
    def from_entity(cls, entity: object, recommended_cron: str) -> "ProjectControlRead":
        return cls(
            id=getattr(entity, "id"),
            project_key=getattr(entity, "project_key"),
            level=getattr(entity, "level"),
            owner=getattr(entity, "owner"),
            recommended_cron=recommended_cron,
            burst_until=getattr(entity, "burst_until"),
        )
