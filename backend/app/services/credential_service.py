from datetime import datetime, timedelta, timezone
from typing import Any, Sequence

from app.core.encryption import EncryptionService
from app.repositories.credential_repository import CredentialRepository
from app.schemas.credential import CredentialCreate, CredentialUpdate


class CredentialService:
    def __init__(
        self,
        repository: CredentialRepository,
        encryption_service: EncryptionService,
    ) -> None:
        self._repository = repository
        self._encryption_service = encryption_service

    def create_credential(self, payload: CredentialCreate):
        encrypted = self._encryption_service.encrypt(payload.secret)
        return self._repository.create(
            row_id=payload.id,
            owner_agent_id=payload.owner_agent_id,
            provider=payload.provider,
            label=payload.label,
            secret_encrypted=encrypted,
            key_version="v1",
            token_expires_at=payload.token_expires_at,
        )

    def list_credentials(
        self,
        provider: str | None = None,
        owner_agent_id: str | None = None,
        token_status: str | None = None,
        expiring_within_hours: int = 24,
        now: datetime | None = None,
    ) -> Sequence[object]:
        rows = self._repository.list(
            provider=provider,
            owner_agent_id=owner_agent_id,
        )
        if token_status is None:
            return rows

        current = now or datetime.now(timezone.utc)
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)

        if token_status == "expired":
            return [
                row
                for row in rows
                if (expires_at := self._token_expires_at(row)) is not None
                and expires_at <= current
            ]

        if token_status == "active":
            return [
                row
                for row in rows
                if (expires_at := self._token_expires_at(row)) is None
                or expires_at > current
            ]

        if token_status == "expiring_soon":
            threshold = current + timedelta(hours=expiring_within_hours)
            return [
                row
                for row in rows
                if (expires_at := self._token_expires_at(row)) is not None
                and current < expires_at <= threshold
            ]

        raise ValueError("Unsupported token_status filter")

    def update_credential(self, credential_id: str, payload: CredentialUpdate):
        row = self._repository.get(credential_id)
        if row is None:
            return None
        if payload.label is not None:
            row.label = payload.label
        if payload.token_expires_at is not None:
            row.token_expires_at = payload.token_expires_at
        if payload.secret is not None:
            row.secret_encrypted = self._encryption_service.encrypt(payload.secret)
            row.last_rotated_at = datetime.now(timezone.utc)
        return self._repository.save(row)

    def delete_credential(self, credential_id: str) -> bool:
        return self._repository.delete(credential_id)

    def rotate_key(self, credential_id: str, new_key_version: str):
        row = self._repository.get(credential_id)
        if row is None:
            return None
        plaintext = self._encryption_service.decrypt(row.secret_encrypted)
        row.secret_encrypted = self._encryption_service.encrypt(plaintext)
        row.key_version = new_key_version
        row.last_rotated_at = datetime.now(timezone.utc)
        return self._repository.save(row)

    @staticmethod
    def _token_expires_at(row: Any) -> datetime | None:
        expires_at = (
            row.get("token_expires_at")
            if isinstance(row, dict)
            else row.token_expires_at
        )
        if expires_at is None:
            return None
        if expires_at.tzinfo is None:
            return expires_at.replace(tzinfo=timezone.utc)
        return expires_at
