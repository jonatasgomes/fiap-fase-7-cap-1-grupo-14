#!/usr/bin/env python3
"""Smoke test do backend CardioIA — exercita o fluxo ponta a ponta.

Não sobe nada: assume o backend já rodando. Útil para validar um deploy.

    python scripts/smoke.py                       # localhost
    BASE=https://api.exemplo.com python scripts/smoke.py
"""

import os
import sys
import time

import httpx

BASE = os.getenv("BASE", "http://127.0.0.1:8000")
DEVICE_TOKEN = os.getenv("DEVICE_TOKEN", "wokwi-dev-token")
USUARIO = os.getenv("DEMO_USERNAME", "medico")
SENHA = os.getenv("DEMO_PASSWORD", "cardioia123")


def main() -> int:
    for _ in range(30):
        try:
            if httpx.get(f"{BASE}/health", timeout=2).status_code == 200:
                break
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    else:
        print("Backend não respondeu em /health")
        return 1

    print("health:", httpx.get(f"{BASE}/health").json())

    r = httpx.post(f"{BASE}/autenticacao/login", json={"usuario": USUARIO, "senha": SENHA})
    assert r.status_code == 200, ("login", r.status_code, r.text)
    ujwt = {"Authorization": f"Bearer {r.json()['token_acesso']}"}
    udev = {"Authorization": f"Bearer {DEVICE_TOKEN}"}

    assert httpx.get(f"{BASE}/pacientes").status_code == 401  # sem token
    pacientes = httpx.get(f"{BASE}/pacientes", headers=ujwt)
    assert pacientes.status_code == 200, pacientes.text
    print("/pacientes ->", len(pacientes.json()), "pacientes")

    for s in (
        {"paciente_id": 1, "fc": 78, "temperatura": 36.6},   # baixo
        {"paciente_id": 1, "fc": 150, "temperatura": 39.4},  # alto
        {"paciente_id": 2, "fc": 110, "temperatura": 37.7},  # medio
    ):
        d = httpx.post(f"{BASE}/telemetria", json=s, headers=udev).json()
        print(f"telemetria {s} -> {d['nivel_risco']} ({d['pontuacao_risco']:.0%})")

    print("/pacientes/1/ultima ->", httpx.get(f"{BASE}/pacientes/1/ultima", headers=ujwt).json()["nivel_risco"])
    print("/alertas ->", len(httpx.get(f"{BASE}/alertas", headers=ujwt).json()), "alerta(s)")

    # CRUD de paciente (cria -> edita -> remove; autolimpa)
    novo = httpx.post(f"{BASE}/pacientes", headers=ujwt,
                      json={"nome": "Teste Smoke", "idade": 60, "sexo": "M"}).json()
    pid = novo["id"]
    upd = httpx.put(f"{BASE}/pacientes/{pid}", headers=ujwt,
                    json={"nome": "Teste Editado", "idade": 61, "sexo": "M", "observacoes": "ok"}).json()
    dele = httpx.delete(f"{BASE}/pacientes/{pid}", headers=ujwt)
    print(f"CRUD paciente -> criado id={pid}, editado nome={upd['nome']!r}, removido HTTP {dele.status_code}")

    # Assistente multi-turno (cria conversa -> continua -> apaga)
    r1 = httpx.post(f"{BASE}/assistente", json={"mensagem": "Como está o paciente 1?", "paciente_id": 1}, headers=ujwt).json()
    cid = r1["conversa_id"]
    r2 = httpx.post(f"{BASE}/assistente", json={"mensagem": "E o que devo fazer?", "conversa_id": cid}, headers=ujwt).json()
    dc = httpx.delete(f"{BASE}/assistente/{cid}", headers=ujwt)
    print(f"/assistente -> modelo={r1['modelo']} mesma_conversa={r2['conversa_id'] == cid} delete=HTTP {dc.status_code}")

    # Emulador (ligar -> status -> desligar)
    st0 = httpx.get(f"{BASE}/emulador", headers=ujwt).json()
    httpx.post(f"{BASE}/emulador/ligar", json={"pacientes": [1, 2], "intervalo": 0.5}, headers=ujwt)
    time.sleep(1.5)
    st1 = httpx.get(f"{BASE}/emulador", headers=ujwt).json()
    httpx.post(f"{BASE}/emulador/desligar", headers=ujwt)
    st2 = httpx.get(f"{BASE}/emulador", headers=ujwt).json()
    print(f"/emulador -> antes={st0['ligado']} ligado={st1['ligado']} leituras={st1['leituras_geradas']} depois={st2['ligado']}")

    print("\nSMOKE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
