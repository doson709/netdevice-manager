import React from "react";
import { Laptop, Wifi, WifiOff, AlertTriangle } from "lucide-react";

export default function StatsCards({ stats }) {
  if (!stats) return null;

  const diskAlertsCount = stats.alerts ? stats.alerts.filter((a) => a.type === "disk").length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
      {/* Card 1: Tổng máy */}
      <div className="glass-card p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-all duration-300" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tổng máy trạm</p>
            <h3 className="text-4xl font-extrabold text-white mt-2">{stats.total_devices}</h3>
          </div>
          <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 text-brand-400 glow-brand">
            <Laptop className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Card 2: Máy Online */}
      <div className="glass-card p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Máy Online</p>
            <h3 className="text-4xl font-extrabold text-emerald-400 mt-2">{stats.online_devices}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 glow-emerald">
            <Wifi className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Card 3: Máy Offline */}
      <div className="glass-card p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-300" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Máy Offline</p>
            <h3 className="text-4xl font-extrabold text-rose-400 mt-2">{stats.offline_devices}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400 glow-rose">
            <WifiOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Card 4: Cảnh báo ổ đĩa */}
      <div className="glass-card p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cảnh báo ổ đĩa</p>
            <h3 className="text-4xl font-extrabold text-amber-400 mt-2">
              {diskAlertsCount}
            </h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
