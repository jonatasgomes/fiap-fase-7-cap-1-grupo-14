from datetime import datetime, timezone

from sqlalchemy import TIMESTAMP, Column, Identity, Integer
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Paciente(SQLModel, table=True):
    __tablename__ = "pacientes"

    id: int | None = Field(
        default=None, sa_column=Column(Integer, Identity(), primary_key=True)
    )
    nome: str = Field(max_length=120)
    idade: int
    # Oracle trata '' como NULL; campos opcionais ficam nullable p/ aceitar vazio.
    sexo: str | None = Field(default="?", max_length=8)
    observacoes: str | None = Field(default="", max_length=500)


class Leitura(SQLModel, table=True):
    __tablename__ = "leituras"

    id: int | None = Field(
        default=None, sa_column=Column(Integer, Identity(), primary_key=True)
    )
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    momento: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(TIMESTAMP(timezone=True), index=True),
    )
    fc: float
    temperatura: float
    pontuacao_risco: float = 0.0
    nivel_risco: str = Field(default="baixo", max_length=10)
    recomendacao: str = Field(default="", max_length=300)
