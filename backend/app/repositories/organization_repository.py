from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import Organization
from app.schemas.organization import OrganizationCreate


class OrganizationRepository(ABC):
    @abstractmethod
    def create(self, payload: OrganizationCreate) -> Organization:
        raise NotImplementedError

    @abstractmethod
    def list(self) -> Sequence[Organization]:
        raise NotImplementedError


class SQLOrganizationRepository(OrganizationRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, payload: OrganizationCreate) -> Organization:
        row = Organization(id=payload.id, name=payload.name, org_type=payload.org_type)
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row

    def list(self) -> Sequence[Organization]:
        return self._session.execute(select(Organization)).scalars().all()
