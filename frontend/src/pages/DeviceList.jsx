import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Monitor, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, User, MapPin, Building, Trash2 } from "lucide-react";

export default function DeviceList({ onNavigateToDevice }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Các state kiểm soát phân trang, tìm kiếm, sắp xếp và lọc
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [sortBy, setSortBy] = useState("last_seen");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const limit = 15;

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.getDevices({
        page,
        limit,
        search,
        status,
        department,
        location,
        sort_by: sortBy,
        sort_dir: sortDir
      });
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error("Lỗi tải danh sách thiết bị:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [page, search, status, department, location, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleDelete = async (e, id, hostname) => {
    e.stopPropagation(); // Ngăn sự kiện click dòng chuyển trang chi tiết
    if (window.confirm(`Bạn có chắc chắn muốn xóa thiết bị '${hostname}' khỏi hệ thống?`)) {
      try {
        await api.deleteDevice(id);
        loadDevices();
      } catch (err) {
        alert("Xóa thiết bị thất bại.");
      }
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Danh sách thiết bị</h2>
        <p className="text-slate-400 text-sm mt-1">
          Theo dõi cấu hình, trạng thái tải tài nguyên và thông số mạng của tất cả máy client.
        </p>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="glass-panel p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Tìm kiếm */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Tìm theo tên máy, user..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        {/* Lọc trạng thái */}
        <div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Lọc phòng ban */}
        <div>
          <input
            type="text"
            placeholder="Lọc phòng ban (ví dụ: IT)"
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Lọc vị trí */}
        <div>
          <input
            type="text"
            placeholder="Lọc vị trí đặt máy..."
            value={location}
            onChange={(e) => { setLocation(e.target.value); setPage(1); }}
            className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* TABLE PANEL */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/30 text-xs font-semibold text-slate-400 tracking-wider uppercase">
                <th className="px-6 py-4.5 cursor-pointer hover:text-slate-200" onClick={() => handleSort("client_name")}>
                  <div className="flex items-center gap-1.5">Tên Client / Tên máy <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-6 py-4.5">Người phụ trách</th>
                <th className="px-6 py-4.5">Bộ phận / Vị trí</th>
                <th className="px-6 py-4.5 text-center">Trạng thái</th>
                <th className="px-6 py-4.5 text-center">CPU %</th>
                <th className="px-6 py-4.5 text-center">RAM %</th>
                <th className="px-6 py-4.5 cursor-pointer hover:text-slate-200" onClick={() => handleSort("last_seen")}>
                  <div className="flex items-center gap-1.5 justify-center">Báo cáo cuối <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-6 py-4.5 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-20">
                    <div className="inline-block w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((dev) => (
                  <tr
                    key={dev.device_id}
                    onClick={() => onNavigateToDevice(dev.device_id)}
                    className="hover:bg-slate-900/30 cursor-pointer transition-all duration-150 group"
                  >
                    {/* Tên Client & OS */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl text-slate-400 group-hover:text-brand-400 group-hover:border-brand-500/20 transition-all">
                          <Monitor className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{dev.client_name || dev.hostname}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Tên máy: {dev.hostname} • {dev.os_name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Người phụ trách */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-300">
                        <span className="font-semibold flex items-center gap-1"><User className="w-3 h-3 text-slate-500" /> {dev.owner || "Unknown"}</span>
                        <span className="text-[10px] text-slate-500">User: {dev.current_user}</span>
                      </div>
                    </td>

                    {/* Bộ phận / Vị trí */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-400">
                        <span className="flex items-center gap-1"><Building className="w-3 h-3 text-slate-600" /> {dev.department || "IT"}</span>
                        <span className="text-[10px] flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5 text-slate-600" /> {dev.location || "Unknown"}</span>
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-6 py-4 text-center">
                      {dev.is_online ? (
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
                    </td>

                    {/* CPU % */}
                    <td className="px-6 py-4 text-center font-bold">
                      <span className={dev.is_online && dev.cpu_usage > 80 ? "text-rose-400" : "text-slate-300"}>
                        {dev.is_online ? `${dev.cpu_usage}%` : "-"}
                      </span>
                    </td>

                    {/* RAM % */}
                    <td className="px-6 py-4 text-center font-bold">
                      <span className={dev.is_online && dev.ram_usage > 85 ? "text-rose-400" : "text-slate-300"}>
                        {dev.is_online ? `${dev.ram_usage}%` : "-"}
                      </span>
                    </td>

                    {/* Lần báo cáo cuối */}
                    <td className="px-6 py-4 text-center text-slate-400">
                      {new Date(dev.last_seen).toLocaleString()}
                    </td>

                    {/* Hành động xóa */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => handleDelete(e, dev.device_id, dev.client_name || dev.hostname)}
                        className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Xóa thiết bị khỏi hệ thống"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-20 text-slate-500 font-medium">
                    Không tìm thấy thiết bị trạm nào thỏa mãn bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/10">
            <span className="text-xs text-slate-400 font-medium">
              Hiển thị <span className="text-slate-200 font-semibold">{data.length}</span> / <span className="text-slate-200 font-semibold">{total}</span> thiết bị
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 bg-slate-900 border border-slate-800 disabled:opacity-40 hover:border-slate-700 disabled:hover:border-slate-800 rounded-lg text-slate-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-300 font-bold px-3">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 bg-slate-900 border border-slate-800 disabled:opacity-40 hover:border-slate-700 disabled:hover:border-slate-800 rounded-lg text-slate-300 transition-all"
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
