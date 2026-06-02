# CardioIA — App Mobile (Fase 7)

App **Android (Expo + React Native + TypeScript)** da Plataforma de Inteligência
Cardíaca Total. Consome **exclusivamente** o backend FastAPI pt-BR (login com **JWT
guardado no SecureStore** + polling). Telas: **Login · Painel · Dossiê · MédicIA**.

> Fonte da verdade da API: [`../backend/README.md`](../backend/README.md) e o
> [handoff](../assets/handoff-backend-frontend.docx). Mesmo backend do app web.

## Stack
- **Expo SDK 56** · React Native 0.85 · React 19 · TypeScript
- `expo-secure-store` (token JWT) · `expo-constants` (config)
- Navegação por estado (sem libs extras); gráfico de histórico em Views nativas

## Rodar em desenvolvimento
```bash
cd mobile
npm install
npx expo start          # abra no Expo Go (QR) ou num emulador Android
```
Login demo: **`medico` / `cardioia123`**.

## Configuração do backend
A URL base vem de `app.json` → `expo.extra.apiUrl`. Como o quick tunnel é
**efêmero**, troque ali (e rebuilde) **ou**, em runtime, na tela de login em
**"Configurar servidor"** (salvo no SecureStore, tem prioridade sobre a config).

## Gerar o APK (EAS Build)
Requer uma conta **Expo** (gratuita). O `eas.json` traz o perfil **`preview`** que
gera um `.apk` instalável:
```bash
npx eas-cli login                                   # autentica na conta Expo
npx eas-cli build -p android --profile preview      # build na nuvem → .apk
```
Na 1ª execução o EAS cria/vincula o projeto e grava o `projectId`. Ao final, baixe o
`.apk` pelo link/QR do dashboard do Expo e instale num Android real para validar o
fluxo (login → visualização dos dados cardíacos).

`app.json` já define `android.package = com.cardioia.app` (domínio invertido, exigido).

## Estrutura
```
App.tsx                 # auth + polling (4s) + navegação por estado + tab bar
src/
  api.ts                # cliente HTTP (token no SecureStore), baseURL configurável
  types.ts, theme.ts
  screens/
    LoginScreen         # login JWT (+ "Configurar servidor")
    PanelScreen         # lista de pacientes + toggle do emulador
    PatientDetailScreen # sinais, risco e gráfico de histórico
    AssistantScreen     # chat MédicIA (Gemini, multi-turno)
app.json · eas.json
```
