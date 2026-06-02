import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Sparkles, 
  Trash2, 
  MessageSquareCode, 
  User, 
  HelpCircle, 
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  Users
} from "lucide-react";
import { PacienteStatus, RespostaChat } from "../types";
import { apiService } from "../services/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  modelUsed?: string;
}

interface AssistantChatProps {
  patients: PacienteStatus[];
  initialPatientId?: number;
}

export default function AssistantChat({ patients, initialPatientId }: AssistantChatProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(initialPatientId);
  const [sessionConversaId, setSessionConversaId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Automatically sync initial patient selection
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    }
  }, [initialPatientId]);

  // Welcome message when selected patient changes
  useEffect(() => {
    const activePatient = patients.find(p => p.paciente.id === selectedPatientId);
    let welcomeText = "";

    if (activePatient) {
      welcomeText = `Olá, Dr(a)! Estou pronto para debater o caso clínico de **${activePatient.paciente.nome}** (Prontuário #${activePatient.paciente.id * 1000 + 49}). \n\nTenho acesso ao histórico de telemetria:\n- **Frequência cardíaca atual**: ${activePatient.ultima ? activePatient.ultima.fc + " bpm" : "Aguardando sinal"}\n- **Temperatura corporal**: ${activePatient.ultima ? activePatient.ultima.temperatura + " ºC" : "Aguardando sinal"}\n- **Risco estimado**: ${activePatient.ultima ? activePatient.ultima.nivel_risco.toUpperCase() : "BAIXO"}\n\nFique à vontade para me perguntar sobre diagnósticos diferenciais, interpretações do ecossistema e condutas médicas baseadas nas diretrizes clínicas.`;
    } else {
      welcomeText = `Olá, Dr(a)! Sou o **MédicIA** de apoio clínico do CardioIA. Tenho acesso consolidado a todos os pacientes da clínica, além do barramento IoT MicroPython.\n\nComo posso ajudar a otimizar sua rotina e prevenir crises cardíacas hoje?`;
    }

    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString(),
        modelUsed: "gemini-3.1-flash-lite"
      }
    ]);
    // Depende SÓ de selectedPatientId. NÃO incluir `patients`: o polling do
    // dashboard (a cada ~4 s) recria o array `patients`, o que re-dispararia este
    // efeito e apagaria a conversa em andamento (resetando para a saudação).
  }, [selectedPatientId]);

  // Autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    // Push user message
    const userMsgId = `m_user_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: userText,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    setIsLoading(true);

    try {
      const response: RespostaChat = await apiService.postAssistente(
        userText,
        selectedPatientId,
        sessionConversaId
      );

      // Save conversational context returned
      if (response.conversa_id) {
        setSessionConversaId(response.conversa_id);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `m_ai_${Date.now()}`,
          sender: "ai",
          text: response.resposta,
          timestamp: new Date().toLocaleTimeString(),
          modelUsed: response.modelo || "gemini-3.1-flash-lite"
        }
      ]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `m_ai_err_${Date.now()}`,
          sender: "ai",
          text: `⚠️ **Erro ao contatar MédicIA**: ${error.message || "Verifique se a conexão com o backend está ativa."}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSession = async () => {
    if (sessionConversaId) {
      try {
        await apiService.resetSession(sessionConversaId);
      } catch (e) {
        console.warn("Could not reset on server, purguing local state anyway.");
      }
    }
    setSessionConversaId(undefined);
    setInputMessage("");
    setMessages(prev => [
      ...prev.slice(0, 1), // Keep welcome message
      {
        id: `clear_${Date.now()}`,
        sender: "ai",
        text: "Sessão de conversação reiniciada. O histórico anterior foi removido das variáveis de memória do modelo.",
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Pre-configured clinic query guides
  const suggestionTemplates = [
    { label: "Análise de Risco", prompt: "Qual é o risco cardiológico previsto pelo modelo de IA e quais variáveis pesaram mais?" },
    { label: "Conduta Recomendada", prompt: "Quais condutas de enfermagem de urgência são necessárias para este paciente?" },
    { label: "Sinais de Infarto", prompt: "Como alinhar esta telemetria com o protocolo clínico de Infarto Agudo do Miocárdio (IAM)?" },
  ];

  const handleApplySuggestion = (prompt: string) => {
    setInputMessage(prompt);
  };

  return (
    <div id="ai-assistant-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[calc(100vh-180px)]">
      
      {/* 1. Chat Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-950/30 rounded-xl text-rose-400 border border-rose-900/40">
            <MessageSquareCode size={20} className="stroke-[2]" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5 leading-none font-sans">
              <span>MédicIA - Assistente Orquestrador</span>
              <Sparkles size={14} className="text-rose-500 fill-current animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-550 text-slate-500 mt-1">Multi-Turn contextualizado via Gemini 31 e históricos clínicos.</p>
          </div>
        </div>

        {/* Patient contextual drawer selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Contexto do Paciente:</span>
            <select
              value={selectedPatientId || ""}
              onChange={(e) => setSelectedPatientId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 py-1.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="">-- Modo Geral (Sem Paciente) --</option>
              {patients.map(p => (
                <option key={p.paciente.id} value={p.paciente.id}>
                  {p.paciente.nome} ({p.paciente.idade} anos)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearSession}
            className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-800/80"
            title="Reiniciar conversa"
          >
            <RotateCcw size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. Messages box scroll panel */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {messages.map((m) => {
          const isAi = m.sender === "ai";
          return (
            <div 
              key={m.id}
              className={`flex gap-3 max-w-4/5 ${isAi ? "mr-auto" : "ml-auto flex-row-reverse"}`}
            >
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-sm font-extrabold text-xs ${
                isAi 
                  ? "bg-rose-950/40 text-rose-450 border-rose-900/30" 
                  : "bg-slate-950 text-slate-350 border-slate-850/80"
              }`}>
                {isAi ? "IA" : "DR"}
              </div>

              <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                isAi 
                  ? "bg-slate-950/40 text-slate-300 border-slate-850/80 rounded-tl-none whitespace-pre-wrap" 
                  : "bg-rose-600 text-white border-rose-500 rounded-tr-none shadow-md"
              }`}>
                {/* Text formatting inside message logs */}
                <div>
                  {m.text.split("\n_").map((item, idx) => (
                    <p key={idx} className="mb-1.5 last:mb-0">
                      {item.startsWith("- ") ? <span className="block pl-3 border-l-2 border-rose-400 italic font-medium">{item}</span> : item}
                    </p>
                  ))}
                </div>

                <div className={`mt-2.5 pt-2 border-t font-mono text-[9px] flex items-center justify-between ${
                  isAi ? "border-slate-850/50 text-slate-500" : "border-white/10 text-rose-100"
                }`}>
                  <span>{m.timestamp}</span>
                  {m.modelUsed && (
                    <span className="flex items-center gap-1 font-bold">
                      <Sparkles size={10} />
                      {m.modelUsed}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-4/5 animate-pulse">
            <div className="w-8 h-8 rounded-full border bg-rose-950/40 text-rose-450 border-rose-900/35 flex items-center justify-center shrink-0 text-xs font-bold">
              IA
            </div>
            <div className="bg-slate-950 border border-slate-85 border-slate-850 p-4 rounded-xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-200"></span>
              <span className="ml-1 text-[10px] font-mono text-slate-500">MédicIA analisando ECG e logs...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestions template tags */}
      {messages.length === 1 && !isLoading && (
        <div className="px-2 pb-3 pt-2 border-t border-slate-850">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Comandos Clínicos Frequentes</p>
          <div className="flex flex-wrap gap-2">
            {suggestionTemplates.map((su, i) => (
              <button
                key={i}
                onClick={() => handleApplySuggestion(su.prompt)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-800 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer animate-fade-in"
              >
                {su.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Input Message section */}
      <form onSubmit={handleSendMessage} className="border-t border-slate-850 pt-3 flex gap-2">
        <input 
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={selectedPatientId ? "Instrução ao MédicIA sobre este paciente..." : "Digite uma instrução médica geral..."}
          className="flex-1 text-xs px-4 py-3 border border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-slate-800 bg-slate-950 text-slate-200 font-medium placeholder-slate-600"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none shadow-md shadow-rose-950/20 shrink-0 font-bold"
        >
          <Send size={15} className="stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
}
