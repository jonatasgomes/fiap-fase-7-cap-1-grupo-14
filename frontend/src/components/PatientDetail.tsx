import React, { useState } from "react";
import { 
  ArrowLeft, 
  Activity, 
  Thermometer, 
  AlertTriangle, 
  Heart, 
  Clock, 
  ChevronRight, 
  MessageSquareCode, 
  Briefcase, 
  ActivitySquare,
  ShieldAlert,
  Flame,
  CheckCircle,
  TrendingUp,
  FlameKindling,
  User
} from "lucide-react";
import { PacienteSaida, LeituraSaida } from "../types";

interface PatientDetailProps {
  patient: PacienteSaida;
  history: LeituraSaida[];
  onBack: () => void;
  onOpenAssistantWithPatient: (patientId: number) => void;
}

export default function PatientDetail({
  patient,
  history,
  onBack,
  onOpenAssistantWithPatient
}: PatientDetailProps) {
  const [activeChart, setActiveChart] = useState<"fc" | "temp">("fc");

  const latest = history.length > 0 ? history[history.length - 1] : null;

  // Render highly-polished high-performance responsive SVG line chart
  const renderSvgLineChart = () => {
    if (history.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-dashed border-slate-800">
          <Activity className="text-slate-600 animate-pulse mb-2" size={32} />
          <p className="text-xs font-bold text-slate-400 font-sans">Sem histórico de telemetria</p>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] text-center">Ligue o emulador no painel (ou rode o Wokwi) para receber telemetria.</p>
        </div>
      );
    }

    // Capture values
    const values = history.map(item => activeChart === "fc" ? item.fc : item.temperatura);
    const minVal = Math.min(...values) - (activeChart === "fc" ? 8 : 0.5);
    const maxVal = Math.max(...values) + (activeChart === "fc" ? 8 : 0.5);
    const range = maxVal - minVal || 1;

    // Canvas size
    const width = 800;
    const height = 240;
    const padding = 35;

    // Map coordinates
    const points = history.map((item, index) => {
      const x = padding + (index / (history.length - 1 || 1)) * (width - 2 * padding);
      const val = activeChart === "fc" ? item.fc : item.temperatura;
      // Invert Y coordinate
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return { x, y, val, moment: item.momento };
    });

    // Build SVG Path
    let pathString = "";
    if (points.length > 0) {
      pathString = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        // Curve connection using bezier-approx
        pathString += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    // Build Gradient area Path
    let gradientPathString = "";
    if (points.length > 0) {
      gradientPathString = `${pathString} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    }

    const strokeColor = activeChart === "fc" ? "#ec4899" : "#3b82f6";
    const gradientId = `chart-gradient-${activeChart}`;

    return (
      <div className="relative">
        {/* Custom Grid Axis labels */}
        <div className="absolute top-2 left-3 bg-slate-950/90 backdrop-blur-xs py-1 px-2.5 rounded border border-slate-800 font-mono text-[9px] font-bold text-slate-400 shadow-md">
          Máx: {Math.round(maxVal * 10) / 10}{activeChart === "fc" ? " bpm" : " ºC"}
        </div>
        <div className="absolute bottom-10 left-3 bg-slate-950/90 backdrop-blur-xs py-1 px-2.5 rounded border border-slate-800 font-mono text-[9px] font-bold text-slate-400 shadow-md">
          Mín: {Math.round(minVal * 10) / 10}{activeChart === "fc" ? " bpm" : " ºC"}
        </div>

        {/* SVG Drawing container */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.24} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const h = padding + ratio * (height - 2 * padding);
            return (
              <line 
                key={i}
                x1={padding}
                y1={h}
                x2={width - padding}
                y2={h}
                stroke="#1e293b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area fill path */}
          {gradientPathString && (
            <path d={gradientPathString} fill={`url(#${gradientId})`} />
          )}

          {/* Line path */}
          {pathString && (
            <path 
              d={pathString} 
              fill="none" 
              stroke={strokeColor} 
              strokeWidth={3} 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactivity dots */}
          {points.map((pt, idx) => {
            const isLast = idx === points.length - 1;
            return (
              <g key={idx} className="group/dot">
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r={isLast ? 6 : 4} 
                  fill={isLast ? "#ef4444" : strokeColor} 
                  className={`transition-all duration-200 stroke-slate-950 stroke-[2.5] ${isLast ? "animate-soft-pulse r-7" : "hover:r-6"}`}
                />
                
                {/* Visual tooltip */}
                <foreignObject x={pt.x - 30} y={pt.y - 30} width="60" height="24" className="overflow-visible hidden group-hover/dot:block">
                  <div className="bg-slate-950 text-white font-mono text-[9px] py-0.5 rounded text-center shadow-md border border-slate-850 font-extrabold select-none">
                    {pt.val}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* X Axis time labels summary */}
        <div className="flex justify-between px-8 text-[9px] font-mono text-slate-500 border-t border-slate-800 pt-3">
          <span>Início do Registro</span>
          <span className="font-semibold text-slate-500">Intervalo de Amostragem IoT MicroPython (~3s)</span>
          <span>Leitura Mais Recente ({latest ? new Date(latest.momento).toLocaleTimeString() : "--"})</span>
        </div>
      </div>
    );
  };

  // Build risk dials
  const riskPercent = latest ? Math.round(latest.pontuacao_risco * 100) : 0;
  let dialColor = "text-emerald-400";
  let dialBg = "bg-emerald-950/20 border-emerald-900/40";
  let dialText = "BAIXO";

  if (latest) {
    if (latest.nivel_risco === "alto") {
      dialColor = "text-rose-400";
      dialBg = "bg-rose-950/20 border-rose-900/60";
      dialText = "CRÍTICO";
    } else if (latest.nivel_risco === "medio") {
      dialColor = "text-orange-400";
      dialBg = "bg-orange-950/20 border-orange-900/60";
      dialText = "ALERTA";
    }
  }

  return (
    <div id="patient-detail-panel" className="space-y-6">
      
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3.5 py-1.8 bg-slate-900 border border-slate-800 rounded-xl text-slate-350 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
        >
          <ArrowLeft size={14} className="stroke-[2.5]" />
          <span>Voltar ao Painel Geral</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Quick AI Trigger */}
          <button 
            onClick={() => onOpenAssistantWithPatient(patient.id)}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <MessageSquareCode size={14} className="text-cyan-400 stroke-[2.2]" />
            <span>Consultar MédicIA</span>
          </button>
        </div>
      </div>

      {/* 2. Patient Profile Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 text-slate-450 flex items-center justify-center font-extrabold text-lg shrink-0 shadow-inner">
            {patient.sexo === "F" ? "F" : "M"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-lg text-white leading-none">{patient.nome}</h3>
              <span className="px-2.5 py-1 bg-slate-950 text-slate-400 border border-slate-800 rounded-lg text-[10px] font-bold font-mono">
                PRONTUÁRIO #{patient.id * 1000 + 49}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs font-medium text-slate-400">
              <span className="font-bold text-slate-350">Idade:</span> {patient.idade} anos
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="font-bold text-slate-350">Sexo:</span> {patient.sexo === "F" ? "Feminino" : "Masculino"}
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="font-bold text-slate-350">CRM Responsável:</span> Dr. Médico - CardioIA
            </div>

            <p className="text-xs text-slate-400 mt-3 italic bg-slate-950 p-3 rounded-lg border border-slate-850">
              <span className="font-semibold text-slate-300 block not-italic leading-none mb-1 text-[11px]">Sintomas & Comorbidades Principais:</span>
              "{patient.observacoes || "Ficha sem anotações secundárias lançadas no prontuário."}"
            </p>
          </div>
        </div>

        {/* Risk Level gauge */}
        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center shadow-xs ${dialBg}`}>
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">Índice Previsor</span>
          <div className="my-1.5 flex items-baseline justify-center">
            <span className={`text-3xl font-extrabold font-mono leading-none tracking-tight ${dialColor}`}>{riskPercent}%</span>
          </div>
          <span className={`text-[10px] font-extrabold uppercase mt-0.5 px-2 py-0.5 rounded-full inline-block bg-slate-900 ${dialColor} border border-slate-800 shadow-2xs`}>
            {dialText} RISCO
          </span>
        </div>
      </div>

      {/* 3. Live SVG graph and selectors */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-rose-500" />
              <span>Oscilograma e Monitor de Padrões Cardíacos</span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Clique nas abas abaixo para alternar a telemetria do microcontrolador IoT.</p>
          </div>

          {/* Toggle buttons */}
          <div className="flex bg-slate-950 p-1 rounded-xl shrink-0 border border-slate-855 border-slate-800">
            <button
              onClick={() => setActiveChart("fc")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeChart === "fc" 
                  ? "bg-slate-800 text-rose-400 shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity size={13} />
              <span>Frequência Cardíaca (BPM)</span>
            </button>
            <button
              onClick={() => setActiveChart("temp")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeChart === "temp" 
                  ? "bg-slate-800 text-blue-400 shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Thermometer size={13} />
              <span>Temperatura (°C)</span>
            </button>
          </div>
        </div>

        {/* Standard Render chart */}
        {renderSvgLineChart()}
      </div>

      {/* 4. Instant readings status and Clinical Decision counter-measures */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BPM Quick view */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-5 select-none text-rose-500">
            <ActivitySquare size={90} className="stroke-[1]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Última Frequência Fóton</span>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-3xl font-mono font-extrabold text-white tracking-tight">
                {latest ? latest.fc : "--"}
              </span>
              <span className="text-xs font-bold text-slate-400">bpm</span>
            </div>
            {latest && (
              <span className={`text-[10px] font-semibold mt-1 inline-flex items-center gap-1 ${latest.fc > 100 || latest.fc < 55 ? "text-rose-400" : "text-emerald-400"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {latest.fc > 100 ? "Taquicardia Leve/Grave" : latest.fc < 55 ? "Bradicardia Severa" : "Ritmo Sinusal Estável"}
              </span>
            )}
          </div>
          <div className="border-t border-slate-800/80 pt-3.5 mt-4 text-[10px] text-slate-500 font-medium">
            Leitura gerada via ADC simulated ports.
          </div>
        </div>

        {/* Temp Quick View */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-5 select-none text-blue-500">
            <Thermometer size={90} className="stroke-[1]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Última Temperatura Corporal</span>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-3xl font-mono font-extrabold text-white tracking-tight">
                {latest ? latest.temperatura : "--"}
              </span>
              <span className="text-xs font-bold text-slate-400">°C</span>
            </div>
            {latest && (
              <span className={`text-[10px] font-semibold mt-1 inline-flex items-center gap-1 ${latest.temperatura > 37.8 ? "text-rose-400" : "text-emerald-400"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {latest.temperatura > 37.8 ? "Febre / Estresse Térmico" : "Normotermia Fisiológica"}
              </span>
            )}
          </div>
          <div className="border-t border-slate-800/80 pt-3.5 mt-4 text-[10px] text-slate-500 font-medium">
            Termistor digital simulado em barramento .py.
          </div>
        </div>

        {/* IA Decision Clinical Action Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Verificação de Risco IA</span>
            <div className="mt-2.5">
              <span className={`text-[11px] py-1 px-2.5 rounded-lg font-extrabold inline-block text-white ${
                latest?.nivel_risco === "alto" ? "bg-rose-600" : latest?.nivel_risco === "medio" ? "bg-orange-500" : "bg-emerald-600"
              }`}>
                RISCO {latest ? latest.nivel_risco.toUpperCase() : "AGUARDANDO"}
              </span>
              <p className="text-[11px] text-slate-350 mt-2 font-medium leading-relaxed">
                {latest ? latest.recomendacao : "Inicie o simulador IoT para ativar a verificação preditiva de crise cardíaca."}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800/80 pt-3 mt-4 text-[9px] font-mono font-bold text-rose-400">
            CARDIO-IA ENGINE CLASSIFIER PRO
          </div>
        </div>

      </div>

    </div>
  );
}
