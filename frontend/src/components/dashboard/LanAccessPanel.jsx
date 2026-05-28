import React from "react";
import { Globe } from "lucide-react";

export default function LanAccessPanel({ serverIps }) {
  if (!serverIps || serverIps.length === 0) return null;

  return (
    <div className="glass-panel p-5 rounded-2xl border border-brand-500/10 bg-slate-900/10 shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-400 glow-brand mt-0.5">
          <Globe className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Địa chỉ truy cập mạng nội bộ (LAN)</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Người dùng khác trong mạng Wifi / Ethernet nội bộ có thể truy cập trực tiếp vào hệ thống quản lý qua các đường dẫn sau:
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 md:justify-end">
        {serverIps.map((ip, idx) => (
          <a
            key={idx}
            href={`http://${ip}:5173`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-950/80 border border-slate-800 hover:border-brand-500/40 text-brand-400 hover:text-white transition-all font-mono"
          >
            http://{ip}:5173
          </a>
        ))}
      </div>
    </div>
  );
}
