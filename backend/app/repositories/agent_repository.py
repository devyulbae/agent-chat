from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import Agent
from app.schemas.agent import AgentCreate


class AgentRepository(ABC):
    @abstractmethod
    def create(self, payload: AgentCreate) -> Agent:
        raise NotImplementedError

    @abstractmethod
    def list(self) -> Sequence[Agent]:
        raise NotImplementedError


class SQLAgentRepository(AgentRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, payload: AgentCreate) -> Agent:
        agent = Agent(
            id=payload.id,
            name=payload.name,
            persona=payload.persona,
            org_type=payload.org_type,
            org_unit=payload.org_unit,
        )
        self._session.add(agent)
        self._session.commit()
        self._session.refresh(agent)
        return agent

    def list(self) -> Sequence[Agent]:
        return self._session.execute(select(Agent)).scalars().all()
