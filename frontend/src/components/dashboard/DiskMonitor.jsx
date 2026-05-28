import React, { useState, useRef } from "react";
import { HardDrive, Search, Cpu } from "lucide-react";

export default function DiskMonitor({ diskDistribution, onNavigateToDevice }) {
  const [diskSearch, setDiskSearch] = useState("");
  const [hoveredDevId, setHoveredDevId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const outerRef = useRef(null);

  if (!diskDistribution) return null;

  // Group stats by device_id
  const deviceMap = {};
  diskDistribution.forEach((dk) => {
    const devId = dk.device_id;
    if (!deviceMap[devId]) {
      deviceMap[devId] = {
        device_id: dk.device_id,
        client_name: dk.client_name,
        hostname: dk.hostname,
        cpu_usage: dk.cpu_usage || 0,
        ram_usage: dk.ram_usage || 0,
        disks: []
      };
    }
    deviceMap[devId].disks.push(dk);
  });
  const deviceList = Object.values(deviceMap);

  const filteredDevices = deviceList.filter(
    (dev) =>
      dev.client_name.toLowerCase().includes(diskSearch.toLowerCase()) ||
      dev.hostname.toLowerCase().includes(diskSearch.toLowerCase()) ||
      dev.disks.some(
        (dk) =>
          dk.device.toLowerCase().includes(diskSearch.toLowerCase()) ||
          dk.mountpoint.toLowerCase().includes(diskSearch.toLowerCase())
      )
  );

  const handleCardMouseEnter = (e, dev) => {
    if (!outerRef.current) return;
    const cardRect = e.currentTarget.getBoundingClientRect();
    const outerRect = outerRef.current.getBoundingClientRect();
    
    // Width and Height of the tooltip
    const tooltipWidth = 300;
    // Over-estimated height: base 290px + 62px per partition to ensure maximum headroom and zero bottom overflow
    const estimatedHeight = 290 + (dev.disks ? dev.disks.length * 62 : 0);
    
    // 1. Calculate final X (positioned to the left or right of the card, never covering it)
    const outerWidth = outerRect.width;
    const cardLeftInOuter = cardRect.left - outerRect.left;
    const cardCenterX = cardLeftInOuter + cardRect.width / 2;
    const showLeft = cardCenterX > outerWidth / 2;
    
    const finalX = showLeft 
      ? cardLeftInOuter - tooltipWidth - 12 
      : cardLeftInOuter + cardRect.width + 12;
      
    // 2. Calculate ideal vertical coordinate (aligned to the vertical center of the card)
    const cardTopInOuter = cardRect.top - outerRect.top;
    const idealTop = cardTopInOuter + cardRect.height / 2 - estimatedHeight / 2;
    
    // Viewport bounds relative to outerRef coordinate system
    const headerHeight = 64; // visible viewport starts below the 64px header
    const viewportTopY = headerHeight - outerRect.top;
    const viewportBottomY = window.innerHeight - outerRect.top;
    
    // Clamp Y boundaries perfectly using browser viewport boundaries (ensure at least 45px safety margin from bottom edge)
    const minY = Math.max(10, viewportTopY + 10);
    const maxY = viewportBottomY - estimatedHeight - 45;
    
    const finalY = Math.max(minY, Math.min(maxY, idealTop));
    
    setHoveredDevId(dev.device_id);
    setTooltipPos({ x: finalX, y: finalY });
  };

  const handleCardLeave = () => {
    setHoveredDevId(null);
  };

  return (
    <div ref={outerRef} className="glass-panel p-6 rounded-2xl space-y-6 shadow-2xl relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-brand-400" /> Giám sát dung lượng ổ đĩa toàn mạng
          </h4>
          <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase">
            Hệ thống tủ Rack máy chủ - Di chuột vào thiết bị để xem thông số CPU, RAM & Phân vùng chi tiết dưới dạng Tooltip
          </p>
        </div>

        {/* Ô tìm kiếm ổ đĩa */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Lọc theo máy trạm / ổ đĩa..."
            value={diskSearch}
            onChange={(e) => setDiskSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 focus:outline-none focus:border-brand-500 transition-all placeholder-slate-500"
          />
        </div>
      </div>

      {/* FULL-WIDTH HYBRID SERVER-RACK VIEW */}
      <div className="max-h-[425px] overflow-y-auto pr-2 scrollbar-thin py-1">
        {filteredDevices.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {filteredDevices.map((dev, idx) => (
              <div
                key={idx}
                onMouseEnter={(e) => handleCardMouseEnter(e, dev)}
                onMouseLeave={handleCardLeave}
                onClick={() => onNavigateToDevice(dev.device_id)}
                className={`p-3 bg-slate-950/40 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2.5 group relative ${
                  hoveredDevId === dev.device_id
                    ? "border-brand-500 bg-brand-500/5 shadow-[0_0_15px_rgba(14,145,235,0.15)] scale-[1.02]"
                    : "border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-800/10"
                }`}
              >
                {/* Header Name */}
                <div className="truncate text-center border-b border-slate-800/50 pb-1.5">
                  <p className="font-bold text-slate-200 text-[11px] truncate group-hover:text-brand-400 transition-colors">
                    {dev.client_name}
                  </p>
                </div>

                {/* Stacked micro disk bars */}
                <div className="space-y-2 flex-1">
                  {dev.disks.map((dk, dIdx) => {
                    const isHighUsage = dk.usage_percent >= 90.0;
                    const isWarningUsage = dk.usage_percent >= 75.0 && dk.usage_percent < 90.0;

                    return (
                      <div key={dIdx} className="space-y-0.5 text-left">
                        <div className="flex justify-between text-[9px] font-mono leading-none">
                          <span className="text-slate-400 font-bold">{dk.device}</span>
                          <span className={`font-extrabold ${
                            isHighUsage ? "text-rose-400 animate-pulse" : isWarningUsage ? "text-amber-400" : "text-brand-400"
                          }`}>{Math.round(dk.usage_percent)}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-950 border border-slate-900/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isHighUsage
                                ? "bg-rose-500 glow-rose"
                                : isWarningUsage
                                ? "bg-amber-500 glow-amber"
                                : "bg-brand-500 glow-brand"
                            }`}
                            style={{ width: `${dk.usage_percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs font-semibold">
            Không tìm thấy thiết bị nào khớp với từ khóa tìm kiếm.
          </div>
        )}
      </div>

      {/* FLOATING GLASSMORPHIC TOOLTIP (IMMUNE TO OVERFLOW CLIPPING AND OVERLAP SHADOW) */}
      {hoveredDevId && (() => {
        const dev = deviceList.find(d => d.device_id === hoveredDevId);
        if (!dev) return null;

        return (
          <div
            className="absolute pointer-events-none z-[9999] w-[300px] bg-slate-950/95 backdrop-blur-md border border-brand-500/30 text-white rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(14,145,235,0.2)] text-xs transition-all duration-150 animate-scale-up animate-fade-in"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
            }}
          >
            {/* Tooltip Header */}
            <div className="border-b border-slate-800 pb-2 flex justify-between items-start mb-3">
              <div className="truncate pr-2">
                <h5 className="font-extrabold text-white text-xs truncate">{dev.client_name}</h5>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">Tên máy: {dev.hostname}</p>
              </div>
              <span className="px-1.5 py-0.5 bg-brand-500/10 border border-brand-500/25 rounded text-[8px] font-bold text-brand-400 uppercase tracking-wider shrink-0 font-mono">
                Specs
              </span>
            </div>

            {/* CPU & RAM */}
            <div className="space-y-2.5 mb-3">
              {/* CPU */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-slate-500" /> Tải CPU
                  </span>
                  <span className={`font-extrabold ${dev.cpu_usage > 80 ? "text-amber-400 animate-pulse" : "text-slate-200"}`}>
                    {Math.round(dev.cpu_usage)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${dev.cpu_usage > 80 ? "bg-amber-500 glow-amber" : "bg-brand-500 glow-brand"}`}
                    style={{ width: `${Math.min(100, Math.max(0, dev.cpu_usage))}%` }}
                  />
                </div>
              </div>

              {/* RAM */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-slate-500" /> Tải RAM
                  </span>
                  <span className={`font-extrabold ${dev.ram_usage > 85 ? "text-rose-400 animate-pulse" : "text-slate-200"}`}>
                    {Math.round(dev.ram_usage)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${dev.ram_usage > 85 ? "bg-rose-500 glow-rose" : "bg-emerald-500 glow-emerald"}`}
                    style={{ width: `${Math.min(100, Math.max(0, dev.ram_usage))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Disk Partitions Detailed */}
            <div className="space-y-2 border-t border-slate-800/60 pt-2.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Thông số phân vùng đĩa</p>
              <div className="space-y-2">
                {dev.disks.map((dk, dIdx) => {
                  const isHighUsage = dk.usage_percent >= 90.0;
                  const isWarningUsage = dk.usage_percent >= 75.0 && dk.usage_percent < 90.0;

                  return (
                    <div key={dIdx} className="space-y-0.5 bg-slate-950/20 p-1.5 border border-slate-900 rounded-lg">
                      <div className="flex justify-between text-[10px] leading-none">
                        <span className="text-slate-200 font-bold font-mono">
                          Ổ {dk.device} ({dk.mountpoint})
                        </span>
                        <span className={`font-extrabold ${
                          isHighUsage ? "text-rose-400 animate-pulse" : isWarningUsage ? "text-amber-400" : "text-brand-400"
                        }`}>{dk.usage_percent}%</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                        <span>Đã dùng: {dk.used_gb} GB</span>
                        <span>Tổng: {dk.total_gb} GB</span>
                      </div>
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            isHighUsage ? "bg-rose-500 glow-rose" : isWarningUsage ? "bg-amber-500 glow-amber" : "bg-brand-500 glow-brand"
                          }`}
                          style={{ width: `${dk.usage_percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[9px] text-slate-500 text-center italic mt-2 leading-none border-t border-slate-900 pt-2">
              Nhấp chuột để mở chi tiết đầy đủ
            </p>
          </div>
        );
      })()}
    </div>
  );
}
