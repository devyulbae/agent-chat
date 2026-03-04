from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import Credential


class CredentialRepository(ABC):
    @abstractmethod
    def create(
        self,
        *,
        row_id: str,
        owner_agent_id: str,
        provider: str,
        label: str,
        secret_encrypted: str,
    ) -> Credential:
        raise NotImplementedError

    @abstractmethod
    def list(self) -> Sequence[Credential]:
        raise NotImplementedError


class SQLCredentialRepository(CredentialRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        row_id: str,
        owner_agent_id: str,
        provider: str,
        label: str,
        secret_encrypted: str,
    ) -> Credential:
        row = Credential(
            id=row_id,
            owner_agent_id=owner_agent_id,
            provider=provider,
            label=label,
            secret_encrypted=secret_encrypted,
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row

    def list(self) -> Sequence[Credential]:
        return self._session.execute(select(Credential)).scalars().all()
