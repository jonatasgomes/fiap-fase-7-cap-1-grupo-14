import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Activity, 
  Thermometer, 
  Clock, 
  AlertTriangle, 
  PenTool, 
  Trash2, 
  Play, 
  Square,
  Sparkles,
  ChevronRight,
  Heart,
  Calendar,
  Layers,
  CheckCircle,
  HelpCircle,
  Edit,
  UserPlus
} from "lucide-react";
import { PacienteStatus, PacienteSaida, EmulatorStatus } from "../types";

interface PatientsGridProps {
  patients: PacienteStatus[];
  onSelectPatient: (id: number) => void;
  selectedPatientId?: number;
  onAddPatient: (nome: string, idade: number, sexo: string, observacoes: string) => Promise<any>;
  onEditPatient: (id: number, nome: string, idade: number, sexo: string, observacoes: string) => Promise<any>;
  onDeletePatient: (id: number) => Promise<any>;
  emulator: EmulatorStatus | null;
  onToggleEmulator: (active: boolean) => void;
}

export default function PatientsGrid({
  patients,
  onSelectPatient,
  selectedPatientId,
  onAddPatient,
  onEditPatient,
  onDeletePatient,
  emulator,
  onToggleEmulator
}: PatientsGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAlarms, setFilterAlarms] = useState(false);
  
  // Modals status
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<PacienteSaida | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [sexo, setSexo] = useState("M");
  const [observacoes, setObservacoes] = useState("");

  const handleOpenAdd = () => {
    setNome("");
    setIdade("");
    setSexo("M");
    setObservacoes("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: PacienteSaida, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatientToEdit(p);
    setNome(p.nome);
    setIdade(p.idade.toString());
    setSexo(p.sexo);
    setObservacoes(p.observacoes);
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !idade) return;
    await onAddPatient(nome, parseInt(idade, 10), sexo, observacoes);
    setShowAddModal(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientToEdit || !nome || !idade) return;
    await onEditPatient(patientToEdit.id, nome, parseInt(idade, 10), sexo, observacoes);
    setShowEditModal(false);
    setPatientToEdit(null);
  };

  const handleDeleteClick = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Identificar: Confirmar a remoção permanente deste paciente do banco da CardioIA?")) {
      await onDeletePatient(id);
    }
  };

  // Filter calculations
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.paciente.observacoes.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterAlarms) {
      const isAlarm = p.ultima && (p.ultima.nivel_risco === "medio" || p.ultima.nivel_risco === "alto");
      return matchesSearch && isAlarm;
    }
    return matchesSearch;
  });

  return (
    <div id="patients-grid-main" className="space-y-6">
      
      {/* 1. Dynamic IoT Hardware Simulator Switchbar */}
      <div id="iot-emulator-control" className="bg-[#0b1329] rounded-2xl p-5 border border-[#1e293b]/50 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-xl border ${
            emulator?.ligado 
              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-soft-pulse" 
              : "bg-slate-800/40 text-slate-400 border-slate-700/50"
          }`}>
            <Activity className={emulator?.ligado ? "animate-bounce" : ""} size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-100">Emulador de Telemetria (Backend)</h4>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                emulator?.ligado ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-700/50 text-slate-400"
              }`}>
                {emulator?.ligado ? "LIGADO - TRANSMITINDO" : "DESLIGADO"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Liga o simulador in-process do backend, que gera leituras de FC/temperatura para os pacientes e as grava no banco (mesmo caminho do Wokwi). Deixa o painel "vivo" via polling — lembre de desligar ao terminar.
            </p>
          </div>
        </div>

        <button
          onClick={() => onToggleEmulator(!emulator?.ligado)}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 cursor-pointer shadow-md ${
            emulator?.ligado 
              ? "bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600" 
              : "bg-rose-500 hover:bg-rose-600 text-white border border-rose-400 shadow-rose-500/10"
          }`}
        >
          {emulator?.ligado ? (
            <>
              <Square size={14} className="fill-current" />
              <span>Desligar Emulador</span>
            </>
          ) : (
            <>
              <Play size={14} className="fill-current" />
              <span>Ligar Emulador</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Filters & Actions block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome de paciente ou histórico..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium placeholder-slate-500 text-slate-200"
          />
        </div>

        {/* Buttons / Toggles */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setFilterAlarms(!filterAlarms)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              filterAlarms
                ? "bg-rose-950/40 text-rose-400 border-rose-900"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <AlertTriangle size={14} className={filterAlarms ? "text-rose-500 animate-pulse" : ""} />
            <span>Apenas Alertas {patients.filter(p => p.ultima && (p.ultima.nivel_risco === "medio" || p.ultima.nivel_risco === "alto")).length > 0 && `(${patients.filter(p => p.ultima && (p.ultima.nivel_risco === "medio" || p.ultima.nivel_risco === "alto")).length})`}</span>
          </button>

          <button 
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-rose-950/20 cursor-pointer"
          >
            <UserPlus size={14} className="stroke-[2.5]" />
            <span>Adicionar Paciente</span>
          </button>
        </div>
      </div>

      {/* 3. Patients Cards Grid */}
      {filteredPatients.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <HelpCircle size={44} className="text-slate-600 mx-auto stroke-[1.5]" />
          <h3 className="font-bold text-slate-200 mt-4 text-base">Nenhum paciente localizado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não encontramos registros clínicos para os critérios definidos. Adicione um novo utilizando o botão acima ou limpe os filtros de busca.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-5">
          {filteredPatients.map((status) => {
            const isSelected = selectedPatientId === status.paciente.id;
            const u = status.ultima;
            const hasTelemetry = !!u;

            // Risk status styles
            let borderClass = "border-slate-800 hover:border-slate-700";
            let shadowClass = "hover:shadow-xl hover:shadow-black/45";
            let ringClass = "border-slate-805 bg-slate-950 text-slate-400";
            let badgeClass = "bg-slate-850 text-slate-500";
            let titleRiskMarker = "bg-slate-505";

            if (isSelected) {
              borderClass = "border-rose-500 ring-2 ring-rose-500/15";
            }

            if (hasTelemetry) {
              if (u.nivel_risco === "alto") {
                borderClass = isSelected ? "border-rose-600 ring-2 ring-rose-600/20" : "border-rose-950 hover:border-rose-900";
                ringClass = "bg-rose-950/30 text-rose-400 border-rose-900/60 animate-soft-pulse";
                badgeClass = "bg-rose-600 text-white font-extrabold animate-pulse";
                titleRiskMarker = "bg-rose-500";
              } else if (u.nivel_risco === "medio") {
                borderClass = isSelected ? "border-orange-500 ring-2 ring-orange-500/20" : "border-orange-950 hover:border-orange-900";
                ringClass = "bg-orange-950/20 text-orange-400 border-orange-900/60";
                badgeClass = "bg-orange-500 text-white font-bold";
                titleRiskMarker = "bg-orange-400";
              } else {
                ringClass = "bg-emerald-950/20 text-emerald-400 border-emerald-900/40";
                badgeClass = "bg-emerald-950/40 text-emerald-400 font-bold border border-emerald-900/30";
                titleRiskMarker = "bg-emerald-500";
              }
            }

            return (
              <div
                key={status.paciente.id}
                onClick={() => onSelectPatient(status.paciente.id)}
                className={`bg-slate-900 rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between cursor-pointer relative gap-4 group ${borderClass} ${shadowClass}`}
              >
                {/* Upper row: brief and patient identifiers */}
                <div className="flex gap-3 justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${ringClass}`}>
                      {status.paciente.sexo === "F" ? "F" : "M"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-[14px] text-white tracking-tight leading-tight group-hover:text-rose-400 transition-colors">
                          {status.paciente.nome}
                        </h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                        <span className="text-xs text-slate-400 font-medium">{status.paciente.idade} anos</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">
                        {status.paciente.observacoes || "Sem observações no prontuário."}
                      </p>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEdit(status.paciente, e)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                      title="Editar ficha médica"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(status.paciente.id, e)}
                      className="p-1.5 hover:bg-rose-955/20 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                      title="Apagar paciente definitivamente"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Instant signals readout */}
                <div className="grid grid-cols-3 bg-slate-950 border border-slate-850/60 p-3 rounded-xl gap-2 text-center">
                  <div className="border-r border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-rose-400">
                      <Activity size={13} className={u && u.fc > 100 ? "animate-pulse" : ""} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Frequência</span>
                    </div>
                    <p className="text-[13px] font-mono font-bold text-white mt-0.5">
                      {hasTelemetry ? `${u.fc} bpm` : "--"}
                    </p>
                  </div>
                  
                  <div className="border-r border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-blue-400">
                      <Thermometer size={13} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temp</span>
                    </div>
                    <p className="text-[13px] font-mono font-bold text-white mt-0.5">
                      {hasTelemetry ? `${u.temperatura} °C` : "--"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Crise Preditiva</span>
                    <span className={`text-[10px] py-0.5 px-2 rounded-full inline-block mt-0.5 font-bold ${badgeClass}`}>
                      {hasTelemetry ? u.nivel_risco.toUpperCase() : "AGUARDANDO"}
                    </span>
                  </div>
                </div>

                {/* Footer recommendation excerpt & selection trigger */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                    <Clock size={12} className="text-slate-500 shrink-0" />
                    <span className="text-slate-500">
                      {hasTelemetry 
                        ? `Atualizado: ${new Date(u.momento).toLocaleTimeString()}`
                        : "Sem telemetria ativa"}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-rose-400 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 hover:translate-x-0.5 transition-all">
                    <span>Dossiê Clínico</span>
                    <ChevronRight size={13} className="stroke-[2.5]" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================
          MODALS AREA (ADD AND EDIT FORM)
          ========================================== */}
      
      {/* Modal Add */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#020617]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <UserPlus className="text-rose-500" />
              Adicionar Paciente ao Prontuário CardioIA
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure a ficha do paciente para monitorar frequência cardíaca e diagnosticar picos preditivos de crises em tempo real.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Nome do Paciente</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Alberto de Oliveira"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Idade (Anos)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={idade}
                    onChange={(e) => setIdade(e.target.value)}
                    placeholder="70"
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-800 font-medium font-mono"
                  />
                </div>
              </div>

              <div id="radio-sex-selector" className="space-y-1">
                <span className="text-xs font-bold text-slate-600 block">Sexo Biológico</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sexo" 
                      value="M" 
                      checked={sexo === "M"} 
                      onChange={() => setSexo("M")}
                      className="text-rose-500 focus:ring-rose-400 bg-white"
                    />
                    Masculino
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sexo" 
                      value="F" 
                      checked={sexo === "F"} 
                      onChange={() => setSexo("F")}
                      className="text-rose-500 focus:ring-rose-400 bg-white"
                    />
                    Feminino
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sexo" 
                      value="?" 
                      checked={sexo === "?"} 
                      onChange={() => setSexo("?")}
                      className="text-rose-500 focus:ring-rose-400 bg-white"
                    />
                    Outro/Não especificado
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Observações e Histórico Diagnóstico</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Hipertenso primário sob uso de beta-bloqueadores. Marcapasso cardíaco..."
                  rows={3}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold transition-all cursor-pointer shadow-md shadow-rose-500/10"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditModal && patientToEdit && (
        <div className="fixed inset-0 bg-[#020617]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <Edit className="text-rose-500" />
              Modificar Cadastro de Paciente
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Editar as diretrizes e apontamentos do prontuário do paciente {patientToEdit.nome}.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Idade (Anos)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={idade}
                    onChange={(e) => setIdade(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-800 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-600 block">Sexo Biológico</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sexo-edit" 
                      value="M" 
                      checked={sexo === "M"} 
                      onChange={() => setSexo("M")}
                      className="text-rose-500 focus:ring-rose-400 bg-white"
                    />
                    Masculino
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sexo-edit" 
                      value="F" 
                      checked={sexo === "F"} 
                      onChange={() => setSexo("F")}
                      className="text-rose-500 focus:ring-rose-400 bg-white"
                    />
                    Feminino
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="sexo-edit" 
                      value="?" 
                      checked={sexo === "?"} 
                      onChange={() => setSexo("?")}
                      className="text-rose-500 focus:ring-rose-400 bg-white"
                    />
                    Outro
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Observações Clínicas</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setPatientToEdit(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold transition-all cursor-pointer shadow-md shadow-rose-500/10"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
