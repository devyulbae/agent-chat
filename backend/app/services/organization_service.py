from typing import Sequence

from app.repositories.organization_repository import OrganizationRepository
from app.schemas.organization import OrganizationCreate


class OrganizationService:
    def __init__(self, repository: OrganizationRepository) -> None:
        self._repository = repository

    def create_organization(self, payload: OrganizationCreate):
        return self._repository.create(payload)

    def list_organizations(self) -> Sequence[object]:
        return self._repository.list()
