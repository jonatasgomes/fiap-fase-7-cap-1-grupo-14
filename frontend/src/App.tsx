
import React, { useState, useEffect } from "react";
import { Heart, Lock } from "lucide-react";

import { PacienteStatus, LeituraSaida, EmulatorStatus } from "./types";
import { apiService, getToken } from "./services/api";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PatientsGrid from "./components/PatientsGrid";
import PatientDetail from "./components/PatientDetail";
import AssistantChat from "./components/AssistantChat";

export default function App() {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [usuario, setUsuario] = useState("medico");
  const [senha, setSenha] = useState("");
  const [loginError, setLoginError] = useState("");

  // Grid / Tabs coordination
  const [activeTab, setActiveTab] = useState<string>("painel");
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  
  // Data State
  const [patients, setPatients] = useState<PacienteStatus[]>([]);
  const [activeHistory, setActiveHistory] = useState<LeituraSaida[]>([]);
  const [emulator, setEmulator] = useState<EmulatorStatus | null>(null);
  const [alarmsCount, setAlarmsCount] = useState(0);

  // Interval ID do loop de polling do dashboard
  const [pollingIntervalId, setPollingIntervalId] = useState<any>(null);

  // Authentication Login execution
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const responseToken = await apiService.login(usuario, senha);
      setTokenState(responseToken);
    } catch (err: any) {
      setLoginError(err.message || "Senha ou usuário incorreto.");
    }
  };

  const handleLogout = () => {
    apiService.logout();
    setTokenState(null);
    setSelectedPatientId(undefined);
    setActiveHistory([]);
  };

  // Fetch Patients List
  const fetchPatientsList = async () => {
    try {
      const list = await apiService.getPacientes();
      // Ordena por id para a UI ficar estável — o backend pode devolver os
      // pacientes em ordem variável entre consultas (sem ORDER BY garantido),
      // o que fazia os cards "pularem" de posição a cada polling.
      list.sort((a, b) => a.paciente.id - b.paciente.id);
      setPatients(list);

      // Re-evaluate Active Alarms count
      const activeAlarms = list.filter(p => p.ultima && (p.ultima.nivel_risco === "medio" || p.ultima.nivel_risco === "alto"));
      setAlarmsCount(activeAlarms.length);

      // If a patient is selected, fetch their detailed history
      if (selectedPatientId) {
        const history = await apiService.getPacienteHistorico(selectedPatientId);
        setActiveHistory(history);
      }
    } catch (error) {
      console.error("Erro ao pollar pacientes da CardioIA:", error);
    }
  };

  // Fetch IoT Emulator Status
  const fetchEmulatorState = async () => {
    try {
      const status = await apiService.getEmulator();
      setEmulator(status);
    } catch (e) {
      console.warn("Could not sync emulator status.", e);
    }
  };

  // Load baseline on login or tab switch
  useEffect(() => {
    if (!token) return;
    fetchPatientsList();
    fetchEmulatorState();
  }, [token, selectedPatientId]);

  // 7.2 Implement automatic telemetry polling every 4 seconds (as instructed by the Handoff page 4)
  useEffect(() => {
    if (!token) {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      return;
    }

    const interval = setInterval(() => {
      fetchPatientsList();
      fetchEmulatorState();
    }, 4000);

    setPollingIntervalId(interval);

    return () => clearInterval(interval);
  }, [token, selectedPatientId]);

  // Obs.: quando o emulador está ligado, é o BACKEND que gera as leituras (via
  // POST /emulador/ligar) e as grava no banco. O frontend só faz polling de
  // /pacientes — não fabrica telemetria no cliente.

  // Patient Select coordinator
  const handleSelectPatient = (id: number) => {
    setSelectedPatientId(id);
    setActiveTab("dossie");
  };

  // CRUD Wrapper: Add
  const handleAddPatient = async (nome: string, idade: number, sexo: string, observacoes: string) => {
    try {
      await apiService.addPaciente(nome, idade, sexo, observacoes);
      await fetchPatientsList();
    } catch (e: any) {
      alert("Erro ao salvar paciente: " + e.message);
    }
  };

  // CRUD Wrapper: Edit
  const handleEditPatient = async (id: number, nome: string, idade: number, sexo: string, observacoes: string) => {
    try {
      await apiService.updatePaciente(id, nome, idade, sexo, observacoes);
      await fetchPatientsList();
    } catch (e: any) {
      alert("Erro ao editar paciente: " + e.message);
    }
  };

  // CRUD Wrapper: Delete
  const handleDeletePatient = async (id: number) => {
    try {
      await apiService.deletePaciente(id);
      if (selectedPatientId === id) {
        setSelectedPatientId(undefined);
        setActiveHistory([]);
        setActiveTab("painel");
      }
      await fetchPatientsList();
    } catch (e: any) {
      alert("Erro ao deletar paciente: " + e.message);
    }
  };

  const handleOpenAssistantWithPatient = (patientId: number) => {
    setSelectedPatientId(patientId);
    setActiveTab("assistente");
  };

  // Emulator remote control handler
  const handleToggleEmulator = async (active: boolean) => {
    try {
      if (active) {
        // [] => o backend gera leituras para TODOS os pacientes existentes
        // (resolvido dinamicamente a cada ciclo; inclui cadastros novos).
        const nextState = await apiService.turnOnEmulator([], 3);
        setEmulator(nextState);
      } else {
        const nextState = await apiService.turnOffEmulator();
        setEmulator(nextState);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Render Login state if not authenticated
  if (!token) {
    return (
      <div id="login-viewport" className="min-h-screen bg-[#070c19] text-white flex flex-col justify-center items-center p-6 relative font-sans">
        {/* Background decorative glows */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-[#0b1329] border border-[#1e293b]/60 rounded-[28px] p-8 shadow-2xl flex flex-col justify-between relative z-10">
          <div className="text-center space-y-3.5 mb-8">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20 mx-auto animate-pulse">
              <Heart size={30} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white leading-none">
                Cardio<span className="text-rose-500">IA</span> Clinic
              </h1>
              <p className="text-xs text-slate-400 mt-2">Plataforma de Inteligência Cardíaca Total · Fase 7</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-350 block uppercase tracking-wider">Identificação do Clínico</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ex: medico"
                  className="w-full text-xs bg-[#070c19] border border-[#1e293b] text-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-350 block uppercase tracking-wider">Senha Provisória</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs bg-[#070c19] border border-[#1e293b] text-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold tracking-widest"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 font-bold text-center animate-shake">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-extrabold transition-all duration-300 mt-2 shadow-lg shadow-rose-500/15 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock size={14} className="stroke-[2.5]" />
              <span>Autenticar Médico Coordenador</span>
            </button>
          </form>

          {/* Prompt references */}
          <div className="mt-8 border-t border-[#1e293b]/40 pt-4 text-center">
            <p className="text-[10px] text-slate-500 font-semibold">Credenciais de Ensaio Clinico:</p>
            <p className="text-[10px] font-mono text-rose-400 mt-1">médico/usuário: <span className="font-bold text-slate-300">medico</span> &nbsp;|&nbsp; senha: <span className="font-bold text-slate-300">cardioia123</span></p>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 mt-6 text-center select-none">
          CardioIA · FIAP Fase 7 · Grupo 14
        </p>
      </div>
    );
  }

  // Active Authenticated App View Routing
  return (
    <div id="cardioia-root-grid" className="h-screen flex overflow-hidden bg-slate-950 text-slate-200 font-sans">
      
      {/* Primary Sidebar Menu Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(t) => {
          setActiveTab(t);
          if (t === "painel") {
            setSelectedPatientId(undefined); // Unselect detailed client when returning to grid list
          }
        }} 
        alarmsCount={alarmsCount} 
        user="medico"
        onLogout={handleLogout}
      />

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Universal Dynamic Connection Header bar */}
        <Header activeTab={activeTab} />

        {/* Scrollable Panel Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#090d16]">
          <div className="max-w-7xl mx-auto">
            {activeTab === "painel" && (
              <PatientsGrid 
                patients={patients}
                onSelectPatient={handleSelectPatient}
                selectedPatientId={selectedPatientId}
                onAddPatient={handleAddPatient}
                onEditPatient={handleEditPatient}
                onDeletePatient={handleDeletePatient}
                emulator={emulator}
                onToggleEmulator={handleToggleEmulator}
              />
            )}

            {activeTab === "dossie" && selectedPatientId && (
              (() => {
                const activePatientSt = patients.find(p => p.paciente.id === selectedPatientId);
                if (!activePatientSt) return <div className="text-center font-bold text-slate-500 pt-12">Paciente não localizado.</div>;
                return (
                  <PatientDetail 
                    patient={activePatientSt.paciente}
                    history={activeHistory}
                    onBack={() => {
                      setSelectedPatientId(undefined);
                      setActiveTab("painel");
                    }}
                    onOpenAssistantWithPatient={handleOpenAssistantWithPatient}
                  />
                );
              })()
            )}

            {activeTab === "assistente" && (
              <AssistantChat
                patients={patients}
                initialPatientId={selectedPatientId}
              />
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
