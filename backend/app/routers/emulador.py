from fastapi import APIRouter, Depends

from ..schemas import EmuladorConfig, EmuladorStatus
from ..security import get_current_user
from ..services.simulador import simulador

router = APIRouter(
    prefix="/emulador",
    tags=["emulador"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=EmuladorStatus)
def status() -> dict:
    return simulador.status()


@router.post("/ligar", response_model=EmuladorStatus)
def ligar(config: EmuladorConfig | None = None) -> dict:
    config = config or EmuladorConfig()
    return simulador.iniciar(config.pacientes, config.intervalo)


@router.post("/desligar", response_model=EmuladorStatus)
def desligar() -> dict:
    return simulador.parar()
