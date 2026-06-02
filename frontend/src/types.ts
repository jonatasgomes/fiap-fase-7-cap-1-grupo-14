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
  momento: string; // ISO-8601 date string in UTC
  fc: number;      // Heart rate in bpm
  temperatura: number; // Temp in C
  pontuacao_risco: number; // Float 0..1
  nivel_risco: "baixo" | "medio" | "alto";
  recomendacao: string;
}

export interface PacienteStatus {
  paciente: PacienteSaida;
  ultima: LeituraSaida | null;
}

export interface AlertaSaida {
  paciente: PacienteSaida;
  leitura: LeituraSaida;
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
