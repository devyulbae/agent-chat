from datetime import UTC, datetime

from cryptography.fernet import Fernet

from app.core.encryption import EncryptionService
import pytest

from app.schemas.credential import CredentialCreate, CredentialUpdate
from app.services.credential_service import CredentialService


class FakeAuditLogger:
    def __init__(self) -> None:
        self.events = []

    def log(self, event) -> None:
        self.events.append(event)


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

    def get(self, row_id):
        for item in self.items:
            if item["row_id"] == row_id:
                return type("Row", (), item)
        return None

    def list_providers(self, *, owner_agent_id=None):
        rows = self.items
        if owner_agent_id is not None:
            rows = [item for item in rows if item["owner_agent_id"] == owner_agent_id]
        return sorted({item["provider"] for item in rows})

    def save(self, row):
        row_dict = row.__dict__.copy()
        self.items = [
            row_dict if item["row_id"] == row_dict["row_id"] else item
            for item in self.items
        ]
        return type("Row", (), row_dict)

    def delete(self, row_id):
        before = len(self.items)
        self.items = [item for item in self.items if item["row_id"] != row_id]
        return len(self.items) < before


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


def test_list_providers_returns_distinct_sorted_values() -> None:
    repo = FakeCredentialRepo()
    encryption = EncryptionService(Fernet.generate_key().decode())
    service = CredentialService(repository=repo, encryption_service=encryption)

    service.create_credential(
        CredentialCreate(
            id="cred-1",
            owner_agent_id="agent-1",
            provider="slack_bot",
            label="ops",
            secret="secret-1",
        )
    )
    service.create_credential(
        CredentialCreate(
            id="cred-2",
            owner_agent_id="agent-1",
            provider="openai_api",
            label="default",
            secret="secret-2",
        )
    )
    service.create_credential(
        CredentialCreate(
            id="cred-3",
            owner_agent_id="agent-2",
            provider="openai_api",
            label="backup",
            secret="secret-3",
        )
    )

    assert service.list_providers() == ["openai_api", "slack_bot"]
    assert service.list_providers(owner_agent_id="agent-2") == ["openai_api"]


def test_update_secret_sets_rotation_timestamp() -> None:
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
            token_expires_at=datetime(2026, 3, 31, tzinfo=UTC),
        )
    )

    updated = service.update_credential(
        "cred-1",
        CredentialUpdate(
            secret="new-secret", token_expires_at=datetime(2026, 4, 30, tzinfo=UTC)
        ),
    )

    assert updated is not None
    assert updated.last_rotated_at is not None
    assert updated.token_expires_at == datetime(2026, 4, 30, tzinfo=UTC)
    assert encryption.decrypt(updated.secret_encrypted) == "new-secret"


def test_update_credential_can_clear_token_expiry() -> None:
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
            token_expires_at=datetime(2026, 3, 31, tzinfo=UTC),
        )
    )

    updated = service.update_credential(
        "cred-1", CredentialUpdate(clear_token_expires_at=True)
    )

    assert updated is not None
    assert updated.token_expires_at is None


def test_credential_update_rejects_clear_and_set_expiry_together() -> None:
    with pytest.raises(ValueError):
        CredentialUpdate(
            token_expires_at=datetime(2026, 3, 31, tzinfo=UTC),
            clear_token_expires_at=True,
        )


def test_list_credentials_token_status_filters() -> None:
    repo = FakeCredentialRepo()
    encryption = EncryptionService(Fernet.generate_key().decode())
    service = CredentialService(repository=repo, encryption_service=encryption)

    now = datetime(2026, 3, 5, 0, 0, tzinfo=UTC)
    service.create_credential(
        CredentialCreate(
            id="cred-expired",
            owner_agent_id="agent-1",
            provider="openai_api",
            label="expired",
            secret="secret-expired",
            token_expires_at=datetime(2026, 3, 4, 23, 30, tzinfo=UTC),
        )
    )
    service.create_credential(
        CredentialCreate(
            id="cred-soon",
            owner_agent_id="agent-1",
            provider="openai_api",
            label="soon",
            secret="secret-soon",
            token_expires_at=datetime(2026, 3, 5, 4, 0, tzinfo=UTC),
        )
    )
    service.create_credential(
        CredentialCreate(
            id="cred-active",
            owner_agent_id="agent-1",
            provider="openai_api",
            label="active",
            secret="secret-active",
            token_expires_at=datetime(2026, 3, 7, 0, 0, tzinfo=UTC),
        )
    )

    expired = service.list_credentials(token_status="expired", now=now)
    expiring_soon = service.list_credentials(
        token_status="expiring_soon", expiring_within_hours=6, now=now
    )
    active = service.list_credentials(token_status="active", now=now)

    assert [item["row_id"] for item in expired] == ["cred-expired"]
    assert [item["row_id"] for item in expiring_soon] == ["cred-soon"]
    assert [item["row_id"] for item in active] == ["cred-soon", "cred-active"]


def test_credential_audit_events_for_update_delete_rotate() -> None:
    repo = FakeCredentialRepo()
    encryption = EncryptionService(Fernet.generate_key().decode())
    audit_logger = FakeAuditLogger()
    service = CredentialService(
        repository=repo,
        encryption_service=encryption,
        audit_logger=audit_logger,
    )

    service.create_credential(
        CredentialCreate(
            id="cred-1",
            owner_agent_id="agent-1",
            provider="openai_api",
            label="default",
            secret="secret-1",
        )
    )

    service.update_credential("cred-1", CredentialUpdate(label="renamed"))
    service.rotate_key("cred-1", "v2")
    deleted = service.delete_credential("cred-1")

    assert deleted is True
    assert [event.event_type for event in audit_logger.events] == [
        "credential.updated",
        "credential.rotated",
        "credential.deleted",
    ]
    assert audit_logger.events[0].metadata == {
        "provider": "openai_api",
        "label": "renamed",
        "changed_fields": ["label"],
    }
    assert audit_logger.events[1].metadata == {
        "provider": "openai_api",
        "label": "renamed",
        "previous_key_version": "v1",
        "new_key_version": "v2",
    }
    assert audit_logger.events[2].metadata == {
        "provider": "openai_api",
        "label": "renamed",
    }
