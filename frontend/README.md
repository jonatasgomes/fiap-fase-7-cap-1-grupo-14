# CardioIA — Frontend Web (Fase 7)

Painel clínico **Web** da Plataforma de Inteligência Cardíaca Total. Consome
**exclusivamente** o backend CardioIA (API FastAPI pt-BR): login, telemetria de
pacientes em tempo real (polling), classificação de risco (Fase 6) e o assistente
conversacional **MédicIA** (Gemini, Fase 5). **Nenhuma lógica de IA roda no cliente.**

> Parte do repositório da Fase 7. A **fonte da verdade da API** é o backend
> (`../backend/README.md` e `../assets/handoff-backend-frontend.docx`). O **mobile**
> (React Native + Expo) e o **IoT** (Wokwi/MicroPython) são projetos **separados**.

## Stack
- **React 19** + **Vite 6** + **TypeScript**
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **lucide-react** (ícones)
- HTTP via `fetch` nativo — cliente único em [`src/services/api.ts`](src/services/api.ts)

## Rodar localmente
```bash
cd frontend
cp .env.example .env        # ajuste VITE_API_URL (ver abaixo)
npm install
npm run dev                 # http://localhost:3000
```
Outros scripts: `npm run build` (Vite → `dist/`), `npm run preview`, `npm run lint` (`tsc --noEmit`).

## Configuração — só o backend
A **única** configuração é a URL do backend, em `VITE_API_URL` (arquivo `.env`):
```
VITE_API_URL="https://<sua-url>.trycloudflare.com"
```
- A URL do **Cloudflare quick tunnel é efêmera** — muda quando o túnel reinicia. Não
  fixe no código: ajuste o `.env` **ou** troque em runtime pela engrenagem de conexão
  no cabeçalho do app (salva em `localStorage` e tem prioridade sobre o `.env`).
- Quem cuida do backend descobre a URL vigente com:
  ```bash
  ssh oracle-large-br "journalctl -u cloudflared-quick | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1"
  ```

## Login (demo)
Usuário **`medico`** / senha **`cardioia123`** → `POST /autenticacao/login` devolve um
**JWT**, guardado no `localStorage` e enviado como `Authorization: Bearer <token>` em
todas as chamadas protegidas. Em `401`, o app limpa o token e volta ao login.

## Funcionalidades (todas via API pt-BR)
| Tela | Endpoints |
|---|---|
| **Painel Médico** — lista de pacientes com sinais e nível de risco (polling ~4 s); CRUD de pacientes; liga/desliga o **emulador** do backend | `GET /pacientes`, `POST/PUT/DELETE /pacientes`, `GET /emulador`, `POST /emulador/ligar`·`/desligar` |
| **Dossiê do paciente** — gráfico de histórico (FC/temperatura), última leitura e recomendação | `GET /pacientes/{id}/historico`, `GET /pacientes/{id}/ultima` |
| **MédicIA** — chat multi-turno contextualizado por paciente | `POST /assistente`, `DELETE /assistente/{conversa_id}` |
| **Status de conexão** (cabeçalho) | `GET /health` |

> O **emulador** é o simulador in-process do backend (grava leituras reais no banco
> enquanto ligado) — é o que deixa o painel "vivo" na demonstração; lembre de desligar
> ao terminar. O hardware real é o projeto **Wokwi** (separado).

## Deploy (Vercel)
**No ar:** <https://fiap-ano2-fase7.vercel.app> (login demo `medico` / `cardioia123`).

`vercel.json` configura as rotas SPA (rewrite de tudo para `index.html`). Para reproduzir:
importe o repo na Vercel com **Root Directory = `frontend`** (é monorepo), defina
`VITE_API_URL` nas *Environment Variables* e publique — cada push na `main` dispara o
deploy (CI/CD). Como o `VITE_API_URL` é **embutido no build**, ao trocar a URL do backend
atualize a env **e** faça *Redeploy* (ou troque em runtime pela engrenagem no cabeçalho).

## Estrutura
```
src/
  App.tsx              # estado, login, polling, roteamento de abas
  main.tsx, index.css
  types.ts             # tipos do contrato da API
  services/api.ts      # cliente HTTP — fala SÓ com o backend
  components/
    Sidebar, Header
    PatientsGrid       # painel + CRUD + toggle do emulador
    PatientDetail      # dossiê + gráfico de histórico
    AssistantChat      # MédicIA (Gemini via backend)
```
