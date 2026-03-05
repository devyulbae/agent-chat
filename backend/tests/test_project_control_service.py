from app.schemas.project_control import ProjectControlCreate, ProjectControlUpdate
from app.services.project_control_service import ProjectControlService


class FakeRepo:
    def __init__(self) -> None:
        self.items = {}

    def create(self, payload: ProjectControlCreate):
        self.items[payload.id] = payload
        return payload

    def list(self):
        return list(self.items.values())

    def get(self, row_id: str):
        return self.items.get(row_id)

    def save(self, row):
        self.items[row.id] = row
        return row


def test_project_level_mapping_and_update() -> None:
    svc = ProjectControlService(repository=FakeRepo())
    row = svc.create(
        ProjectControlCreate(
            id="pc-1",
            project_key="agentchat",
            level="L1",
            owner="COO",
        )
    )
    assert svc.recommended_cron(row.level) == "*/10 * * * *"
    updated = svc.update("pc-1", ProjectControlUpdate(level="L3"))
    assert updated is not None
    assert svc.recommended_cron(updated.level) == "0 */3 * * *"
