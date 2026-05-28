import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const COLORS = ["#0e91eb", "#10b981", "#f43f5e", "#fbbf24", "#a855f7", "#ec4899", "#64748b"];

export default function ResourceCharts({ stats }) {
  if (!stats) return null;

  const osDistribution = stats.os_distribution || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* CPU/RAM Average gauges */}
      <div className="glass-panel p-6 rounded-2xl">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">Tải tài nguyên trung bình mạng</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* CPU Monitor */}
          <div className="flex flex-col items-center bg-slate-950/40 border border-slate-800/40 p-6 rounded-2xl">
            <div className="relative flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="46" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  stroke="#0e91eb"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - stats.avg_cpu_usage / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-white">{stats.avg_cpu_usage}%</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">CPU</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">Tải CPU hoạt động</p>
          </div>

          {/* RAM Monitor */}
          <div className="flex flex-col items-center bg-slate-950/40 border border-slate-800/40 p-6 rounded-2xl">
            <div className="relative flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="46" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - stats.avg_ram_usage / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-white">{stats.avg_ram_usage}%</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">RAM</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">RAM đã sử dụng</p>
          </div>
        </div>
      </div>

      {/* OS Bar chart */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">Thống kê theo Hệ điều hành</h4>
        <div className="flex-1 min-h-[160px]">
          {osDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={osDistribution}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                />
                <Bar dataKey="value" fill="#0e91eb" radius={[6, 6, 0, 0]}>
                  {osDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">Chưa có thông tin OS.</div>
          )}
        </div>
      </div>
    </div>
  );
}
