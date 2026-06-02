"""Simulador de telemetria in-process, controlável pela API.

Roda numa thread de fundo: a cada `intervalo` segundos gera uma leitura por
paciente configurado (random walk + picos), classifica o risco (Fase 6) e grava
no banco. Permite o frontend ligar/desligar a simulação sem SSH/CLI.

Observação: estado em memória de processo único (nosso uvicorn roda 1 worker).
Para multi-worker, isto precisaria de coordenação externa.
"""

from __future__ import annotations

import random
import threading

from sqlmodel import Session, col, select

from ..database import engine
from ..models import Leitura, Paciente
from .predictor import predict


class _Simulador:
    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self.pacientes: list[int] = []           # alvo configurado ([] = todos)
        self._pids_efetivos: list[int] = []       # ids realmente alimentados (p/ status)
        self.intervalo: float = 3.0
        self.leituras_geradas: int = 0
        self._estados: dict[int, dict] = {}

    @property
    def ligado(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    @staticmethod
    def _estado_inicial() -> dict:
        return {
            "fc": 75.0,
            "temperatura": 36.6,
            "base_fc": random.uniform(65, 85),
            "base_temp": random.uniform(36.2, 36.9),
        }

    @staticmethod
    def _passo(e: dict) -> tuple[float, float]:
        e["fc"] += random.uniform(-4, 4)
        e["temperatura"] += random.uniform(-0.15, 0.15)
        if random.random() < 0.08:
            e["fc"] += random.choice([-1, 1]) * random.uniform(15, 45)
        if random.random() < 0.05:
            e["temperatura"] += random.uniform(0.4, 1.3)
        e["fc"] += (e["base_fc"] - e["fc"]) * 0.1
        e["temperatura"] += (e["base_temp"] - e["temperatura"]) * 0.1
        e["fc"] = max(40.0, min(190.0, e["fc"]))
        e["temperatura"] = max(34.5, min(41.0, e["temperatura"]))
        return round(e["fc"], 1), round(e["temperatura"], 2)

    def _ids_alvo(self, session: Session) -> list[int]:
        """Ids a alimentar: a lista configurada ou, se vazia, TODOS os pacientes
        existentes — resolvido a cada ciclo, então acompanha cadastros novos."""
        if self.pacientes:
            return self.pacientes
        return list(session.exec(select(Paciente.id).order_by(col(Paciente.id))).all())

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                with Session(engine) as session:
                    ids = self._ids_alvo(session)
                    self._pids_efetivos = ids
                    for pid in ids:
                        paciente = session.get(Paciente, pid)
                        if not paciente:
                            continue
                        estado = self._estados.setdefault(pid, self._estado_inicial())
                        fc, temp = self._passo(estado)
                        score, nivel, reco = predict(fc, temp, paciente.idade)
                        session.add(
                            Leitura(
                                paciente_id=pid,
                                fc=fc,
                                temperatura=temp,
                                pontuacao_risco=score,
                                nivel_risco=nivel,
                                recomendacao=reco,
                            )
                        )
                        self.leituras_geradas += 1
                    session.commit()
            except Exception:
                # não derruba a thread por uma falha pontual de banco/rede
                pass
            self._stop.wait(self.intervalo)

    def iniciar(self, pacientes: list[int], intervalo: float) -> dict:
        with self._lock:
            if self.ligado:
                return self.status()
            self.pacientes = pacientes
            self.intervalo = intervalo
            self.leituras_geradas = 0
            self._estados = {}
            with Session(engine) as session:
                self._pids_efetivos = self._ids_alvo(session)
            self._stop.clear()
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()
            return self.status()

    def parar(self) -> dict:
        with self._lock:
            if self.ligado:
                self._stop.set()
                self._thread.join(timeout=5)
            self._thread = None
            return self.status()

    def status(self) -> dict:
        return {
            "ligado": self.ligado,
            "pacientes": self._pids_efetivos if self.ligado else self.pacientes,
            "intervalo": self.intervalo,
            "leituras_geradas": self.leituras_geradas,
        }


simulador = _Simulador()
