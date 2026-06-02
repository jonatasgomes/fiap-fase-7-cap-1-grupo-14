from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, col, select

from ..database import get_session
from ..models import Leitura, Paciente
from ..schemas import MensagemChat, RespostaChat
from ..security import get_current_user
from ..services import llm

router = APIRouter(tags=["assistente"])

# Histórico de conversas em memória (processo único). Reinício do serviço zera.
# Para multi-worker/persistência, migrar para Redis/DB.
_conversas: dict[str, list[dict]] = {}
MAX_MENSAGENS = 20  # mantém as últimas N mensagens por conversa


def _montar_contexto(paciente: Paciente, ultima: Leitura | None) -> str:
    partes = [f"Paciente: {paciente.nome}, {paciente.idade} anos, sexo {paciente.sexo}."]
    if paciente.observacoes:
        partes.append(f"Histórico: {paciente.observacoes}.")
    if ultima:
        partes.append(
            f"Última leitura: FC {ultima.fc:.0f} bpm, temperatura {ultima.temperatura:.1f} °C, "
            f"risco {ultima.nivel_risco} ({ultima.pontuacao_risco:.0%}). "
            f"Recomendação vigente: {ultima.recomendacao}"
        )
    else:
        partes.append("Sem leituras registradas até o momento.")
    return " ".join(partes)


@router.post(
    "/assistente",
    response_model=RespostaChat,
    dependencies=[Depends(get_current_user)],
)
def assistente(body: MensagemChat, session: Session = Depends(get_session)) -> RespostaChat:
    contexto: str | None = None
    if body.paciente_id is not None:
        paciente = session.get(Paciente, body.paciente_id)
        if not paciente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado"
            )
        ultima = session.exec(
            select(Leitura)
            .where(Leitura.paciente_id == body.paciente_id)
            .order_by(col(Leitura.momento).desc())
            .limit(1)
        ).first()
        contexto = _montar_contexto(paciente, ultima)

    conversa_id = body.conversa_id or uuid4().hex
    historico = _conversas.setdefault(conversa_id, [])
    historico.append({"papel": "user", "conteudo": body.mensagem})

    resposta, modelo = llm.responder(historico, contexto)

    if modelo in ("error", "fallback"):
        # não deixa um turno de usuário sem resposta no histórico
        historico.pop()
    else:
        historico.append({"papel": "model", "conteudo": resposta})
        if len(historico) > MAX_MENSAGENS:
            del historico[: len(historico) - MAX_MENSAGENS]
            if historico and historico[0]["papel"] == "model":
                historico.pop(0)  # histórico deve começar por uma fala do usuário

    return RespostaChat(
        resposta=resposta,
        modelo=modelo,
        contextualizado=contexto is not None,
        conversa_id=conversa_id,
    )


@router.delete(
    "/assistente/{conversa_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_user)],
)
def encerrar_conversa(conversa_id: str) -> None:
    """Apaga o histórico da conversa (iniciar nova conversa)."""
    _conversas.pop(conversa_id, None)
