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

    def list(self, *, provider=None, owner_agent_id=None):
        rows = self.items
        if provider is not None:
            rows = [item for item in rows if item["provider"] == provider]
        if owner_agent_id is not None:
            rows = [item for item in rows if item["owner_agent_id"] == owner_agent_id]
        return rows


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


def test_credential_service_filters_by_provider_and_owner() -> None:
    repo = FakeCredentialRepo()
    encryption = EncryptionService(Fernet.generate_key().decode())
    service = CredentialService(repository=repo, encryption_service=encryption)

    service.create_credential(
        CredentialCreate(
            id="cred-1",
            owner_agent_id="agent-1",
            provider="openai_api",
            label="default",
            secret="secret-1",
        )
    )
    service.create_credential(
        CredentialCreate(
            id="cred-2",
            owner_agent_id="agent-2",
            provider="slack_bot",
            label="ops",
            secret="secret-2",
        )
    )

    by_provider = service.list_credentials(provider="openai_api")
    by_owner = service.list_credentials(owner_agent_id="agent-2")

    assert [item["row_id"] for item in by_provider] == ["cred-1"]
    assert [item["row_id"] for item in by_owner] == ["cred-2"]
