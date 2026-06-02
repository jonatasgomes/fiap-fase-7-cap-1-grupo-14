from sqlmodel import Session, select

from ..models import Paciente

PACIENTES_DEMO = [
    {"nome": "Maria Silva", "idade": 67, "sexo": "F", "observacoes": "Hipertensa, pós-infarto"},
    {"nome": "João Souza", "idade": 54, "sexo": "M", "observacoes": "Arritmia em monitoramento"},
    {"nome": "Ana Pereira", "idade": 72, "sexo": "F", "observacoes": "Insuficiência cardíaca"},
]


def seed_patients(session: Session) -> None:
    if session.exec(select(Paciente)).first():
        return
    for dados in PACIENTES_DEMO:
        session.add(Paciente(**dados))
    session.commit()
