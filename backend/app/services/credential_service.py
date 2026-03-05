from datetime import datetime, timedelta, timezone
from typing import Any, Sequence

from app.core.encryption import EncryptionService
from app.repositories.credential_repository import CredentialRepository
from app.schemas.credential import CredentialCreate, CredentialUpdate
from app.services.audit_service import AuditLogger, NoOpAuditLogger, build_audit_event


class CredentialService:
    def __init__(
        self,
        repository: CredentialRepository,
        encryption_service: EncryptionService,
        audit_logger: AuditLogger | None = None,
    ) -> None:
        self._repository = repository
        self._encryption_service = encryption_service
        self._audit_logger = audit_logger or NoOpAuditLogger()

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

        if token_status == "expired":  # nosec B105
            return [
                row
                for row in rows
                if (expires_at := self._token_expires_at(row)) is not None
                and expires_at <= current
            ]

        if token_status == "active":  # nosec B105
            return [
                row
                for row in rows
                if (expires_at := self._token_expires_at(row)) is None
                or expires_at > current
            ]

        if token_status == "expiring_soon":  # nosec B105
            threshold = current + timedelta(hours=expiring_within_hours)
            return [
                row
                for row in rows
                if (expires_at := self._token_expires_at(row)) is not None
                and current < expires_at <= threshold
            ]

        raise ValueError("Unsupported token_status filter")

    def list_providers(self, owner_agent_id: str | None = None) -> Sequence[str]:
        return self._repository.list_providers(owner_agent_id=owner_agent_id)

    def update_credential(self, credential_id: str, payload: CredentialUpdate):
        row = self._repository.get(credential_id)
        if row is None:
            return None

        changed_fields: list[str] = []
        if payload.label is not None:
            row.label = payload.label
            changed_fields.append("label")
        if payload.clear_token_expires_at:
            row.token_expires_at = None
            changed_fields.append("token_expires_at")
        elif payload.token_expires_at is not None:
            row.token_expires_at = payload.token_expires_at
            changed_fields.append("token_expires_at")
        if payload.secret is not None:
            row.secret_encrypted = self._encryption_service.encrypt(payload.secret)
            row.last_rotated_at = datetime.now(timezone.utc)
            changed_fields.append("secret")

        saved = self._repository.save(row)
        if changed_fields:
            self._audit_logger.log(
                build_audit_event(
                    event_type="credential.updated",
                    entity_type="credential",
                    entity_id=credential_id,
                    metadata={"changed_fields": changed_fields},
                )
            )
        return saved

    def delete_credential(self, credential_id: str) -> bool:
        deleted = self._repository.delete(credential_id)
        if deleted:
            self._audit_logger.log(
                build_audit_event(
                    event_type="credential.deleted",
                    entity_type="credential",
                    entity_id=credential_id,
                )
            )
        return deleted

    def rotate_key(self, credential_id: str, new_key_version: str):
        row = self._repository.get(credential_id)
        if row is None:
            return None
        previous_key_version = row.key_version
        plaintext = self._encryption_service.decrypt(row.secret_encrypted)
        row.secret_encrypted = self._encryption_service.encrypt(plaintext)
        row.key_version = new_key_version
        row.last_rotated_at = datetime.now(timezone.utc)

        saved = self._repository.save(row)
        self._audit_logger.log(
            build_audit_event(
                event_type="credential.rotated",
                entity_type="credential",
                entity_id=credential_id,
                metadata={
                    "previous_key_version": previous_key_version,
                    "new_key_version": new_key_version,
                },
            )
        )
        return saved

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
