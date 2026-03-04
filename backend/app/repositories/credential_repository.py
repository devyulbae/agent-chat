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
        key_version: str,
    ) -> Credential:
        raise NotImplementedError

    @abstractmethod
    def list(
        self,
        *,
        provider: str | None = None,
        owner_agent_id: str | None = None,
    ) -> Sequence[Credential]:
        raise NotImplementedError

    @abstractmethod
    def get(self, row_id: str) -> Credential | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, row: Credential) -> Credential:
        raise NotImplementedError

    @abstractmethod
    def delete(self, row_id: str) -> bool:
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
        key_version: str,
    ) -> Credential:
        row = Credential(
            id=row_id,
            owner_agent_id=owner_agent_id,
            provider=provider,
            label=label,
            secret_encrypted=secret_encrypted,
            key_version=key_version,
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row

    def list(
        self,
        *,
        provider: str | None = None,
        owner_agent_id: str | None = None,
    ) -> Sequence[Credential]:
        stmt = select(Credential)
        if provider is not None:
            stmt = stmt.where(Credential.provider == provider)
        if owner_agent_id is not None:
            stmt = stmt.where(Credential.owner_agent_id == owner_agent_id)
        return self._session.execute(stmt).scalars().all()

    def get(self, row_id: str) -> Credential | None:
        return self._session.get(Credential, row_id)

    def save(self, row: Credential) -> Credential:
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return row

    def delete(self, row_id: str) -> bool:
        row = self._session.get(Credential, row_id)
        if row is None:
            return False
        self._session.delete(row)
        self._session.commit()
        return True
