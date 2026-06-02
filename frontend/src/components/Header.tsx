import React, { useState, useEffect } from "react";
import { CloudOff, RefreshCw, Sliders, Settings, CheckCircle, AlertCircle, Wifi } from "lucide-react";
import { getBaseUrl, setBaseUrl, apiService, DEFAULT_API_URL } from "../services/api";

interface HeaderProps {
  activeTab: string;
}

export default function Header({ activeTab }: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(getBaseUrl());
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "online" | "offline">("checking");
  const [backendHealth, setBackendHealth] = useState<string>("Verificando...");
  const [isSyncing, setIsSyncing] = useState(false);

  // Get localized Portuguese tab clean name
  const getTabTitle = () => {
    switch (activeTab) {
      case "painel":
        return "Painel de Telemetria e Pacientes";
      case "dossie":
        return "Dossiê Clínico do Paciente";
      case "assistente":
        return "Conversação Assistida (MédicIA)";
      default:
        return "CardioIA Central";
    }
  };

  const testConnection = async () => {
    setIsSyncing(true);
    setConnectionStatus("checking");
    setBackendHealth("Conectando...");
    try {
      const res = await apiService.checkHealth();
      setConnectionStatus("online");
      setBackendHealth(res.service || "Serviço ativo e operacional");
    } catch (err: any) {
      setConnectionStatus("offline");
      setBackendHealth("Servidor inacessível. O túnel Cloudflare pode estar pausado.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Run on mount or when API URL changes
  useEffect(() => {
    testConnection();
  }, [apiUrl]);

  const handleSaveSettings = () => {
    setBaseUrl(apiUrl);
    setShowSettings(false);
    // Recarrega para recalcular o contexto do cliente HTTP com a nova URL
    window.location.reload();
  };

  return (
    <header id="app-header" className="bg-slate-900/50 border-b border-slate-800 px-8 py-4 relative text-white">
      <div className="flex items-center justify-between">
        {/* Title portion */}
        <div>
          <h2 id="header-tab-title" className="text-xl font-bold text-white tracking-tight leading-tight">
            {getTabTitle()}
          </h2>
          <p id="header-date" className="text-xs text-slate-500 mt-0.5 font-medium">
            Plataforma de Inteligência Cardíaca Total · Fase 7
          </p>
        </div>

        {/* Integration Status bar widgets */}
        <div className="flex items-center gap-4">
          {/* Quick status pill */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 shadow-xs cursor-pointer ${
              connectionStatus === "online"
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-900 hover:bg-emerald-950/60"
                : connectionStatus === "checking"
                ? "bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800"
                : "bg-rose-950/40 text-rose-400 border-rose-900 hover:bg-rose-950/60"
            }`}
          >
            {connectionStatus === "online" ? (
              <>
                <Wifi size={14} className="stroke-[2.5] text-emerald-400 animate-pulse" />
                <span>Backend Conectado</span>
              </>
            ) : connectionStatus === "checking" ? (
              <>
                <RefreshCw size={14} className="stroke-[2.5] animate-spin" />
                <span>Verificando conexão...</span>
              </>
            ) : (
              <>
                <CloudOff size={14} className="stroke-[2.5] text-rose-400 animate-bounce" />
                <span>Backend Indisponível</span>
              </>
            )}
            <Settings size={13} className="ml-1 opacity-60" />
          </button>
        </div>
      </div>

      {/* Settings slide-down Panel */}
      {showSettings && (
        <div id="settings-dropdown" className="absolute top-18 right-8 z-50 w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm leading-none">
              <Sliders size={16} className="text-rose-500" />
              <span>Conexão com o Backend CardioIA</span>
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-slate-500 hover:text-slate-300 font-bold"
            >
              Fechar
            </button>
          </div>

          <div className="space-y-4">
            {/* API Endpoint text input */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 block">Endpoint Base do Backend (FastAPI / Cloudflare Tunnel)</span>
              <p className="text-[10px] text-slate-500">
                A URL do quick tunnel é efêmera — atualize aqui (ou no <span className="font-mono">.env</span> via <span className="font-mono">VITE_API_URL</span>) sempre que o túnel reiniciar.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://sua-url-trycloudflare.com"
                  className="flex-1 text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono bg-slate-950 text-slate-350 focus:bg-slate-950"
                />
                <button
                  onClick={testConnection}
                  disabled={isSyncing}
                  className="px-2.5 py-2 border border-slate-800 rounded-lg bg-slate-800 hover:bg-slate-705 hover:bg-slate-700 transition-colors cursor-pointer text-slate-300 font-medium text-xs flex items-center"
                >
                  <RefreshCw size={14} className={`animate-spin-slow ${isSyncing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Connection Test Results */}
            <div className="flex items-start gap-2.5 text-xs">
              {connectionStatus === "online" ? (
                <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-300">Status do Ensaio de Conexão:</span>
                <p className="text-[10px] font-mono text-slate-500">{backendHealth}</p>
              </div>
            </div>

            {/* Execute updates */}
            <div className="flex gap-2 pt-2 border-t border-slate-800 justify-end">
              <button
                onClick={() => setApiUrl(DEFAULT_API_URL)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
              >
                Resetar Padrão
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Aplicar e Recarregar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
