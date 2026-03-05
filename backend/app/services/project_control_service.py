from typing import Sequence

from app.core.project_level import cron_for_level
from app.repositories.project_control_repository import ProjectControlRepository
from app.schemas.project_control import ProjectControlCreate, ProjectControlUpdate


class ProjectControlService:
    def __init__(self, repository: ProjectControlRepository) -> None:
        self._repository = repository

    def create(self, payload: ProjectControlCreate):
        return self._repository.create(payload)

    def list(self) -> Sequence[object]:
        return self._repository.list()

    def update(self, row_id: str, payload: ProjectControlUpdate):
        row = self._repository.get(row_id)
        if row is None:
            return None
        if payload.level is not None:
            row.level = payload.level
        if payload.burst_until is not None:
            row.burst_until = payload.burst_until
        return self._repository.save(row)

    def recommended_cron(self, level: str) -> str:
        return cron_for_level(level)
