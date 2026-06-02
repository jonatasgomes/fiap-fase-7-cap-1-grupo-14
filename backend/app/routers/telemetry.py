from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, select

from ..database import get_session
from ..models import Leitura, Paciente, utcnow
from ..schemas import (
    AlertaSaida,
    LeituraSaida,
    PacienteEntrada,
    PacienteSaida,
    PacienteStatus,
    TelemetriaEntrada,
)
from ..security import get_current_user, verify_device
from ..services.predictor import predict

router = APIRouter(tags=["monitoramento"])

NIVEIS_ALERTA = {"medio", "alto"}


def _leitura_out(r: Leitura) -> LeituraSaida:
    return LeituraSaida(
        id=r.id,
        paciente_id=r.paciente_id,
        momento=r.momento,
        fc=r.fc,
        temperatura=r.temperatura,
        pontuacao_risco=r.pontuacao_risco,
        nivel_risco=r.nivel_risco,
        recomendacao=r.recomendacao,
    )


def _paciente_out(p: Paciente) -> PacienteSaida:
    return PacienteSaida(
        id=p.id,
        nome=p.nome,
        idade=p.idade,
        sexo=p.sexo or "?",
        observacoes=p.observacoes or "",
    )


def _ultima_leitura(session: Session, paciente_id: int) -> Leitura | None:
    return session.exec(
        select(Leitura)
        .where(Leitura.paciente_id == paciente_id)
        .order_by(col(Leitura.momento).desc())
        .limit(1)
    ).first()


# ---------------- Ingestão (dispositivo) ----------------


@router.post(
    "/telemetria",
    response_model=LeituraSaida,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_device)],
)
def ingerir(body: TelemetriaEntrada, session: Session = Depends(get_session)) -> LeituraSaida:
    """Recebe um sinal do Wokwi (ou do emulador), classifica o risco e grava."""
    paciente = session.get(Paciente, body.paciente_id)
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado"
        )
    score, nivel, reco = predict(body.fc, body.temperatura, paciente.idade)
    leitura = Leitura(
        paciente_id=body.paciente_id,
        momento=body.momento or utcnow(),
        fc=body.fc,
        temperatura=body.temperatura,
        pontuacao_risco=score,
        nivel_risco=nivel,
        recomendacao=reco,
    )
    session.add(leitura)
    session.commit()
    session.refresh(leitura)
    return _leitura_out(leitura)


# ---------------- Pacientes (CRUD + leitura) ----------------


@router.get(
    "/pacientes",
    response_model=list[PacienteStatus],
    dependencies=[Depends(get_current_user)],
)
def listar_pacientes(session: Session = Depends(get_session)) -> list[PacienteStatus]:
    pacientes = session.exec(select(Paciente).order_by(col(Paciente.id))).all()
    saida: list[PacienteStatus] = []
    for p in pacientes:
        ultima = _ultima_leitura(session, p.id)
        saida.append(
            PacienteStatus(
                paciente=_paciente_out(p),
                ultima=_leitura_out(ultima) if ultima else None,
            )
        )
    return saida


@router.post(
    "/pacientes",
    response_model=PacienteSaida,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_user)],
)
def criar_paciente(body: PacienteEntrada, session: Session = Depends(get_session)) -> PacienteSaida:
    paciente = Paciente(
        nome=body.nome, idade=body.idade, sexo=body.sexo, observacoes=body.observacoes
    )
    session.add(paciente)
    session.commit()
    session.refresh(paciente)
    return _paciente_out(paciente)


@router.put(
    "/pacientes/{paciente_id}",
    response_model=PacienteSaida,
    dependencies=[Depends(get_current_user)],
)
def atualizar_paciente(
    paciente_id: int, body: PacienteEntrada, session: Session = Depends(get_session)
) -> PacienteSaida:
    paciente = session.get(Paciente, paciente_id)
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado"
        )
    paciente.nome = body.nome
    paciente.idade = body.idade
    paciente.sexo = body.sexo
    paciente.observacoes = body.observacoes
    session.add(paciente)
    session.commit()
    session.refresh(paciente)
    return _paciente_out(paciente)


@router.delete(
    "/pacientes/{paciente_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_user)],
)
def remover_paciente(paciente_id: int, session: Session = Depends(get_session)) -> None:
    paciente = session.get(Paciente, paciente_id)
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado"
        )
    # remove as leituras primeiro (restrição de chave estrangeira)
    for leitura in session.exec(
        select(Leitura).where(Leitura.paciente_id == paciente_id)
    ).all():
        session.delete(leitura)
    session.delete(paciente)
    session.commit()


@router.get(
    "/pacientes/{paciente_id}/ultima",
    response_model=LeituraSaida,
    dependencies=[Depends(get_current_user)],
)
def ultima(paciente_id: int, session: Session = Depends(get_session)) -> LeituraSaida:
    leitura = _ultima_leitura(session, paciente_id)
    if not leitura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma leitura para este paciente",
        )
    return _leitura_out(leitura)


@router.get(
    "/pacientes/{paciente_id}/historico",
    response_model=list[LeituraSaida],
    dependencies=[Depends(get_current_user)],
)
def historico(
    paciente_id: int,
    limite: int = Query(default=100, ge=1, le=1000),
    session: Session = Depends(get_session),
) -> list[LeituraSaida]:
    linhas = session.exec(
        select(Leitura)
        .where(Leitura.paciente_id == paciente_id)
        .order_by(col(Leitura.momento).desc())
        .limit(limite)
    ).all()
    return [_leitura_out(r) for r in reversed(linhas)]


# ---------------- Alertas ----------------


@router.get(
    "/alertas",
    response_model=list[AlertaSaida],
    dependencies=[Depends(get_current_user)],
)
def alertas(session: Session = Depends(get_session)) -> list[AlertaSaida]:
    """Pacientes cuja última leitura está em risco médio/alto."""
    saida: list[AlertaSaida] = []
    for p in session.exec(select(Paciente).order_by(col(Paciente.id))).all():
        ultima = _ultima_leitura(session, p.id)
        if ultima and ultima.nivel_risco in NIVEIS_ALERTA:
            saida.append(AlertaSaida(paciente=_paciente_out(p), leitura=_leitura_out(ultima)))
    saida.sort(key=lambda a: a.leitura.pontuacao_risco, reverse=True)
    return saida
