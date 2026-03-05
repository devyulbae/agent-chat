from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import ProjectControl
from app.schemas.project_control import ProjectControlCreate


class ProjectControlRepository(ABC):
    @abstractmethod
    def create(self, payload: ProjectControlCreate) -> ProjectControl:
        raise NotImplementedError

    @abstractmethod
    def list(self) -> Sequence[ProjectControl]:
        raise NotImplementedError

    @abstractmethod
    def get(self, row_id: str) -> ProjectControl | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, row: ProjectControl) -> ProjectControl:
        raise NotImplementedError


class SQLProjectControlRepository(ProjectControlRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, payload: ProjectControlCreate) -> ProjectControl:
        row = ProjectControl(
            id=payload.id,
            project_key=payload.project_key,
            level=payload.level,
            owner=payload.owner,
            burst_until=None,
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row

    def list(self) -> Sequence[ProjectControl]:
        return self._session.execute(select(ProjectControl)).scalars().all()

    def get(self, row_id: str) -> ProjectControl | None:
        return self._session.get(ProjectControl, row_id)

    def save(self, row: ProjectControl) -> ProjectControl:
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row
