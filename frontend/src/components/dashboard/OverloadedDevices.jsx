import React from "react";
import { Cpu, CheckCircle2 } from "lucide-react";

export default function OverloadedDevices({ highLoadDevices, onNavigateToDevice }) {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col lg:col-span-1 animate-fade-in">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-amber-500 animate-pulse" /> Giám sát máy quá tải
      </h4>
      <p className="text-[10px] text-slate-500 mb-4 font-semibold uppercase">
        Các máy trạm có tải CPU &gt; 80% hoặc RAM &gt; 85%
      </p>
      
      <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2.5 pr-2">
        {highLoadDevices && highLoadDevices.length > 0 ? (
          highLoadDevices.map((dev, idx) => (
            <div
              key={idx}
              onClick={() => onNavigateToDevice(dev.device_id)}
              className="p-3 bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/35 hover:bg-amber-500/10 rounded-xl cursor-pointer hover:scale-[1.01] transition-all duration-200 text-xs"
            >
              <div className="flex justify-between font-bold text-slate-200">
                <span className="truncate pr-1">{dev.client_name}</span>
                <span className="text-[10px] text-slate-500 shrink-0">({dev.hostname})</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 font-semibold">
                <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded-lg border border-slate-900/60">
                  <span className="text-slate-500 text-[9px] uppercase">CPU</span>
                  <span className={dev.cpu_usage > 80 ? "text-amber-400 font-extrabold" : "text-slate-400"}>
                    {Math.round(dev.cpu_usage)}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded-lg border border-slate-900/60">
                  <span className="text-slate-500 text-[9px] uppercase">RAM</span>
                  <span className={dev.ram_usage > 85 ? "text-rose-400 font-extrabold" : "text-slate-400"}>
                    {Math.round(dev.ram_usage)}%
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 h-full">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-fade-in" />
            <span className="text-xs text-center leading-relaxed">Toàn mạng an toàn.<br />Không có máy nào quá tải CPU/RAM!</span>
          </div>
        )}
      </div>
    </div>
  );
}
