# CardioIA — Backend (Fase 7)

Núcleo integrador em **Python/FastAPI**: recebe a telemetria dos sensores (Wokwi
ou emulador), classifica o risco com o **motor preditivo (Fase 6)**, responde o
**assistente conversacional (Fase 5, Gemini)** e expõe tudo às interfaces Web e
Mobile via API com autenticação **bearer**.

> A API é toda em **pt-BR** (rotas, campos JSON e tabelas do banco).

## 🌐 URL pública (produção)

O backend roda na VPS (OCI) exposto por um **Cloudflare quick tunnel** (HTTPS, sem
abrir portas). Swagger interativo em **`<URL>/docs`**.

> **URL atual (snapshot 2026-05-29):**
> `https://college-anonymous-thesaurus-assumption.trycloudflare.com`

⚠️ **A URL é efêmera** (quick tunnel sem domínio): muda toda vez que o túnel
reinicia. **Sempre confirme a URL vigente** com:

```bash
ssh oracle-large-br "journalctl -u cloudflared-quick | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1"
```

Teste rápido (de qualquer lugar):

```bash
curl -s https://<URL>.trycloudflare.com/health     # {"status":"ok",...}
```

Para uma **URL fixa**, registrar um domínio no Cloudflare e migrar para *named
tunnel* — ver "Upgrade" no fim deste doc.

## Fluxo de dados

```
 Wokwi (ESP32 + MicroPython) ─┐
   FC + temperatura           │  POST /telemetria  (Bearer DEVICE_TOKEN)
                              ▼
        ┌───────────────────────────────────────────────┐
        │  Backend FastAPI (OCI, atrás do Cloudflare Tunnel)
        │   • Oracle Autonomous DB (histórico)            │
        │   • Motor preditivo Fase 6 (sklearn) → risco    │
        │   • Assistente Fase 5 (Gemini) → /assistente    │
        └───────────────────────────────────────────────┘
                              ▲
 Web (Vercel) / Mobile (APK) ─┘  GET /pacientes,/ultima,/historico,/alertas ; POST /assistente
                                 (Bearer JWT obtido em /autenticacao/login) — polling
 Emulador (fallback do Wokwi) ──┘  POST /telemetria (mesmo payload)
```

## Contrato da API (para os frontends)

Autenticação **bearer** em dois níveis:
- **Frontends** fazem `POST /autenticacao/login` e usam o **JWT** nas rotas de leitura e no `/assistente`.
- **Dispositivo/emulador** usam o **`DEVICE_TOKEN`** estático apenas no `/telemetria`.

| Método | Rota | Auth | Corpo / Query | Resposta |
|---|---|---|---|---|
| POST | `/autenticacao/login` | — | `{usuario, senha}` | `{token_acesso, tipo_token}` |
| POST | `/telemetria` | DEVICE_TOKEN | `{paciente_id, fc, temperatura, momento?}` | `201` `LeituraSaida` |
| GET | `/pacientes` | JWT | — | `[{paciente, ultima}]` (ordenado por id) |
| POST | `/pacientes` | JWT | `{nome, idade, sexo?, observacoes?}` | `201` `PacienteSaida` |
| PUT | `/pacientes/{id}` | JWT | `{nome, idade, sexo, observacoes}` | `PacienteSaida` (404) |
| DELETE | `/pacientes/{id}` | JWT | — | `204` (remove as leituras junto) |
| GET | `/pacientes/{id}/ultima` | JWT | — | `LeituraSaida` (404 se vazio) |
| GET | `/pacientes/{id}/historico` | JWT | `?limite=100` | `[LeituraSaida]` (ordem crescente) |
| GET | `/alertas` | JWT | — | `[{paciente, leitura}]` (risco médio/alto) |
| POST | `/assistente` | JWT | `{mensagem, paciente_id?, conversa_id?}` | `{resposta, modelo, contextualizado, conversa_id}` |
| DELETE | `/assistente/{conversa_id}` | JWT | — | `204` (apaga histórico / nova conversa) |
| GET | `/emulador` | JWT | — | `{ligado, pacientes, intervalo, leituras_geradas}` |
| POST | `/emulador/ligar` | JWT | `{pacientes?, intervalo?}` (pacientes vazio/omitido = todos) | `EmuladorStatus` |
| POST | `/emulador/desligar` | JWT | — | `EmuladorStatus` |
| GET | `/health` | — | — | `{status, service}` |

```jsonc
// LeituraSaida
{ "id": 12, "paciente_id": 1, "momento": "2026-05-28T18:00:00Z",
  "fc": 150, "temperatura": 39.4, "pontuacao_risco": 0.99,
  "nivel_risco": "alto", "recomendacao": "Risco elevado..." }
// PacienteSaida
{ "id": 1, "nome": "Maria Silva", "idade": 67, "sexo": "F", "observacoes": "..." }
```

`nivel_risco` ∈ `{baixo, medio, alto}` (calculado pelo **motor preditivo da Fase
6** — ver a seção *Motor preditivo* abaixo). **Polling sugerido:** `/pacientes` (ou
`/pacientes/{id}/ultima`) a cada ~3–5 s para o dashboard; `/alertas` para o painel
de alertas; `/pacientes/{id}/historico` para os gráficos.

### Exemplos (funcionam em produção ou local)

```bash
# Aponte BASE para a URL pública (ou http://localhost:8000 em dev)
BASE=https://college-anonymous-thesaurus-assumption.trycloudflare.com

# Login -> token (medico / cardioia123)
TOKEN=$(curl -s $BASE/autenticacao/login -H 'Content-Type: application/json' \
  -d '{"usuario":"medico","senha":"cardioia123"}' | jq -r .token_acesso)

# Leituras (polling do dashboard)
curl -s $BASE/pacientes -H "Authorization: Bearer $TOKEN" | jq
curl -s $BASE/pacientes/1/ultima    -H "Authorization: Bearer $TOKEN" | jq
curl -s $BASE/pacientes/1/historico -H "Authorization: Bearer $TOKEN" | jq
curl -s $BASE/alertas -H "Authorization: Bearer $TOKEN" | jq

# Assistente (Gemini)
curl -s $BASE/assistente -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"mensagem":"Como está a paciente?","paciente_id":1}' | jq

# Ingestão (somente dispositivo/emulador — usa o DEVICE_TOKEN, não o JWT)
curl -s -X POST $BASE/telemetria -H "Authorization: Bearer <DEVICE_TOKEN>" \
  -H 'Content-Type: application/json' -d '{"paciente_id":1,"fc":150,"temperatura":39.4}' | jq
```

### Assistente multi-turno (conversa com memória)

O `/assistente` mantém **histórico por conversa** (server-side):
- 1ª chamada **sem** `conversa_id` → o backend cria uma e devolve em `conversa_id`.
- Próximas chamadas **com** o mesmo `conversa_id` → o assistente lembra do contexto.
- `DELETE /assistente/{conversa_id}` → apaga o histórico (botão "nova conversa").

```bash
# 1ª mensagem (sem conversa_id) -> guarde o conversa_id devolvido
CID=$(curl -s $BASE/assistente -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"mensagem":"Como está a paciente 1?","paciente_id":1}' | jq -r .conversa_id)
# 2ª mensagem na MESMA conversa (com memória)
curl -s $BASE/assistente -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"mensagem\":\"E o que devo fazer?\",\"conversa_id\":\"$CID\"}" | jq
# nova conversa (apaga histórico)
curl -s -X DELETE $BASE/assistente/$CID -H "Authorization: Bearer $TOKEN" -w "%{http_code}\n"
```

> Histórico em memória (processo único): reinício do serviço zera as conversas;
> guarda as últimas 20 mensagens por conversa.

### Emulador controlável pela API

Simulador **in-process** que gera leituras para os pacientes — ligado/desligado
pelo frontend (sem SSH/CLI). Deixa o dashboard "vivo" na demo. Por padrão
(`pacientes` omitido ou `[]`) alimenta **todos os pacientes existentes**, resolvidos
dinamicamente a cada ciclo (acompanha cadastros novos); informe ids para restringir.

```bash
curl -s $BASE/emulador -H "Authorization: Bearer $TOKEN" | jq                        # status
# liga para TODOS os pacientes (padrão) — corpo vazio ou só o intervalo
curl -s -X POST $BASE/emulador/ligar -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"intervalo":3}' | jq
# (opcional) restringir a um subconjunto
curl -s -X POST $BASE/emulador/ligar -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"pacientes":[1,2,3],"intervalo":3}' | jq
curl -s -X POST $BASE/emulador/desligar -H "Authorization: Bearer $TOKEN" | jq        # desliga
```

> Grava leituras **reais** no banco enquanto ligado — lembre de **desligar** ao
> terminar. É o equivalente "via API" do script `emulator/emulate.py` (CLI); não
> substitui o Wokwi (hardware), mas alimenta a frota de pacientes na demonstração.

## Motor preditivo (Fase 6): classificação de risco

As colunas `pontuacao_risco`, `nivel_risco` e `recomendacao` de cada leitura são
geradas pelo motor da Fase 6 em
[`app/services/predictor.py`](app/services/predictor.py), função
`predict(fc, temperatura, idade)`. **Não é o Gemini** — o LLM atua só no
`/assistente`. O cálculo tem **duas camadas**:

```
FC + temperatura (sensor)  ┐
idade (cadastro Paciente)  ┼─▶ RandomForest ─▶ pontuacao_risco ─▶ regra de limiar ─▶ nivel_risco
                           ┘    (Camada 1: ML)      (0–1)          (Camada 2)        + recomendacao
```

**Camada 1 — modelo sklearn (`RandomForestClassifier`) → `pontuacao_risco`.**
Recebe 3 features e devolve uma probabilidade de risco em `[0, 1]`:
- **FC** (bpm) e **temperatura** (°C) — da leitura (Wokwi ou emulador);
- **idade** — do cadastro do `Paciente` (não vem do sensor).

`pontuacao_risco` = `predict_proba` da classe "risco".

**Camada 2 — regra de limiar determinística → `nivel_risco` + `recomendacao`.**
O texto **não** sai do ML: `_label_and_reco(score)` mapeia o score em faixa fixa
(recomendação por template, não gerada por LLM):

| `pontuacao_risco` | `nivel_risco` | `recomendacao` (resumo) |
|---|---|---|
| ≥ 0,67 | **alto** | Risco elevado — acionar equipe médica e considerar protocolo de emergência. |
| 0,34 – 0,67 | **medio** | Risco moderado — intensificar monitoramento e reavaliar em ~15 min. |
| < 0,34 | **baixo** | Sinais vitais dentro do esperado — manter monitoramento de rotina. |

### Como o modelo foi treinado (dados sintéticos)

> ⚠️ O conteúdo original da Fase 6 foi perdido; este é um **substituto plausível e
> calibrado**, treinado sobre **dados sintéticos** — não sobre dados reais de
> pacientes. Vale deixar isso explícito no relatório.

No startup do backend (`train()`, 8.000 amostras, `seed=42` → reproduzível):

1. **Features uniformes** em toda a faixa plausível (`FC 40–190`, `temp 34,5–41`,
   `idade 30–90`) — garante que extremos clínicos (ex.: FC 150 + febre) fiquem bem
   representados e o modelo calibrado também nessas regiões.
2. Uma **regra clínica geradora** (`_risk_index`) define a probabilidade "verdadeira"
   combinando desvios normalizados — **taquicardia** (FC > 95), **bradicardia**
   (FC < 55), **febre** (> 37,3 °C), **hipotermia** (< 36,0 °C) e **idade** (> 55) —
   numa soma linear passada por **sigmoide**.
3. Rótulos binários são **amostrados** dessa probabilidade (`y = 1` com prob. `r`).
4. O **RandomForest** (200 árvores, `max_depth=10`, `min_samples_leaf=20`) aprende a
   recuperar essa probabilidade (`predict_proba ≈ risco`).

Na prática, o RandomForest **aprende a imitar a regra clínica** — por isso o score
fica coerente com a fisiologia (taquicardia, febre e idade elevam o risco). O modelo
é treinado em memória a cada boot; **não há artefato `.pkl` versionado**.

## Rodar localmente

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # ajuste os valores (inclui Oracle)
uvicorn app.main:app --reload # http://localhost:8000  (Swagger em /docs)
```

No startup o backend cria as tabelas, semeia 3 pacientes de exemplo e **treina o
modelo** da Fase 6. Smoke test ponta a ponta: `python scripts/smoke.py`
(⚠️ insere leituras de teste — rode contra SQLite local, não contra o Oracle).

## Variáveis de ambiente (`.env`)

| Variável | Default (`.env.example`) | Descrição |
|---|---|---|
| `JWT_SECRET` | `dev-secret-change-me` | Segredo do JWT (em prod usar 32+ bytes) |
| `JWT_EXPIRE_MIN` | `720` | Validade do token (min) |
| `DEMO_USERNAME` / `DEMO_PASSWORD` | `medico` / `cardioia123` | Credenciais de login |
| `DEVICE_TOKEN` | `wokwi-dev-token` | Token estático do Wokwi/emulador no `/telemetria` |
| `GEMINI_API_KEY` | *(vazio)* | Chave do Google AI Studio; vazio ⇒ `/assistente` em modo fallback |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Modelo do Gemini |
| `CORS_ORIGINS` | `*` | Origens liberadas (em produção, o domínio da Vercel) |
| `DATABASE_URL` | `sqlite:///./cardioia.db` | Fallback local quando Oracle não configurado |
| `ORACLE_USER` | *(vazio)* | Usuário do Oracle ADB |
| `ORACLE_PASSWORD` | *(vazio)* | Senha do Oracle ADB |
| `ORACLE_DSN` | *(vazio)* | DSN TLS (`tcps`) do console OCI — thin mode, sem wallet |

> Em **produção (VPS)** o `.env` (git-ignored) já usa `JWT_SECRET` e `DEVICE_TOKEN`
> fortes, a `GEMINI_API_KEY` configurada e as credenciais reais do Oracle.

**Banco:** se `ORACLE_USER` + `ORACLE_DSN` estiverem definidos, usa **Oracle
Autonomous DB** via `python-oracledb` em **thin mode** (sem Instant Client e sem
wallet — o DSN TLS `tcps` basta). Sem isso, cai no SQLite local (`DATABASE_URL`).
Tabelas: `pacientes` e `leituras`.

## Emulador (fallback do Wokwi)

Posta leituras sintéticas no mesmo `/telemetria` — útil quando o Wokwi cai durante
a demo. Use o **mesmo `DEVICE_TOKEN`** do backend:

```bash
python emulator/emulate.py --url https://<URL>.trycloudflare.com --token <DEVICE_TOKEN>
python emulator/emulate.py --once     # uma rodada (teste)
```

## Produção na OCI — estado atual e operação

**Infra (já provisionada):**

| Item | Valor |
|---|---|
| VPS | OCI Ubuntu 24.04, aarch64 (Ampere), 2 OCPU / 12 GB — SSH alias `oracle-large-br` |
| Backend | systemd **`cardioia-api`** → uvicorn em `127.0.0.1:8000` |
| Código + venv | `~/git/fiap-ano2-fase7/backend` (a app lê o próprio `.env` dali) |
| Exposição | systemd **`cloudflared-quick`** → quick tunnel HTTPS (sem abrir portas) |
| Banco | Oracle Autonomous DB (thin mode, sem wallet) |
| Firewall | nenhum no SO; portas controladas pela VCN da OCI |

**Operação (do seu Mac, via SSH):**

```bash
# Status dos serviços
ssh oracle-large-br "systemctl status cardioia-api cloudflared-quick --no-pager"

# Logs do backend em tempo real
ssh oracle-large-br "journalctl -u cardioia-api -f"

# Pegar a URL pública vigente (muda se o túnel reiniciar)
ssh oracle-large-br "journalctl -u cloudflared-quick | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1"

# Reiniciar o backend (ex.: após editar o .env)
ssh oracle-large-br "sudo systemctl restart cardioia-api"

# Publicar código novo (pull + restart)
ssh oracle-large-br "cd ~/git/fiap-ano2-fase7 && git pull && sudo systemctl restart cardioia-api"
```

> ⚠️ Reiniciar **`cloudflared-quick`** troca a URL pública. Evite, ou rebusque a
> URL com o comando acima e reavise os frontends.

**Provisionar do zero** (resumo, caso recrie a VPS): instalar `python3.12-venv`
`python3-pip`; criar venv e `pip install -r requirements.txt`; copiar o `.env`;
`sudo cp deploy/cardioia-api.service /etc/systemd/system/` (ajuste os paths) e
`systemctl enable --now`; instalar `cloudflared` e subir um serviço com
`cloudflared tunnel --url http://127.0.0.1:8000`.

### Upgrade: URL fixa (named tunnel)

O quick tunnel é prático mas efêmero. Para hostname estável (recomendado para os
frontends fixarem e para o vídeo):

1. Registrar/adicionar um **domínio** na conta Cloudflare.
2. `cloudflared tunnel login` → `tunnel create cardioia` →
   `tunnel route dns cardioia api.SEU-DOMINIO.com`.
3. `config.yml` apontando `api.SEU-DOMINIO.com → http://localhost:8000` e rodar
   como serviço (`cloudflared service install`).
4. Setar `CORS_ORIGINS` para o domínio da Vercel e reiniciar `cardioia-api`.
