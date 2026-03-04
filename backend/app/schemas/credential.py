from datetime import datetime

from pydantic import BaseModel, model_validator


class CredentialCreate(BaseModel):
    id: str
    owner_agent_id: str
    provider: str
    label: str
    secret: str
    token_expires_at: datetime | None = None


class CredentialUpdate(BaseModel):
    label: str | None = None
    secret: str | None = None
    token_expires_at: datetime | None = None
    clear_token_expires_at: bool = False

    @model_validator(mode="after")
    def validate_token_expiry_fields(self):
        if self.clear_token_expires_at and self.token_expires_at is not None:
            raise ValueError(
                "token_expires_at cannot be provided when clear_token_expires_at is true"
            )
        return self


class CredentialRead(BaseModel):
    id: str
    owner_agent_id: str
    provider: str
    label: str
    key_version: str
    token_expires_at: datetime | None = None
    last_used_at: datetime | None = None
    last_rotated_at: datetime | None = None

    @classmethod
    def from_entity(cls, entity: object) -> "CredentialRead":
        return cls(
            id=getattr(entity, "id"),
            owner_agent_id=getattr(entity, "owner_agent_id"),
            provider=getattr(entity, "provider"),
            label=getattr(entity, "label"),
            key_version=getattr(entity, "key_version"),
            token_expires_at=getattr(entity, "token_expires_at", None),
            last_used_at=getattr(entity, "last_used_at", None),
            last_rotated_at=getattr(entity, "last_rotated_at", None),
        )
