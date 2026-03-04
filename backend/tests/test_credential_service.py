from cryptography.fernet import Fernet

from app.core.encryption import EncryptionService
from app.schemas.credential import CredentialCreate
from app.services.credential_service import CredentialService


class FakeCredentialRepo:
    def __init__(self) -> None:
        self.items = []

    def create(self, **kwargs):
        self.items.append(kwargs)
        return type("Row", (), kwargs)

    def list(self):
        return self.items


def test_credential_service_encrypts_secret() -> None:
    repo = FakeCredentialRepo()
    encryption = EncryptionService(Fernet.generate_key().decode())
    service = CredentialService(repository=repo, encryption_service=encryption)

    payload = CredentialCreate(
        id="cred-1",
        owner_agent_id="agent-1",
        provider="openai_api",
        label="default",
        secret="super-secret",
    )

    row = service.create_credential(payload)

    assert row.secret_encrypted != "super-secret"
    assert encryption.decrypt(row.secret_encrypted) == "super-secret"
