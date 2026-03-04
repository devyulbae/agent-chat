from app.schemas.agent import AgentCreate
from app.services.agent_service import AgentService


class FakeRepo:
    def __init__(self) -> None:
        self.items = []

    def create(self, payload: AgentCreate):
        self.items.append(payload)
        return payload

    def list(self):
        return self.items


def test_agent_service_create_and_list() -> None:
    repo = FakeRepo()
    service = AgentService(repository=repo)

    service.create_agent(
        AgentCreate(
            id="agent-1",
            name="CTO Agent",
            persona="architect",
            org_type="squad",
            org_unit="core",
        )
    )

    assert len(service.list_agents()) == 1
