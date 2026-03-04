from typing import Sequence

from app.repositories.agent_repository import AgentRepository
from app.schemas.agent import AgentCreate


class AgentService:
    def __init__(self, repository: AgentRepository) -> None:
        self._repository = repository

    def create_agent(self, payload: AgentCreate):
        return self._repository.create(payload)

    def list_agents(self) -> Sequence[object]:
        return self._repository.list()
