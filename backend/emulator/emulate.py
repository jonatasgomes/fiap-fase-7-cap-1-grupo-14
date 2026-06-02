#!/usr/bin/env python3
"""Emulador de telemetria — fallback confiável do Wokwi.

Faz POST contínuo em /telemetria com leituras sintéticas (random walk + picos
ocasionais), demonstrando o fluxo fim-a-fim quando o Wokwi estiver instável.
Usa o MESMO endpoint e o MESMO DEVICE_TOKEN do dispositivo real — o caminho
até a UI é idêntico, com ou sem hardware.

Uso:
    python emulate.py --url https://api.exemplo.com --token <DEVICE_TOKEN>
    python emulate.py --once          # uma rodada e sai (útil em testes)
"""

import argparse
import os
import random
import time

import httpx


def passo(estado: dict) -> tuple[float, float]:
    estado["fc"] += random.uniform(-4, 4)
    estado["temperatura"] += random.uniform(-0.15, 0.15)
    if random.random() < 0.08:  # pico de FC ocasional (taqui/bradicardia)
        estado["fc"] += random.choice([-1, 1]) * random.uniform(15, 45)
    if random.random() < 0.05:  # episódio febril ocasional
        estado["temperatura"] += random.uniform(0.4, 1.3)
    # atração suave de volta ao baseline
    estado["fc"] += (estado["base_fc"] - estado["fc"]) * 0.1
    estado["temperatura"] += (estado["base_temp"] - estado["temperatura"]) * 0.1
    estado["fc"] = max(40.0, min(190.0, estado["fc"]))
    estado["temperatura"] = max(34.5, min(41.0, estado["temperatura"]))
    return round(estado["fc"], 1), round(estado["temperatura"], 2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Emulador de telemetria CardioIA")
    parser.add_argument("--url", default=os.getenv("BASE_URL", "http://localhost:8000"))
    parser.add_argument("--token", default=os.getenv("DEVICE_TOKEN", "wokwi-dev-token"))
    parser.add_argument("--patients", default="1,2,3", help="IDs separados por vírgula")
    parser.add_argument("--interval", type=float, default=3.0)
    parser.add_argument("--once", action="store_true", help="Envia uma rodada e sai")
    args = parser.parse_args()

    ids = [int(x) for x in args.patients.split(",") if x.strip()]
    estados = {
        pid: {
            "base_fc": random.uniform(65, 85),
            "base_temp": random.uniform(36.2, 36.9),
            "fc": 75.0,
            "temperatura": 36.6,
        }
        for pid in ids
    }
    headers = {"Authorization": f"Bearer {args.token}"}
    endpoint = args.url.rstrip("/") + "/telemetria"
    print(f"Emulando pacientes {ids} -> {endpoint} (intervalo {args.interval}s)")

    with httpx.Client(timeout=10) as client:
        while True:
            for pid in ids:
                fc, temperatura = passo(estados[pid])
                payload = {"paciente_id": pid, "fc": fc, "temperatura": temperatura}
                try:
                    r = client.post(endpoint, json=payload, headers=headers)
                    if r.status_code == 201:
                        d = r.json()
                        print(
                            f"  paciente {pid}: FC {fc} bpm, {temperatura} °C -> "
                            f"risco {d['nivel_risco']} ({d['pontuacao_risco']:.0%})"
                        )
                    else:
                        print(f"  paciente {pid}: HTTP {r.status_code} - {r.text[:120]}")
                except httpx.HTTPError as exc:
                    print(f"  paciente {pid}: erro de conexão - {exc}")
            if args.once:
                break
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
