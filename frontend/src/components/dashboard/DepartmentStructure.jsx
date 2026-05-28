import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#0e91eb", "#10b981", "#f43f5e", "#fbbf24", "#a855f7", "#ec4899", "#64748b"];

export default function DepartmentStructure({ departments }) {
  if (!departments) return null;

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col lg:col-span-1 animate-fade-in">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Cơ cấu phòng ban</h4>
      <div className="flex-1 min-h-[200px] flex items-center justify-center">
        {departments.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={departments}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {departments.map((entry, index) => (
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
        {departments.map((item, index) => (
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
  );
}
