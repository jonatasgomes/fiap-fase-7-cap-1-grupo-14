// Cliente HTTP do CardioIA Mobile — fala exclusivamente com o backend FastAPI pt-BR.
// Token JWT guardado no SecureStore (recomendação do handoff para mobile).
// URL base vem de app.json (extra.apiUrl) e pode ser trocada em runtime na tela de login.

import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import {
  PacienteStatus,
  PacienteSaida,
  LeituraSaida,
  RespostaChat,
  EmulatorStatus,
} from "./types";

const TOKEN_KEY = "cardioia_jwt";
const URL_KEY = "cardioia_api_url";

const ENV_URL = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
export const DEFAULT_API_URL =
  (ENV_URL && ENV_URL.trim()) || "https://college-anonymous-thesaurus-assumption.trycloudflare.com";

let cachedBaseUrl: string | null = null;

export async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const custom = await SecureStore.getItemAsync(URL_KEY);
  cachedBaseUrl = (custom && custom.trim()) || DEFAULT_API_URL;
  return cachedBaseUrl;
}

export async function setBaseUrl(url: string): Promise<void> {
  const v = (url || "").trim();
  if (v) {
    await SecureStore.setItemAsync(URL_KEY, v);
    cachedBaseUrl = v;
  } else {
    await SecureStore.deleteItemAsync(URL_KEY);
    cachedBaseUrl = DEFAULT_API_URL;
  }
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function fetchFromApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const base = await getBaseUrl();
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${base}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    await setToken(null);
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro desconhecido no servidor" }));
    throw new Error(err.detail || `Erro na requisição (status ${res.status})`);
  }
  if (res.status === 204) return true;
  return res.json();
}

export const api = {
  async login(usuario: string, senha: string): Promise<string> {
    const r = await fetchFromApi("/autenticacao/login", {
      method: "POST",
      body: JSON.stringify({ usuario, senha }),
    });
    await setToken(r.token_acesso);
    return r.token_acesso as string;
  },

  async logout(): Promise<void> {
    await setToken(null);
  },

  getPacientes(): Promise<PacienteStatus[]> {
    return fetchFromApi("/pacientes");
  },

  getHistorico(id: number): Promise<LeituraSaida[]> {
    return fetchFromApi(`/pacientes/${id}/historico?limite=100`);
  },

  getUltima(id: number): Promise<LeituraSaida> {
    return fetchFromApi(`/pacientes/${id}/ultima`);
  },

  postAssistente(mensagem: string, pacienteId?: number, conversaId?: string): Promise<RespostaChat> {
    return fetchFromApi("/assistente", {
      method: "POST",
      body: JSON.stringify({
        mensagem,
        paciente_id: pacienteId ?? null,
        conversa_id: conversaId ?? null,
      }),
    });
  },

  resetConversa(conversaId: string): Promise<boolean> {
    return fetchFromApi(`/assistente/${conversaId}`, { method: "DELETE" });
  },

  async getEmulador(): Promise<EmulatorStatus> {
    try {
      return await fetchFromApi("/emulador");
    } catch {
      return { ligado: false, pacientes: [], intervalo: 3, leituras_geradas: 0 };
    }
  },

  ligarEmulador(pacientes: number[] = [], intervalo = 3): Promise<EmulatorStatus> {
    return fetchFromApi("/emulador/ligar", {
      method: "POST",
      body: JSON.stringify({ pacientes, intervalo }),
    });
  },

  desligarEmulador(): Promise<EmulatorStatus> {
    return fetchFromApi("/emulador/desligar", { method: "POST" });
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/health`);
    if (!res.ok) throw new Error("offline");
    return res.json();
  },
};

export type { PacienteSaida, LeituraSaida, PacienteStatus, RespostaChat, EmulatorStatus };
