import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Search, Monitor, Building, ChevronLeft, ChevronRight, BarChart3, ListFilter } from "lucide-react";

export default function SoftwareSearch({ onNavigateToDevice }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Top software state
  const [topSoftware, setTopSoftware] = useState([]);
  const [topLoading, setTopLoading] = useState(true);
  
  const limit = 20;

  const loadTopSoftware = async () => {
    try {
      setTopLoading(true);
      const res = await api.getTopSoftware();
      setTopSoftware(res);
    } catch (err) {
      console.error("Lỗi tải top phần mềm:", err);
    } finally {
      setTopLoading(false);
    }
  };

  const handleSearch = async (forceQuery = null) => {
    const searchVal = forceQuery !== null ? forceQuery : query;
    if (!searchVal.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.searchGlobalSoftware(searchVal, page, limit);
      setResults(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error("Lỗi tìm kiếm phần mềm toàn mạng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopSoftware();
  }, []);

  // Thiết lập làm mới thời gian thực (Real-time Search) với cơ chế Debounce (trì hoãn 300ms)
  // giúp tăng tốc độ gõ phím cực mượt và tránh spam flood request làm nghẽn server
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, page]);

  // Đưa trang về 1 khi từ khóa thay đổi để bắt đầu tìm kiếm từ trang đầu tiên
  useEffect(() => {
    setPage(1);
  }, [query]);

  const triggerSearch = () => {
    setPage(1);
    handleSearch();
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Tra cứu phần mềm</h2>
        <p className="text-slate-400 text-sm mt-1">
          Tìm kiếm diện rộng xem các phần mềm cụ thể đã được cài đặt trên những máy trạm nào.
        </p>
      </div>

      {/* SEARCH INTERFACE PANEL */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Tìm kiếm phần mềm toàn mạng
        </h4>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Nhập tên phần mềm muốn quét (ví dụ: Google Chrome, UltraViewer, Skype...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") triggerSearch(); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>
          <button
            onClick={triggerSearch}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/10 transition-all shrink-0"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* GRID CONTENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results list (2/3 width) */}
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-brand-400" /> Kết quả truy vấn ({total} máy trạm)
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Tên Client hiển thị</th>
                    <th className="px-6 py-3.5">Phần mềm phát hiện</th>
                    <th className="px-6 py-3.5">Người sử dụng</th>
                    <th className="px-6 py-3.5">Bộ phận</th>
                    <th className="px-6 py-3.5">Phiên bản đã cài</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-16">
                        <div className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      </td>
                    </tr>
                  ) : results.length > 0 ? (
                    results.map((r, idx) => (
                      <tr
                        key={idx}
                        onClick={() => onNavigateToDevice(r.device_id)}
                        className="hover:bg-slate-900/20 cursor-pointer transition-all duration-100 text-slate-300"
                      >
                        {/* Tên máy */}
                        <td className="px-6 py-3.5 font-bold text-slate-200 flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>{r.client_name || r.hostname}</span>
                          {r.is_online ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                          ) : null}
                        </td>
                        
                        {/* Phần mềm phát hiện */}
                        <td className="px-6 py-3.5 text-brand-400 font-bold max-w-[180px] truncate" title={r.software_name}>
                          {r.software_name}
                        </td>
                        
                        {/* Người dùng */}
                        <td className="px-6 py-3.5 text-slate-300 font-semibold">{r.owner || "Unknown"}</td>
                        
                        {/* Bộ phận */}
                        <td className="px-6 py-3.5 text-slate-400 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-600" />
                          <span>{r.department || "IT"}</span>
                        </td>
                        
                        {/* Phiên bản */}
                        <td className="px-6 py-3.5 font-mono text-slate-400 font-bold">{r.version || "Unknown"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-20 text-slate-500 font-semibold">
                        {query.trim()
                          ? "Không tìm thấy máy trạm nào đã cài đặt phần mềm này."
                          : "Nhập từ khóa và bấm Tìm kiếm để bắt đầu tra cứu."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phân trang kết quả */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-900/10 p-4">
              <span className="text-xs text-slate-400 font-semibold">
                Trang {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:hover:border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-1.5 bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:hover:border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top installed software ranking (1/3 width) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between shadow-2xl">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-6">
              <BarChart3 className="w-4.5 h-4.5 text-brand-400" /> Bảng xếp hạng phần mềm
            </h4>

            {topLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : topSoftware.length > 0 ? (
              <div className="space-y-4">
                {topSoftware.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs hover:border-slate-700/60 transition-colors">
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-200 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.publisher}</p>
                    </div>
                    <span className="shrink-0 font-black text-brand-400 bg-brand-500/5 border border-brand-500/10 px-2.5 py-1 rounded-lg">
                      {item.count} máy
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs font-semibold">
                Chưa có dữ liệu phần mềm cài đặt.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
