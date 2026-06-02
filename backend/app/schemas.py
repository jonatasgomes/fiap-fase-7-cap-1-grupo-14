from datetime import datetime

from pydantic import BaseModel, Field


class CredenciaisLogin(BaseModel):
    usuario: str
    senha: str


class RespostaToken(BaseModel):
    token_acesso: str
    tipo_token: str = "bearer"


class TelemetriaEntrada(BaseModel):
    paciente_id: int
    fc: float = Field(ge=0, le=300, description="Frequência cardíaca (bpm)")
    temperatura: float = Field(ge=20, le=45, description="Temperatura (°C)")
    momento: datetime | None = None


class LeituraSaida(BaseModel):
    id: int
    paciente_id: int
    momento: datetime
    fc: float
    temperatura: float
    pontuacao_risco: float
    nivel_risco: str
    recomendacao: str


class PacienteSaida(BaseModel):
    id: int
    nome: str
    idade: int
    sexo: str
    observacoes: str


class PacienteEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    idade: int = Field(ge=0, le=130)
    sexo: str = Field(default="?", max_length=8)
    observacoes: str = Field(default="", max_length=500)


class PacienteStatus(BaseModel):
    paciente: PacienteSaida
    ultima: LeituraSaida | None = None


class AlertaSaida(BaseModel):
    paciente: PacienteSaida
    leitura: LeituraSaida


class MensagemChat(BaseModel):
    mensagem: str
    paciente_id: int | None = None
    conversa_id: str | None = None


class RespostaChat(BaseModel):
    resposta: str
    modelo: str
    contextualizado: bool
    conversa_id: str


class EmuladorConfig(BaseModel):
    # Lista vazia (padrão) = todos os pacientes existentes, resolvidos dinamicamente
    # a cada ciclo. Informe ids para restringir a simulação a um subconjunto.
    pacientes: list[int] = Field(default_factory=list)
    intervalo: float = Field(default=3.0, ge=0.5, le=60)


class EmuladorStatus(BaseModel):
    ligado: bool
    pacientes: list[int]
    intervalo: float
    leituras_geradas: int
