from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    org_type: Mapped[str] = mapped_column(String(32), nullable=False)


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    persona: Mapped[str] = mapped_column(String(255), nullable=False)
    org_type: Mapped[str] = mapped_column(String(32), nullable=False)
    org_unit: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("organizations.id"), nullable=True
    )


class Credential(Base):
    __tablename__ = "credentials"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_agent_id: Mapped[str] = mapped_column(String(64), ForeignKey("agents.id"))
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    secret_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
