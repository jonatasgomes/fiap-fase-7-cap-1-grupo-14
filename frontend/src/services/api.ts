import { PacienteStatus, PacienteSaida, LeituraSaida, AlertaSaida, RespostaChat, EmulatorStatus } from "../types";

// ==========================================
// CONFIGURAÇÃO DO BACKEND
// ==========================================
// Toda a aplicação conversa exclusivamente com o backend CardioIA (API FastAPI
// pt-BR, atrás do Cloudflare Tunnel). Não há "modo mock" nem chamadas diretas a
// LLMs no cliente — o Gemini (Fase 5) e o motor preditivo (Fase 6) vivem no backend.
//
// A URL base vem da env do Vite (VITE_API_URL). Como o quick tunnel é EFÊMERO,
// nunca fixe uma URL definitiva no código: ajuste o `.env` (VITE_API_URL) ou, em
// runtime, pela engrenagem de conectividade no Header (salva em localStorage).
const ENV_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const DEFAULT_API_URL =
  ENV_API_URL || "https://college-anonymous-thesaurus-assumption.trycloudflare.com";

export function getBaseUrl(): string {
  const custom = localStorage.getItem("cardioia_api_url");
  return (custom && custom.trim()) || DEFAULT_API_URL;
}

export function setBaseUrl(url: string) {
  if (url && url.trim()) {
    localStorage.setItem("cardioia_api_url", url.trim());
  } else {
    localStorage.removeItem("cardioia_api_url");
  }
}

export function getToken(): string | null {
  return localStorage.getItem("cardioia_jwt_token");
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("cardioia_jwt_token", token);
  } else {
    localStorage.removeItem("cardioia_jwt_token");
  }
}

// ==========================================
// CLIENTE HTTP
// ==========================================
// Anexa o JWT (Bearer) obtido no login, normaliza erros do FastAPI ({detail}) e
// trata 401 (sessão expirada -> limpa token) e 204 (sem corpo).
async function fetchFromApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${getBaseUrl()}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    setToken(null);
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: "Erro desconhecido no servidor" }));
    throw new Error(errBody.detail || `Erro na requisição (Status: ${response.status})`);
  }

  if (response.status === 204) {
    return true;
  }

  return response.json();
}

export const apiService = {
  // 1. Autenticação — POST /autenticacao/login -> { token_acesso }
  async login(usuario: string, senha: string): Promise<string> {
    const response = await fetchFromApi("/autenticacao/login", {
      method: "POST",
      body: JSON.stringify({ usuario, senha }),
    });
    const token = response.token_acesso;
    setToken(token);
    return token;
  },

  logout() {
    setToken(null);
  },

  // 2. Pacientes — CRUD
  async getPacientes(): Promise<PacienteStatus[]> {
    return fetchFromApi("/pacientes");
  },

  async addPaciente(nome: string, idade: number, sexo: string, observacoes: string): Promise<PacienteSaida> {
    return fetchFromApi("/pacientes", {
      method: "POST",
      body: JSON.stringify({ nome, idade, sexo, observacoes }),
    });
  },

  async updatePaciente(id: number, nome: string, idade: number, sexo: string, observacoes: string): Promise<PacienteSaida> {
    return fetchFromApi(`/pacientes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nome, idade, sexo, observacoes }),
    });
  },

  async deletePaciente(id: number): Promise<boolean> {
    return fetchFromApi(`/pacientes/${id}`, { method: "DELETE" });
  },

  // 3. Leituras / sinais
  async getPacienteUltima(id: number): Promise<LeituraSaida> {
    return fetchFromApi(`/pacientes/${id}/ultima`);
  },

  async getPacienteHistorico(id: number): Promise<LeituraSaida[]> {
    return fetchFromApi(`/pacientes/${id}/historico?limite=100`);
  },

  // 4. Alertas — últimas leituras em risco médio/alto (ordenadas por gravidade)
  async getAlertas(): Promise<AlertaSaida[]> {
    return fetchFromApi("/alertas");
  },

  // 5. Assistente conversacional (multi-turno; Gemini roda no backend)
  async postAssistente(mensagem: string, pacienteId?: number, conversaId?: string): Promise<RespostaChat> {
    return fetchFromApi("/assistente", {
      method: "POST",
      body: JSON.stringify({
        mensagem,
        paciente_id: pacienteId ?? null,
        conversa_id: conversaId ?? null,
      }),
    });
  },

  async resetSession(conversaId: string): Promise<boolean> {
    return fetchFromApi(`/assistente/${conversaId}`, { method: "DELETE" });
  },

  // 6. Emulador — simulador in-process do backend (grava leituras REAIS no banco
  // enquanto ligado). É o mecanismo oficial para deixar o dashboard "vivo" na demo.
  async getEmulator(): Promise<EmulatorStatus> {
    try {
      return await fetchFromApi("/emulador");
    } catch {
      return { ligado: false, pacientes: [], intervalo: 3, leituras_geradas: 0 };
    }
  },

  async turnOnEmulator(pacientes: number[], intervalo: number = 3): Promise<EmulatorStatus> {
    return fetchFromApi("/emulador/ligar", {
      method: "POST",
      body: JSON.stringify({ pacientes, intervalo }),
    });
  },

  async turnOffEmulator(): Promise<EmulatorStatus> {
    return fetchFromApi("/emulador/desligar", { method: "POST" });
  },

  // 7. Health check — GET /health (sem auth)
  async checkHealth(): Promise<{ status: string; service: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${getBaseUrl()}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        return response.json();
      }
      throw new Error("Offline response");
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(`Servidor inacessível em: ${getBaseUrl()}`);
    }
  },
};
