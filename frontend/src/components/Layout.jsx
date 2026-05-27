import React from "react";
import { LayoutDashboard, Monitor, Search, RefreshCw, Cpu, Server, Wifi, ShieldCheck, Network } from "lucide-react";

export default function Layout({ children, activeTab, setActiveTab }) {
  const menuItems = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { id: "devices", label: "Thiết bị mạng", icon: Monitor },
    { id: "software", label: "Tra cứu phần mềm", icon: Search },
    { id: "topology", label: "Bản đồ mạng", icon: Network },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 flex flex-col z-10">
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="p-1.5 bg-brand-500/10 rounded-xl border border-brand-500/20 text-brand-400 glow-brand">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              NetDevice
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              Manager Enterprise
            </p>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10 border border-brand-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                }`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Mạng nội bộ an toàn</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-400">Hệ thống giám sát thiết bị trạm</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 text-xs bg-slate-950 border border-slate-800/80 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-slate-400">Server API:</span>
              <span className="text-slate-300 font-semibold">Online (8085)</span>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-950 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
