import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Laptop, Wifi, WifiOff, AlertTriangle, Cpu, HardDrive, Bell, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ["#0e91eb", "#10b981", "#f43f5e", "#fbbf24", "#a855f7", "#ec4899", "#64748b"];

export default function Dashboard({ onNavigateToDevice }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setStats(res);
      setError("");
    } catch (err) {
      setError("Không thể tải thông tin thống kê từ Server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Tự động làm mới mỗi 30 giây
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-6 rounded-2xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Tổng quan hệ thống</h2>
          <p className="text-slate-400 text-sm mt-1">
            Số liệu giám sát thời gian thực của toàn bộ máy trạm trong mạng nội bộ.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 rounded-xl transition-all font-medium"
        >
          Làm mới
        </button>
      </div>

      {/* 4 CARDS THỐNG KÊ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                {stats.alerts.filter((a) => a.type === "disk").length}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ TÀI NGUYÊN TRUNG BÌNH TOÀN MẠNG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {stats.os_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.os_distribution}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                  />
                  <Bar dataKey="value" fill="#0e91eb" radius={[6, 6, 0, 0]}>
                    {stats.os_distribution.map((entry, index) => (
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

      {/* PHÒNG BAN & HỘP THƯ CẢNH BÁO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department distribution */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col lg:col-span-1">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Cơ cấu phòng ban</h4>
          <div className="flex-1 min-h-[200px] flex items-center justify-center">
            {stats.departments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.departments}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.departments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs">Chưa có thông tin phòng ban.</div>
            )}
          </div>
          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
            {stats.departments.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate">{item.name}: {item.value} máy</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts panel */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-400" /> Hộp thư cảnh báo
            </h4>
            <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-semibold px-2 py-1 rounded-md">
              Thời gian thực
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-3 pr-2">
            {stats.alerts.length > 0 ? (
              stats.alerts.map((alert, index) => (
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
                    <p className="text-slate-400 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span className="text-xs">Hệ thống an toàn. Không có cảnh báo hoạt động nào!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
