from typing import Sequence

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
        )

    def list_credentials(self) -> Sequence[object]:
        return self._repository.list()

    def update_credential(self, credential_id: str, payload: CredentialUpdate):
        row = self._repository.get(credential_id)
        if row is None:
            return None
        if payload.label is not None:
            row.label = payload.label
        if payload.secret is not None:
            row.secret_encrypted = self._encryption_service.encrypt(payload.secret)
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
        return self._repository.save(row)
