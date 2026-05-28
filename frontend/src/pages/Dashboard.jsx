import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { AlertTriangle } from "lucide-react";

// Import các subcomponents đã tách nhỏ
import LanAccessPanel from "../components/dashboard/LanAccessPanel";
import StatsCards from "../components/dashboard/StatsCards";
import ResourceCharts from "../components/dashboard/ResourceCharts";
import DiskMonitor from "../components/dashboard/DiskMonitor";
import DepartmentStructure from "../components/dashboard/DepartmentStructure";
import OverloadedDevices from "../components/dashboard/OverloadedDevices";
import AlertsMailbox from "../components/dashboard/AlertsMailbox";

export default function Dashboard({ onNavigateToDevice }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getDashboardStats();
      setStats(res);
      setError("");
    } catch (err) {
      setError("Không thể tải thông tin thống kê từ Server.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
    // Tự động làm mới ngầm mỗi 5 giây
    const timer = setInterval(() => {
      loadData(true);
    }, 5000);
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
    <div className="space-y-8 animate-fade-in relative">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Tổng quan hệ thống</h2>
          <p className="text-slate-400 text-sm mt-1">
            Số liệu giám sát thời gian thực của toàn bộ máy trạm trong mạng nội bộ.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/15">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
            Tự động làm mới (5s)
          </span>
          <button
            onClick={() => loadData(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 rounded-xl transition-all font-medium text-slate-300"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* 1. LAN ACCESS PANEL */}
      <LanAccessPanel serverIps={stats.server_ips} />

      {/* 2. 4 CARDS THỐNG KÊ */}
      <StatsCards stats={stats} />

      {/* 3. BIỂU ĐỒ TÀI NGUYÊN TRUNG BÌNH TOÀN MẠNG & OS DISTRIBUTION */}
      <ResourceCharts stats={stats} />

      {/* 4. GIÁM SÁT DUNG LƯỢNG Ổ ĐĨA TOÀN MẠNG (TỦ RACK) */}
      <DiskMonitor 
        diskDistribution={stats.disk_distribution} 
        onNavigateToDevice={onNavigateToDevice} 
      />

      {/* 5. PHÒNG BAN, QUÁ TẢI & HỘP THƯ CẢNH BÁO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cơ cấu phòng ban */}
        <DepartmentStructure departments={stats.departments} />

        {/* Giám sát máy quá tải */}
        <OverloadedDevices 
          highLoadDevices={stats.high_load_devices} 
          onNavigateToDevice={onNavigateToDevice} 
        />

        {/* Hộp thư cảnh báo */}
        <AlertsMailbox 
          alerts={stats.alerts} 
          onNavigateToDevice={onNavigateToDevice} 
        />
      </div>
    </div>
  );
}
