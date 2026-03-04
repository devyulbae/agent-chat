from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends

from app.containers.app_container import AppContainer
from app.schemas.agent import AgentCreate, AgentRead
from app.schemas.credential import CredentialCreate, CredentialRead
from app.schemas.organization import OrganizationCreate, OrganizationRead
from app.services.agent_service import AgentService
from app.services.credential_service import CredentialService
from app.services.organization_service import OrganizationService

router = APIRouter()


@router.post("/agents", response_model=AgentRead)
@inject
def create_agent(
    payload: AgentCreate,
    service: AgentService = Depends(Provide[AppContainer.agent_service]),
):
    entity = service.create_agent(payload)
    return AgentRead.from_entity(entity)


@router.get("/agents", response_model=list[AgentRead])
@inject
def list_agents(
    service: AgentService = Depends(Provide[AppContainer.agent_service]),
):
    return [AgentRead.from_entity(agent) for agent in service.list_agents()]


@router.post("/organizations", response_model=OrganizationRead)
@inject
def create_organization(
    payload: OrganizationCreate,
    service: OrganizationService = Depends(Provide[AppContainer.organization_service]),
):
    entity = service.create_organization(payload)
    return OrganizationRead.from_entity(entity)


@router.get("/organizations", response_model=list[OrganizationRead])
@inject
def list_organizations(
    service: OrganizationService = Depends(Provide[AppContainer.organization_service]),
):
    return [OrganizationRead.from_entity(org) for org in service.list_organizations()]


@router.post("/credentials", response_model=CredentialRead)
@inject
def create_credential(
    payload: CredentialCreate,
    service: CredentialService = Depends(Provide[AppContainer.credential_service]),
):
    entity = service.create_credential(payload)
    return CredentialRead.from_entity(entity)


@router.get("/credentials", response_model=list[CredentialRead])
@inject
def list_credentials(
    service: CredentialService = Depends(Provide[AppContainer.credential_service]),
):
    return [CredentialRead.from_entity(item) for item in service.list_credentials()]
