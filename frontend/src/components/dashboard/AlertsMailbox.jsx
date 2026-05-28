import React from "react";
import { Bell, HardDrive, WifiOff, CheckCircle2 } from "lucide-react";

export default function AlertsMailbox({ alerts, onNavigateToDevice }) {
  const alertsList = alerts || [];

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col lg:col-span-1 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-400" /> Hộp thư cảnh báo
        </h4>
        <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-semibold px-2 py-1 rounded-md">
          Thời gian thực
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3 pr-2">
        {alertsList.length > 0 ? (
          alertsList.map((alert, index) => (
            <div
              key={index}
              onClick={() => onNavigateToDevice(alert.device_id)}
              className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer hover:bg-slate-800/20 hover:scale-[1.01] transition-all duration-200 ${
                alert.type === "disk"
                  ? "bg-rose-500/5 border-rose-500/20 text-rose-300"
                  : "bg-slate-900/60 border-slate-800/80 text-slate-300"
              }`}
            >
              {alert.type === "disk" ? (
                <HardDrive className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <WifiOff className="w-5 h-5 shrink-0 text-slate-500 mt-0.5" />
              )}
              <div className="text-xs">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-slate-200">{alert.client_name || alert.hostname}</p>
                  {alert.client_name && alert.client_name !== alert.hostname && (
                    <span className="text-[10px] text-slate-500 font-normal">({alert.hostname})</span>
                  )}
                </div>
                <p className="text-slate-400 leading-relaxed truncate max-w-[200px]">{alert.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 h-full">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-fade-in" />
            <span className="text-xs">Hệ thống an toàn. Không có cảnh báo hoạt động nào!</span>
          </div>
        )}
      </div>
    </div>
  );
}
