from app.schemas.organization import OrganizationCreate
from app.services.organization_service import OrganizationService


class FakeOrgRepo:
    def __init__(self) -> None:
        self.items = []

    def create(self, payload: OrganizationCreate):
        self.items.append(payload)
        return payload

    def list(self):
        return self.items


def test_organization_service_create_and_list() -> None:
    repo = FakeOrgRepo()
    service = OrganizationService(repository=repo)

    service.create_organization(
        OrganizationCreate(id="org-1", name="Core Squad", org_type="squad")
    )

    assert len(service.list_organizations()) == 1
