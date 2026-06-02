# CardioIA — Arquitetura Final (Fase 7)

Ecossistema fim-a-fim que integra as fases anteriores num produto funcional:
**sensores (IoT em MicroPython) → backend Python → motores de IA → interfaces Web e
Mobile**, com persistência em Oracle e exposição HTTPS via Cloudflare Tunnel.

> Fluxo resumido: **Sensor → MicroPython (ESP32) → Backend FastAPI → APIs de IA (Fase 6 + Gemini) → UI (Web/Mobile)**.

## Visão geral (diagrama de blocos)

```mermaid
flowchart LR
  subgraph EDGE["Borda / IoT"]
    direction TB
    SENS["Sensores<br/>FC + temperatura"]
    ESP["ESP32 · MicroPython<br/>(Wokwi) · OLED + LED"]
    EMU["Emulador (fallback do Wokwi)<br/>script CLI emulate.py"]
    SENS --> ESP
  end

  subgraph BACK["Backend FastAPI — OCI + Cloudflare Tunnel (HTTPS)"]
    direction TB
    API["API REST pt-BR<br/>SQLModel · auth Bearer"]
    F6["Fase 6 — Motor preditivo<br/>RandomForest (sklearn)"]
    F5["Fase 5 — Assistente<br/>orquestra o Gemini"]
    EMUI["Emulador in-process<br/>(ligado/desligado pela UI)"]
    API --> F6
    API --> F5
    API -. controla .-> EMUI
  end

  DB[("Oracle Autonomous DB<br/>pacientes · leituras")]
  GEMINI["Google Gemini API<br/>(LLM externo)"]

  subgraph CLIENTS["Interfaces (auth Bearer JWT)"]
    direction TB
    WEB["Web · React + Vite<br/>Vercel (CI/CD)"]
    MOB["Mobile · React Native + Expo<br/>APK via EAS"]
  end

  ESP -->|"POST /telemetria<br/>Bearer DEVICE_TOKEN"| API
  EMU -->|"POST /telemetria"| API
  API -->|"fc, temp, idade"| F6
  F6 -->|"risco + recomendacao"| API
  API <-->|"ORM (pacientes, leituras)"| DB
  EMUI -->|"leituras sinteticas"| DB
  API -->|"mensagem + contexto"| F5
  F5 <-->|"prompt / resposta"| GEMINI

  WEB <-->|"login → JWT<br/>polling REST"| API
  MOB <-->|"login → JWT (SecureStore)<br/>polling REST"| API
```

## Camadas e tecnologias

| Camada | Tecnologia | Papel |
|---|---|---|
| **Borda / IoT** | ESP32 + **MicroPython** (Wokwi); OLED SSD1306 + LED | Lê FC/temperatura e envia telemetria; feedback visual local |
| **Ingestão (fallback)** | `emulator/emulate.py` (CLI) · emulador in-process (`/emulador`) | Alimenta a frota de pacientes quando não há hardware |
| **Backend** | **Python · FastAPI · SQLModel** (OCI Ubuntu, systemd) | Núcleo integrador; API REST pt-BR; auth Bearer (2 níveis) |
| **IA — Fase 6** | **scikit-learn** RandomForest | Classifica o risco → `pontuacao_risco`, `nivel_risco`, `recomendacao` |
| **IA — Fase 5** | **Google Gemini** (`gemini-3.1-flash-lite`) | Assistente conversacional multi-turno (`/assistente`) |
| **Dados** | **Oracle Autonomous DB** (thin mode, TLS) | Tabelas `pacientes` e `leituras` |
| **Exposição** | **Cloudflare Tunnel** (HTTPS) | URL pública sem abrir portas |
| **Web** | **React 19 + Vite + TS + Tailwind** → **Vercel** (CI/CD) | Painel, dossiê, alertas, assistente (polling) |
| **Mobile** | **React Native + Expo (SDK 56)** → **APK via EAS** | Login, painel, dossiê, assistente; token no SecureStore |

## Fluxo 1 — Ingestão de telemetria

```mermaid
sequenceDiagram
  participant W as ESP32 / Emulador
  participant A as Backend FastAPI
  participant M as Motor Fase 6 (RandomForest)
  participant O as Oracle ADB
  W->>A: POST /telemetria { paciente_id, fc, temperatura }  · Bearer DEVICE_TOKEN
  A->>M: predict(fc, temperatura, idade)
  M-->>A: pontuacao_risco, nivel_risco, recomendacao
  A->>O: INSERT leitura
  A-->>W: 201 LeituraSaida
```

## Fluxo 2 — Consumo pelas interfaces (Web / Mobile)

```mermaid
sequenceDiagram
  participant U as Web / Mobile
  participant A as Backend FastAPI
  participant O as Oracle ADB
  participant G as Gemini
  U->>A: POST /autenticacao/login { usuario, senha }
  A-->>U: token_acesso (JWT)
  loop polling ~4 s
    U->>A: GET /pacientes  · Bearer JWT
    A->>O: SELECT pacientes + ultima leitura (ORDER BY id)
    O-->>A: dados
    A-->>U: [ { paciente, ultima } ]
  end
  U->>A: POST /assistente { mensagem, paciente_id }  · Bearer JWT
  A->>G: prompt + contexto clinico
  G-->>A: resposta
  A-->>U: { resposta, modelo, conversa_id }
```

## Motor preditivo (Fase 6) — duas camadas

```mermaid
flowchart LR
  IN["FC + temperatura (sensor)<br/>idade (cadastro do paciente)"] --> RF["RandomForest<br/>Camada 1 · ML"]
  RF --> SC["pontuacao_risco<br/>(0–1)"]
  SC --> TH["regra de limiar<br/>Camada 2 · deterministica"]
  TH --> OUT["nivel_risco (baixo / medio / alto)<br/>+ recomendacao (template)"]
```

O LLM (Gemini) **não** participa do cálculo de risco — atua apenas no `/assistente`.
O texto da recomendação vem de um template por faixa, não do ML.

## Notas de operação

- **Autenticação Bearer em 2 níveis:** **JWT** para os frontends (obtido em `POST /autenticacao/login`) e **`DEVICE_TOKEN`** estático apenas para o dispositivo/emulador no `/telemetria`. O frontend nunca usa o `DEVICE_TOKEN`.
- **URL pública efêmera:** o quick tunnel (`*.trycloudflare.com`) muda se reiniciar. As UIs leem a base URL de configuração (Web: `VITE_API_URL`; Mobile: `app.json → extra.apiUrl`), com override em runtime.
- **Deploy:** Web na **Vercel** (push na `main` → deploy automático); Mobile em **APK via EAS Build** (perfil `preview`); Backend em **systemd** na OCI (`cardioia-api` + `cloudflared-quick`).

> Contrato completo da API: [`../backend/README.md`](../backend/README.md). Como exportar este diagrama para o PDF: abra no GitHub (renderiza o Mermaid) e use *Imprimir → Salvar como PDF*, ou rode `mmdc` (mermaid-cli) sobre os blocos.
