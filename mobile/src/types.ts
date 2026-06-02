// Tipos do contrato da API CardioIA (espelham o backend pt-BR).

export interface PacienteSaida {
  id: number;
  nome: string;
  idade: number;
  sexo: string; // "F" | "M" | "?"
  observacoes: string;
}

export interface LeituraSaida {
  id: number;
  paciente_id: number;
  momento: string; // ISO-8601 UTC
  fc: number;
  temperatura: number;
  pontuacao_risco: number; // 0..1
  nivel_risco: "baixo" | "medio" | "alto";
  recomendacao: string;
}

export interface PacienteStatus {
  paciente: PacienteSaida;
  ultima: LeituraSaida | null;
}

export interface RespostaChat {
  resposta: string;
  modelo: string;
  contextualizado: boolean;
  conversa_id: string;
}

export interface EmulatorStatus {
  ligado: boolean;
  pacientes: number[];
  intervalo: number;
  leituras_geradas: number;
}
