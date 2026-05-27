import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { ArrowLeft, Monitor, User, MapPin, Building, Activity, HardDrive, Cpu, ShieldAlert, Award, Globe, Edit3, Check, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function DeviceDetail({ deviceId, onBackToList }) {
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Software section states
  const [swData, setSwData] = useState([]);
  const [swTotal, setSwTotal] = useState(0);
  const [swPage, setSwPage] = useState(1);
  const [swSearch, setSwSearch] = useState("");
  const [swLoading, setSwLoading] = useState(false);
  const swLimit = 10;

  // Metadata editing states
  const [isEditing, setIsEditing] = useState(false);
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [owner, setOwner] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDeviceDetail(deviceId);
      setDetail(res);
      
      // Khởi tạo các ô nhập liệu metadata chỉnh sửa
      setLocation(res.device.location || "");
      setDepartment(res.device.department || "");
      setOwner(res.device.owner || "");
      
      // Tải lịch sử vẽ biểu đồ tài nguyên
      const histRes = await api.getDeviceHistory(deviceId);
      setHistory(histRes);
      
      setError("");
    } catch (err) {
      setError("Không thể tải thông tin chi tiết thiết bị này.");
    } finally {
      setLoading(false);
    }
  };

  const loadSoftware = async () => {
    try {
      setSwLoading(true);
      const res = await api.getDeviceSoftware(deviceId, {
        page: swPage,
        limit: swLimit,
        search: swSearch
      });
      setSwData(res.data);
      setSwTotal(res.total);
    } catch (err) {
      console.error("Lỗi tải danh sách phần mềm:", err);
    } finally {
      setSwLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deviceId]);

  useEffect(() => {
    loadSoftware();
  }, [deviceId, swPage, swSearch]);

  const handleUpdateMetadata = async () => {
    try {
      await api.updateDeviceMetadata(deviceId, {
        location,
        department,
        owner
      });
      setIsEditing(false);
      
      // Reload lại thông tin
      const updated = { ...detail };
      updated.device.location = location;
      updated.device.department = department;
      updated.device.owner = owner;
      setDetail(updated);
    } catch (err) {
      alert("Cập nhật thông tin thất bại!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <button onClick={onBackToList} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </button>
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-6 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span>{error || "Không tìm thấy dữ liệu thiết bị."}</span>
        </div>
      </div>
    );
  }

  const { device, latest_snapshot, disks, network_adapters } = detail;
  const swTotalPages = Math.ceil(swTotal / swLimit) || 1;

  // Format biểu đồ lịch sử 24h
  const chartData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    "CPU%": h.cpu_usage,
    "RAM%": h.ram_usage
  }));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-3">
          <button onClick={onBackToList} className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-all font-medium">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-brand-400">
              <Monitor className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">{device.hostname}</h2>
                {device.is_online ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-800/40 text-slate-500 border border-slate-700/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">ID Thiết bị (UUID): {device.device_id}</p>
            </div>
          </div>
        </div>

        {/* Action Button: Edit / Delete */}
        <div className="flex gap-3">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleUpdateMetadata}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/10 transition-all"
              >
                <Check className="w-4 h-4" /> Lưu
              </button>
              <button
                onClick={() => { setIsEditing(false); loadData(); }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl font-semibold transition-all"
              >
                <X className="w-4 h-4" /> Hủy
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 rounded-xl transition-all font-semibold text-slate-300"
            >
              <Edit3 className="w-4 h-4" /> Chỉnh sửa thông tin
            </button>
          )}
        </div>
      </div>

      {/* METADATA INFO PANEL */}
      <div className="glass-panel p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Người quản lý */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Người phụ trách máy</p>
            {isEditing ? (
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="glass-input text-xs w-full mt-1.5"
              />
            ) : (
              <p className="text-slate-200 text-sm font-bold mt-1.5">{device.owner || "Chưa thiết lập"}</p>
            )}
          </div>
        </div>

        {/* Vị trí */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Vị trí lắp đặt</p>
            {isEditing ? (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="glass-input text-xs w-full mt-1.5"
              />
            ) : (
              <p className="text-slate-200 text-sm font-bold mt-1.5">{device.location || "Chưa thiết lập"}</p>
            )}
          </div>
        </div>

        {/* Phòng ban */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500">
            <Building className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Phòng ban</p>
            {isEditing ? (
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="glass-input text-xs w-full mt-1.5"
              />
            ) : (
              <p className="text-slate-200 text-sm font-bold mt-1.5">{device.department || "Chưa thiết lập"}</p>
            )}
          </div>
        </div>
      </div>

      {/* CORE HARDWARE INFO & HISTORY CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Hardware snapshot (left panel) */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-brand-400" /> Cấu hình phần cứng
            </h4>
            
            <div className="space-y-4 text-xs">
              {/* CPU Model */}
              <div className="pb-3 border-b border-slate-800/60">
                <p className="text-slate-500 font-medium">Bộ vi xử lý (CPU):</p>
                <p className="text-slate-200 font-bold mt-1 leading-relaxed">
                  {latest_snapshot.cpu_model || "Đang quét..."} ({latest_snapshot.cpu_cores} Threads)
                </p>
              </div>

              {/* RAM Total */}
              <div className="pb-3 border-b border-slate-800/60">
                <p className="text-slate-500 font-medium">Bộ nhớ (RAM):</p>
                <p className="text-slate-200 font-bold mt-1">
                  {latest_snapshot.ram_total_gb} GB RAM vật lý
                </p>
              </div>

              {/* GPU Information */}
              <div className="pb-3 border-b border-slate-800/60">
                <p className="text-slate-500 font-medium">Bộ xử lý đồ họa (GPU):</p>
                {latest_snapshot.gpu_info && latest_snapshot.gpu_info.length > 0 ? (
                  latest_snapshot.gpu_info.map((gpu, idx) => (
                    <p key={idx} className="text-slate-200 font-bold mt-1">
                      {gpu.name} ({gpu.vram_gb} GB VRAM)
                    </p>
                  ))
                ) : (
                  <p className="text-slate-500 mt-1">Không phát hiện VGA rời</p>
                )}
              </div>

              {/* Motherboard & BIOS */}
              <div className="pb-3 border-b border-slate-800/60">
                <p className="text-slate-500 font-medium">Mainboard & BIOS:</p>
                <p className="text-slate-200 font-bold mt-1 leading-relaxed">
                  {latest_snapshot.motherboard?.manufacturer} {latest_snapshot.motherboard?.product} <br />
                  <span className="text-[10px] text-slate-500">BIOS: {latest_snapshot.bios?.manufacturer} v{latest_snapshot.bios?.version} ({latest_snapshot.bios?.release_date})</span>
                </p>
              </div>
            </div>
          </div>

          {/* OS activation & System stats */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 mt-4 space-y-2.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Kiến trúc hệ thống:</span>
              <span className="text-slate-300 font-bold">{device.architecture}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Bản quyền Windows:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Activated (Permanent)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Thời gian hoạt động (Uptime):</span>
              <span className="text-slate-300 font-bold">
                {latest_snapshot ? `${Math.floor(latest_snapshot.uptime_seconds / 3600 / 24)} ngày, ${Math.floor((latest_snapshot.uptime_seconds / 3600) % 24)} giờ` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* History charts (right panel) */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> Biểu đồ tài nguyên hệ thống (24h)
            </h4>
            <p className="text-xs text-slate-500 mb-6 font-semibold">Theo dõi hiệu năng tải trung bình của CPU và Bộ nhớ RAM.</p>
          </div>

          <div className="flex-1 min-h-[220px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0e91eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0e91eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                  />
                  <Area type="monotone" dataKey="CPU%" stroke="#0e91eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
                  <Area type="monotone" dataKey="RAM%" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Chưa có đủ dữ liệu lịch sử để hiển thị đồ thị tài nguyên.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DISKS AND ADAPTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drive partitioning progress bars */}
        <div className="glass-panel p-6 rounded-2xl">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-6">
            <HardDrive className="w-4 h-4 text-amber-400" /> Bản đồ ổ đĩa phân vùng
          </h4>
          
          <div className="space-y-5">
            {disks.map((d, idx) => {
              const isHighUsage = d.usage_percent >= 90.0;
              return (
                <div key={idx} className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-200">Ổ đĩa {d.device} ({d.mountpoint})</span>
                    <span className={isHighUsage ? "text-rose-400" : "text-slate-400"}>
                      Đã dùng {d.used_gb} GB / {d.total_gb} GB ({d.usage_percent}%)
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full h-3 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHighUsage ? "bg-rose-500 glow-rose" : "bg-brand-500 glow-brand"
                      }`}
                      style={{ width: `${d.usage_percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Network adapters info list */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-6">
              <Globe className="w-4 h-4 text-slate-400" /> Cổng mạng chi tiết (Network Adapters)
            </h4>

            <div className="space-y-3.5">
              {network_adapters.map((net, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{net.adapter_name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">MAC: {net.mac_address}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-brand-400 font-mono">{net.ip_address}</p>
                    <p className="text-[9px] text-slate-600 font-mono mt-0.5">Mask: {net.netmask}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* INSTALLED SOFTWARE PAGINATED LIST (HIGH PERFORMANCE OPTIMIZED) */}
      <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Danh sách phần mềm đã cài đặt ({swTotal})
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase">
              Đọc trực tiếp từ Windows Registry trạm
            </p>
          </div>

          {/* Tìm kiếm phần mềm */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Tìm tên phần mềm, nhà sản xuất..."
              value={swSearch}
              onChange={(e) => { setSwSearch(e.target.value); setSwPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500 transition-all placeholder-slate-500"
            />
          </div>
        </div>

        {/* Software list Table view */}
        <div className="overflow-hidden border border-slate-800/60 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 font-semibold text-slate-400">
                <th className="px-6 py-3.5">Tên ứng dụng</th>
                <th className="px-6 py-3.5">Phiên bản</th>
                <th className="px-6 py-3.5">Hãng sản xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {swLoading ? (
                <tr>
                  <td colSpan="3" className="text-center py-10">
                    <div className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : swData.length > 0 ? (
                swData.map((sw, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/10 text-slate-300">
                    <td className="px-6 py-3 font-bold text-slate-200">{sw.name}</td>
                    <td className="px-6 py-3 font-mono text-[11px] text-slate-400">{sw.version || "-"}</td>
                    <td className="px-6 py-3 text-slate-400">{sw.publisher || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-10 text-slate-500 font-semibold">
                    Không tìm thấy phần mềm cài đặt nào thỏa mãn tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Software Pagination Panel */}
        {swTotalPages > 1 && (
          <div className="flex items-center justify-between bg-slate-900/10 border border-slate-800/40 p-4 rounded-xl">
            <span className="text-xs text-slate-400 font-semibold">
              Hiển thị <span className="text-slate-200 font-bold">{swData.length}</span> / <span className="text-slate-200 font-bold">{swTotal}</span> phần mềm
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSwPage(p => Math.max(p - 1, 1))}
                disabled={swPage === 1}
                className="p-1 bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:hover:border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-300 font-bold px-3">
                Trang {swPage} / {swTotalPages}
              </span>
              <button
                onClick={() => setSwPage(p => Math.min(p + 1, swTotalPages))}
                disabled={swPage === swTotalPages}
                className="p-1 bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:hover:border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
