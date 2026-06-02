# Vídeo demonstrativo (NotebookLM) — CardioIA Fase 7

Guia para gerar o **Vídeo Visão Geral** (Video Overview) do NotebookLM, em **pt-BR**, ≤ 5 min.

## Como usar
1. No NotebookLM, crie um notebook e **suba como fontes**: todas as imagens desta pasta `assets/video/` (01 a 11) e, opcionalmente, o `README.md` e o `assets/arquitetura.pdf` (dão contexto e evitam que a IA invente dados).
2. Gere um **Vídeo Visão Geral** e, na personalização/prompt, **cole o bloco abaixo** ("PROMPT").
3. As imagens estão **numeradas na ordem do roteiro** — peça ao NotebookLM para segui-la.

---

## PROMPT (copie tudo abaixo)

Você é um(a) narrador(a) técnico(a). Crie um **vídeo demonstrativo em português do Brasil**, com no máximo **5 minutos**, sobre o projeto **CardioIA — Plataforma de Inteligência Cardíaca Total (Fase 7, GRUPO 14)**. Tom **profissional, claro e objetivo**, ritmo de demonstração de produto. Público: professores avaliadores e colegas de engenharia.

Use **as imagens que enviei como fontes, na ordem numerada (01 a 11)**, mostrando cada imagem durante a cena correspondente do roteiro abaixo. Não invente números nem telas que não estejam nas imagens. Traduza termos técnicos para linguagem acessível, mas mantenha os nomes próprios (FastAPI, MicroPython, Gemini, Oracle, Vercel, Expo).

Mensagem central: o CardioIA integra **todas as fases anteriores** num ecossistema único e funcional — **sensor → MicroPython → backend Python → motores de IA → interfaces Web e Mobile** — entregando previsão de risco cardíaco em tempo real.

Roteiro (cena a cena):

1. **Abertura e arquitetura** — imagem `01-arquitetura.png` (~35s). Apresente o CardioIA como o MVP final da Fase 7. Explique o fluxo fim-a-fim do diagrama: sensores (IoT em MicroPython) enviam telemetria ao backend FastAPI, que classifica o risco com o motor da Fase 6 e conversa via Gemini (Fase 5), persistindo em Oracle e entregando para Web e Mobile, exposto por HTTPS via Cloudflare Tunnel.

2. **Borda / IoT no Wokwi** — imagem `02-wokwi.png` (~40s). Mostre o ESP32 rodando **MicroPython** no Wokwi: leitura de **frequência cardíaca e temperatura**, feedback no **OLED + LED**, e envio de cada leitura via `POST /telemetria` (autenticado por token de dispositivo) para o backend.

3. **Backend integrador + Oracle** — imagem `03-backend-leituras-sql.png` (~45s). Explique que o núcleo é um backend **Python/FastAPI** com API em pt-BR. Cada leitura passa pelo **motor preditivo da Fase 6 (RandomForest, scikit-learn)**, que gera **pontuação e nível de risco + recomendação**, e é **gravada na tabela `leituras` do Oracle Autonomous Database** — visível na consulta SQL da imagem. O assistente da Fase 5 usa o **Google Gemini**.

4. **Web — Painel Médico** — imagem `04-web-painel.png` (~30s). App **web (React + Vite)** publicado na **Vercel**. Após o login, o médico vê o **painel com todos os pacientes**, frequência, temperatura e **nível de risco em tempo real** (atualização por polling). Indicador "Backend Conectado"; o emulador mantém a frota de telemetria viva.

5. **Web — Dossiê do paciente** — imagem `05-web-dossie.png` (~25s). Detalhe do paciente: **oscilograma do histórico** de sinais, **índice de risco previsto** e a **recomendação** gerada pelo motor da Fase 6.

6. **Web — MédicIA (assistente)** — imagem `06-web-assistente.png` (~30s). O **MédicIA**, assistente conversacional baseado em **Gemini**, responde em **múltiplos turnos**, contextualizado pelo paciente selecionado.

7. **Aplicativo Mobile (APK)** — imagens `07-mobile-painel.png`, depois `08-mobile-dossie.png`, depois `09-mobile-assistente.png` (~45s no total). O mesmo ecossistema num app **mobile (React Native + Expo)**, **instalado via APK (EAS Build) num Android real**, consumindo a **mesma API**: painel, dossiê com gráfico e o MédicIA.

8. **Deploy profissional e CI/CD** — imagens `10-deploy-vercel.png`, depois `11-deploy-detalhe.png` (~30s). Destaque o deploy: **Web na Vercel com CI/CD** (cada push na branch `main` dispara um novo deploy), **APK via EAS Build**, **backend na OCI** atrás do **Cloudflare Tunnel (HTTPS)** e **Oracle Autonomous Database**.

9. **Fechamento** (~20s). Resuma: um ecossistema coeso — IoT, backend Python, motores de IA (Fase 6 + Fase 5) e interfaces Web e Mobile — que transforma sinais em recomendações clínicas em tempo real. Encerre com "CardioIA — Fase 7 · GRUPO 14".

Diretrizes: mantenha cada cena curta para caber em 5 minutos; use transições suaves; priorize clareza sobre densidade técnica; não leia URLs/credenciais em voz alta.

---

## Lista de imagens (ordem do roteiro)

| # | Arquivo | Cena | Status |
|---|---|---|---|
| 01 | `01-arquitetura.png` | Diagrama de arquitetura (fim-a-fim) | ✅ pronto |
| 02 | `02-wokwi.png` | Wokwi: ESP32 + MicroPython (OLED/LED, telemetria) | ✅ pronto |
| 03 | `03-backend-leituras-sql.png` | SQL Developer: consulta na tabela `leituras` (Oracle) | ✅ pronto |
| 04 | `04-web-painel.png` | Web — Painel Médico (Backend Conectado) | ✅ pronto |
| 05 | `05-web-dossie.png` | Web — Dossiê (gráfico + risco) | ✅ pronto |
| 06 | `06-web-assistente.png` | Web — MédicIA (Gemini) | ✅ pronto |
| 07 | `07-mobile-painel.png` | Mobile — Painel | ✅ pronto |
| 08 | `08-mobile-dossie.png` | Mobile — Dossiê | ✅ pronto |
| 09 | `09-mobile-assistente.png` | Mobile — MédicIA | ✅ pronto |
| 10 | `10-deploy-vercel.png` | Vercel — deploy de produção (Ready, CI/CD) | ✅ pronto |
| 11 | `11-deploy-detalhe.png` | Vercel — detalhes do deployment | ✅ pronto |

> Conjunto **completo (01–11)**. As imagens 04–11 foram reaproveitadas dos nossos prints (`assets/prints/`); a 01 é o diagrama (`assets/arquitetura.pdf`, pág. 1); 02 e 03 vieram do Wokwi e do SQL Developer.
