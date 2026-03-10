from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool


def create_session_factory(database_url: str) -> sessionmaker[Session]:
    # Temporary safety valve: DI currently creates short-lived sessions per request
    # without explicit close hooks. NullPool avoids QueuePool exhaustion under bursty probes.
    engine = create_engine(database_url, future=True, poolclass=NullPool)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)
