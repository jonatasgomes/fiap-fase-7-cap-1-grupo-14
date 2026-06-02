from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

settings = get_settings()


def _make_engine():
    if settings.use_oracle:
        # python-oracledb em thin mode (default, sem Instant Client) e sem wallet.
        # user/password/dsn vão em connect_args para não quebrar com caracteres
        # especiais na senha (não dá para colocar na URL com segurança).
        return create_engine(
            "oracle+oracledb://",
            connect_args={
                "user": settings.oracle_user,
                "password": settings.oracle_password,
                "dsn": settings.oracle_dsn,
            },
            pool_pre_ping=True,
        )
    connect_args = (
        {"check_same_thread": False}
        if settings.database_url.startswith("sqlite")
        else {}
    )
    return create_engine(settings.database_url, echo=False, connect_args=connect_args)


engine = _make_engine()


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
