import os

from fastapi import FastAPI

from app.api.routes import router
from app.containers.app_container import AppContainer
from app.domain.models import Base
from app.core.db import create_session_factory


def create_app() -> FastAPI:
    app = FastAPI(title="Agent Chat API", version="0.3.0")

    database_url = os.getenv("DATABASE_URL", "sqlite+pysqlite:///./agent_chat.db")
    encryption_key = os.getenv(
        "APP_ENCRYPTION_KEY",
        "QvwtE6F0jZ0R8AhdL2_RfM9dK9h2gcNf3s1zP28A5I8=",
    )

    container = AppContainer()
    container.config.database_url.from_value(database_url)
    container.config.app_encryption_key.from_value(encryption_key)
    container.wire(modules=["app.api.routes"])

    session_factory = create_session_factory(database_url)
    Base.metadata.create_all(bind=session_factory.kw["bind"])

    app.container = container  # type: ignore[attr-defined]
    app.include_router(router, prefix="/api")

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    return app


app = create_app()
