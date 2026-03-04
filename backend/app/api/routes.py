from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

from app.containers.app_container import AppContainer
from app.core.ws_hub import WebSocketHub
from app.schemas.agent import AgentCreate, AgentRead
from app.schemas.channel import ChannelCreate, ChannelRead
from app.schemas.credential import CredentialCreate, CredentialRead, CredentialUpdate
from app.schemas.message import MessageCreate, MessageRead, ThreadSummaryRead
from app.schemas.organization import OrganizationCreate, OrganizationRead
from app.services.agent_service import AgentService
from app.services.channel_service import ChannelService
from app.services.credential_service import CredentialService
from app.services.message_service import MessageService
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


@router.get("/organizations/graph")
@inject
def organizations_graph(
    service: OrganizationService = Depends(Provide[AppContainer.organization_service]),
):
    items = [
        OrganizationRead.from_entity(org).model_dump()
        for org in service.list_organizations()
    ]
    by_type: dict[str, list[dict]] = {"freeform": [], "department": [], "squad": []}
    for item in items:
        by_type.setdefault(item["org_type"], []).append(item)
    return {"items": items, "by_type": by_type}


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


@router.patch("/credentials/{credential_id}", response_model=CredentialRead)
@inject
def update_credential(
    credential_id: str,
    payload: CredentialUpdate,
    service: CredentialService = Depends(Provide[AppContainer.credential_service]),
):
    entity = service.update_credential(credential_id, payload)
    if entity is None:
        raise HTTPException(status_code=404, detail="Credential not found")
    return CredentialRead.from_entity(entity)


@router.delete("/credentials/{credential_id}")
@inject
def delete_credential(
    credential_id: str,
    service: CredentialService = Depends(Provide[AppContainer.credential_service]),
):
    deleted = service.delete_credential(credential_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Credential not found")
    return {"deleted": True}


@router.post("/credentials/{credential_id}/rotate", response_model=CredentialRead)
@inject
def rotate_credential(
    credential_id: str,
    key_version: str,
    service: CredentialService = Depends(Provide[AppContainer.credential_service]),
):
    entity = service.rotate_key(credential_id, key_version)
    if entity is None:
        raise HTTPException(status_code=404, detail="Credential not found")
    return CredentialRead.from_entity(entity)


@router.post("/channels", response_model=ChannelRead)
@inject
def create_channel(
    payload: ChannelCreate,
    service: ChannelService = Depends(Provide[AppContainer.channel_service]),
):
    entity = service.create_channel(payload)
    return ChannelRead.from_entity(entity)


@router.get("/channels", response_model=list[ChannelRead])
@inject
def list_channels(
    service: ChannelService = Depends(Provide[AppContainer.channel_service]),
):
    return [ChannelRead.from_entity(item) for item in service.list_channels()]


@router.post("/messages", response_model=MessageRead)
@inject
async def create_message(
    payload: MessageCreate,
    service: MessageService = Depends(Provide[AppContainer.message_service]),
    ws_hub: WebSocketHub = Depends(Provide[AppContainer.ws_hub]),
):
    entity = service.create_message(payload)
    dto = MessageRead.from_entity(entity)
    await ws_hub.broadcast(
        payload.channel_id,
        {"event": "new_message", "message": dto.model_dump()},
    )
    return dto


@router.get("/channels/{channel_id}/threads", response_model=list[ThreadSummaryRead])
@inject
def list_threads(
    channel_id: str,
    service: MessageService = Depends(Provide[AppContainer.message_service]),
):
    return [
        ThreadSummaryRead.from_entity(item) for item in service.list_threads(channel_id)
    ]


@router.get("/channels/{channel_id}/messages", response_model=list[MessageRead])
@inject
def list_messages(
    channel_id: str,
    thread_id: str | None = None,
    service: MessageService = Depends(Provide[AppContainer.message_service]),
):
    return [
        MessageRead.from_entity(item)
        for item in service.list_messages(channel_id, thread_id)
    ]


@router.websocket("/ws/channels/{channel_id}")
@inject
async def ws_channel(
    websocket: WebSocket,
    channel_id: str,
    ws_hub: WebSocketHub = Depends(Provide[AppContainer.ws_hub]),
):
    await ws_hub.connect(channel_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect(channel_id, websocket)
