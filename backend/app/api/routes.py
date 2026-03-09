from dependency_injector.wiring import Provide, inject
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)

from app.containers.app_container import AppContainer
from app.core.ws_hub import WebSocketHub
from app.schemas.agent import AgentCreate, AgentRead
from app.schemas.audit import AuditEventRead
from app.schemas.channel import ChannelCreate, ChannelRead
from app.schemas.credential import CredentialCreate, CredentialRead, CredentialUpdate
from app.schemas.message import MessageCreate, MessageRead, ThreadSummaryRead
from app.schemas.organization import OrganizationCreate, OrganizationRead
from app.schemas.project_control import (
    ProjectControlCreate,
    ProjectControlRead,
    ProjectControlUpdate,
)
from app.schemas.workflow import (
    OrchestrationCanvas,
    WorkflowPattern,
)
from app.services.agent_service import AgentService
from app.services.audit_service import AuditService
from app.services.channel_service import ChannelService
from app.services.credential_service import CredentialService
from app.services.message_service import MessageService
from app.services.organization_service import OrganizationService
from app.services.project_control_service import ProjectControlService

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
    provider: str | None = None,
    owner_agent_id: str | None = None,
    token_status: str | None = None,
    expiring_within_hours: int = Query(default=24, ge=1, le=24 * 30),
    service: CredentialService = Depends(Provide[AppContainer.credential_service]),
):
    try:
        items = service.list_credentials(
            provider=provider,
            owner_agent_id=owner_agent_id,
            token_status=token_status,
            expiring_within_hours=expiring_within_hours,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return [CredentialRead.from_entity(item) for item in items]


@router.get("/credentials/providers", response_model=list[str])
@inject
def list_credential_providers(
    owner_agent_id: str | None = None,
    service: CredentialService = Depends(Provide[AppContainer.credential_service]),
):
    return list(service.list_providers(owner_agent_id=owner_agent_id))


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


@router.get("/audit-events", response_model=list[AuditEventRead])
@inject
def list_audit_events(
    entity_type: str | None = None,
    entity_id: str | None = None,
    event_type: str | None = None,
    action: str | None = None,
    provider: str | None = None,
    label: str | None = None,
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: AuditService = Depends(Provide[AppContainer.audit_service]),
):
    items = service.list_events(
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        action=action,
        provider=provider,
        label=label,
        limit=limit,
        offset=offset,
    )
    return [AuditEventRead.from_entity(item) for item in items]


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
    limit: int | None = Query(default=None, ge=1, le=500),
    service: MessageService = Depends(Provide[AppContainer.message_service]),
):
    return [
        MessageRead.from_entity(item)
        for item in service.list_messages(channel_id, thread_id, limit)
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


@router.post("/project-controls", response_model=ProjectControlRead)
@inject
def create_project_control(
    payload: ProjectControlCreate,
    service: ProjectControlService = Depends(
        Provide[AppContainer.project_control_service]
    ),
):
    entity = service.create(payload)
    return ProjectControlRead.from_entity(
        entity, service.recommended_cron(entity.level)
    )


@router.get("/project-controls", response_model=list[ProjectControlRead])
@inject
def list_project_controls(
    service: ProjectControlService = Depends(
        Provide[AppContainer.project_control_service]
    ),
):
    return [
        ProjectControlRead.from_entity(item, service.recommended_cron(item.level))
        for item in service.list()
    ]


@router.patch("/project-controls/{control_id}", response_model=ProjectControlRead)
@inject
def update_project_control(
    control_id: str,
    payload: ProjectControlUpdate,
    service: ProjectControlService = Depends(
        Provide[AppContainer.project_control_service]
    ),
):
    entity = service.update(control_id, payload)
    if entity is None:
        raise HTTPException(status_code=404, detail="Project control not found")
    return ProjectControlRead.from_entity(
        entity, service.recommended_cron(entity.level)
    )

WORKFLOW_PATTERNS: list[WorkflowPattern] = [
    WorkflowPattern(
        id="prompt_chaining",
        name="Prompt Chaining",
        description="Split tasks into sequential LLM steps.",
        best_for=["Chat workflows", "Tool-assisted agent steps"],
    ),
    WorkflowPattern(
        id="parallelization",
        name="Parallelization",
        description="Run independent branches and aggregate outputs.",
        best_for=["Evals", "Guardrails", "Batch analysis"],
    ),
    WorkflowPattern(
        id="orchestrator_worker",
        name="Orchestrator-Worker",
        description="Central planner delegates to specialized workers.",
        best_for=["Coding agents", "Agentic retrieval"],
    ),
    WorkflowPattern(
        id="evaluator_optimizer",
        name="Evaluator-Optimizer",
        description="Generator output is evaluated and iteratively refined.",
        best_for=["Quality loops", "Monitoring insights"],
    ),
    WorkflowPattern(
        id="router",
        name="Router",
        description="Classify input and dispatch to best agent/tool path.",
        best_for=["Support routing", "Multi-agent dispatch"],
    ),
    WorkflowPattern(
        id="autonomous_workflow",
        name="Autonomous Workflow",
        description="Agent acts based on environment feedback loops.",
        best_for=["Long-running ops", "Computer-use agents"],
    ),
    WorkflowPattern(
        id="reflexion",
        name="Reflexion",
        description="Self-critique and revise loop over intermediate outputs.",
        best_for=["Complex reasoning", "Adaptive correction"],
    ),
    WorkflowPattern(
        id="rewoo",
        name="ReWOO",
        description="Plan first, solve with workers, update tasks iteratively.",
        best_for=["Research", "Multi-step QA"],
    ),
    WorkflowPattern(
        id="plan_execute",
        name="Plan and Execute",
        description="Planner creates subtasks, executors run and report.",
        best_for=["Business automation", "Pipelines"],
    ),
]

ORCHESTRATION_CANVASES: dict[str, OrchestrationCanvas] = {}


@router.get("/workflow-patterns", response_model=list[WorkflowPattern])
def list_workflow_patterns():
    return WORKFLOW_PATTERNS


@router.get("/orchestration-canvases", response_model=list[OrchestrationCanvas])
def list_orchestration_canvases():
    return list(ORCHESTRATION_CANVASES.values())


@router.post("/orchestration-canvases", response_model=OrchestrationCanvas)
def upsert_orchestration_canvas(payload: OrchestrationCanvas):
    ORCHESTRATION_CANVASES[payload.id] = payload
    return payload


@router.get("/orchestration-canvases/{canvas_id}", response_model=OrchestrationCanvas)
def get_orchestration_canvas(canvas_id: str):
    canvas = ORCHESTRATION_CANVASES.get(canvas_id)
    if canvas is None:
        raise HTTPException(status_code=404, detail="Canvas not found")
    return canvas
