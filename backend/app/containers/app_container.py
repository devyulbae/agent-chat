from dependency_injector import containers, providers

from app.core.db import create_session_factory
from app.core.encryption import EncryptionService
from app.core.ws_hub import WebSocketHub
from app.repositories.agent_repository import SQLAgentRepository
from app.repositories.channel_repository import SQLChannelRepository
from app.repositories.credential_repository import SQLCredentialRepository
from app.repositories.message_repository import SQLMessageRepository
from app.repositories.organization_repository import SQLOrganizationRepository
from app.services.agent_service import AgentService
from app.services.audit_service import NoOpAuditLogger
from app.services.channel_service import ChannelService
from app.services.credential_service import CredentialService
from app.services.message_service import MessageService
from app.services.organization_service import OrganizationService


class AppContainer(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(modules=["app.api.routes"])

    config = providers.Configuration()

    session_factory = providers.Singleton(
        create_session_factory,
        database_url=config.database_url,
    )
    db_session = providers.Factory(session_factory.provided.__call__)

    encryption_service = providers.Singleton(
        EncryptionService,
        key=config.app_encryption_key,
    )
    ws_hub = providers.Singleton(WebSocketHub)
    audit_logger = providers.Singleton(NoOpAuditLogger)

    agent_repository = providers.Factory(SQLAgentRepository, session=db_session)
    organization_repository = providers.Factory(
        SQLOrganizationRepository, session=db_session
    )
    credential_repository = providers.Factory(
        SQLCredentialRepository, session=db_session
    )
    channel_repository = providers.Factory(SQLChannelRepository, session=db_session)
    message_repository = providers.Factory(SQLMessageRepository, session=db_session)

    agent_service = providers.Factory(AgentService, repository=agent_repository)
    organization_service = providers.Factory(
        OrganizationService,
        repository=organization_repository,
    )
    credential_service = providers.Factory(
        CredentialService,
        repository=credential_repository,
        encryption_service=encryption_service,
        audit_logger=audit_logger,
    )
    channel_service = providers.Factory(ChannelService, repository=channel_repository)
    message_service = providers.Factory(MessageService, repository=message_repository)
