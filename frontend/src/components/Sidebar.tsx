
import React from "react";
import { HeartPulse, Users, MessageSquareCode, LogOut, Bell } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alarmsCount: number;
  user: string | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, alarmsCount, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "painel", label: "Painel Médico", icon: Users, badge: alarmsCount > 0 ? alarmsCount : undefined },
    { id: "assistente", label: "Falar com MédicIA", icon: MessageSquareCode },
  ];

  return (
    <aside id="sidebar-container" className="w-72 bg-[#0b1329] text-slate-300 flex flex-col shrink-0 border-r border-[#1e293b]/50 select-none">
      {/* Brand Logo header */}
      <div id="sidebar-header" className="p-6 flex items-center gap-3 border-b border-[#1e293b]/50">
        <div id="logo-icon-bg" className="bg-rose-500/10 text-rose-500 p-2.5 rounded-xl border border-rose-500/20 animate-pulse">
          <HeartPulse size={24} className="stroke-[2.5]" />
        </div>
        <div>
          <h1 id="sidebar-title" className="font-extrabold text-[1.4rem] tracking-tight text-white leading-none">
            Cardio<span className="text-rose-500 text-[1.5rem] font-bold">IA</span>
          </h1>
          <span id="sidebar-subtitle" className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-400">
            Fase 7 · Total Clinic
          </span>
        </div>
      </div>

      {/* User profile brief */}
      {user && (
        <div id="sidebar-user" className="px-6 py-4 border-b border-[#1e293b]/30 bg-[#0f172a]/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold border border-rose-500/30 text-sm">
            MD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-slate-200 truncate leading-tight">Dr. Médico Coordenador</p>
            <p className="text-[0.65rem] font-mono text-rose-400 leading-tight">Sessão Ativa · CRM 12345</p>
          </div>
          {alarmsCount > 0 && (
            <div className="relative animate-soft-pulse">
              <Bell size={14} className="text-rose-400 animate-bounce" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500"></div>
            </div>
          )}
        </div>
      )}

      {/* Menus List */}
      <nav id="sidebar-nav" className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id || (item.id === "painel" && activeTab === "dossie");
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm group ${
                isActive 
                  ? "bg-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20" 
                  : "hover:bg-[#15203b] hover:text-white text-slate-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent 
                  size={18} 
                  className={`transition-transform duration-300 ${
                    isActive ? "scale-110 text-white" : "text-slate-400 group-hover:text-rose-400"
                  }`} 
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? "bg-white text-rose-600" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout & Footer */}
      <div id="sidebar-footer" className="p-4 border-t border-[#1e293b]/50 bg-[#070c1a]">
        <button
          id="logout-btn"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          <span>Encerrar Sessão</span>
        </button>
        <div className="mt-3 text-center">
          <p className="text-[10px] font-mono text-slate-500">CardioIA MVP v1.0.0</p>
          <p className="text-[8px] text-slate-600">FIAP · Grupo 14 © 2026</p>
        </div>
      </div>
    </aside>
  );
}
