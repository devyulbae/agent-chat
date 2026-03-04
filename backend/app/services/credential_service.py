from typing import Sequence

from app.core.encryption import EncryptionService
from app.repositories.credential_repository import CredentialRepository
from app.schemas.credential import CredentialCreate


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
        )

    def list_credentials(self) -> Sequence[object]:
        return self._repository.list()
