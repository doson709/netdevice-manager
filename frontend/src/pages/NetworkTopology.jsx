import React, { useEffect, useState, useRef } from "react";
import { api } from "../utils/api";
import { Network, Server, Folder, Monitor, Cpu, Info, Loader2, ArrowRight, Layers, HelpCircle, RotateCcw, Move } from "lucide-react";

export default function NetworkTopology({ onNavigateToDevice, isAdmin }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("location"); // "location" (Vị trí) hoặc "department" (Phòng ban)
  const [serverStats, setServerStats] = useState(null);
  
  // Quản lý vị trí kéo thả các nút
  const [nodePositions, setNodePositions] = useState({});
  
  // Lưu trữ ID nút đang được kéo thả
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  
  // Trạng thái hover hiển thị tooltip chi tiết
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Quản lý các vật dụng văn phòng tự đặt
  const [customElements, setCustomElements] = useState([]);

  // Biến cờ đánh dấu đã tải thành công sơ đồ từ Server
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);

  const [selectedElementId, setSelectedElementId] = useState(null);
  const [draggedHandle, setDraggedHandle] = useState(null); // { id: string, type: "start" | "end" }

  // Tự động đồng bộ sơ đồ lên server sau 1 giây kể từ khi người dùng dừng di chuyển/chỉnh sửa
  useEffect(() => {
    if (!hasLoadedFromServer || !isAdmin) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        await api.saveTopology({
          node_positions: nodePositions,
          custom_elements: customElements
        });
        console.log("Đã tự động đồng bộ sơ đồ mạng lên Server!");
      } catch (err) {
        console.error("Lỗi tự động lưu sơ đồ mạng lên Server:", err);
      }
    }, 1000); // 1 giây debounce

    return () => clearTimeout(delayDebounceFn);
  }, [nodePositions, customElements, hasLoadedFromServer, isAdmin]);

  const handleAddElement = (type) => {
    const newId = `custom-${type}-${Date.now()}`;
    const newItem = {
      id: newId,
      type,
      x: 100, // Vị trí mặc định
      y: 100,
      rotation: 0,
      size: 2 // Chiều dài mặc định: 2 ô lưới (50px)
    };
    setCustomElements((prev) => {
      const updated = [...prev, newItem];
      localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
      return updated;
    });
    setSelectedElementId(newId);
  };

  const handleRotateElement = (id) => {
    setCustomElements((prev) => {
      const updated = prev.map((el) => {
        if (el.id === id) {
          return { ...el, rotation: (el.rotation + 90) % 360 };
        }
        return el;
      });
      localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteElement = (id) => {
    setCustomElements((prev) => {
      const updated = prev.filter((el) => el.id !== id);
      localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
      return updated;
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleAdjustElementSize = (id, amount) => {
    setCustomElements((prev) => {
      const updated = prev.map((el) => {
        if (el.id === id) {
          const currentSize = el.size || 2;
          const nextSize = Math.max(1, currentSize + amount); // Tối thiểu 1 ô lưới (25px)
          return { ...el, size: nextSize };
        }
        return el;
      });
      localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
      return updated;
    });
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      
      // 1. Tải sơ đồ từ Server
      let serverPositions = {};
      let serverElements = [];
      let loadSuccess = false;

      try {
        const topoRes = await api.getTopology();
        if (topoRes) {
          serverPositions = topoRes.node_positions || {};
          serverElements = topoRes.custom_elements || [];
          loadSuccess = true;
        }
      } catch (errTopo) {
        console.error("Lỗi tải sơ đồ mạng từ Server:", errTopo);
      }

      // 2. Một lần đồng bộ ngược từ localStorage nếu Server trống rỗng
      const hasServerData = Object.keys(serverPositions).length > 0 || (serverElements && serverElements.length > 0);
      
      if (loadSuccess && !hasServerData) {
        try {
          const savedPos = localStorage.getItem("netdevice_topology_positions");
          const savedElements = localStorage.getItem("netdevice_topology_custom_elements");
          
          const localPos = savedPos ? JSON.parse(savedPos) : {};
          const localElements = savedElements ? JSON.parse(savedElements) : [];
          
          if (Object.keys(localPos).length > 0 || localElements.length > 0) {
            console.log("Đã tìm thấy sơ đồ cũ ở localStorage. Đang đồng bộ tự động lên Server...");
            setNodePositions(localPos);
            setCustomElements(localElements);
          } else {
            setNodePositions({});
            setCustomElements([]);
          }
        } catch (e) {
          console.error("Lỗi đọc/di cư dữ liệu từ localStorage", e);
          setNodePositions({});
          setCustomElements([]);
        }
      } else {
        setNodePositions(serverPositions);
        setCustomElements(serverElements || []);
      }

      // Đánh dấu đã tải thành công để kích hoạt autosave
      setHasLoadedFromServer(true);

      // 3. Tải danh sách thiết bị
      const res = await api.getDevices({ limit: 200 });
      setDevices(res.data || []);
      
      try {
        const sRes = await api.getServerStats();
        setServerStats(sRes);
      } catch (errServer) {
        console.error("Lỗi tải thông số server:", errServer);
      }

      setError("");
    } catch (err) {
      console.error("Lỗi tải bản đồ mạng:", err);
      setError("Không thể tải cấu trúc bản đồ mạng nội bộ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    
    // Tự động làm mới ngầm mỗi 10 giây để cập nhật trạng thái online/tài nguyên
    const timer = setInterval(() => {
      const reloadSilent = async () => {
        try {
          const res = await api.getDevices({ limit: 200 });
          setDevices(res.data || []);
          
          const sRes = await api.getServerStats();
          setServerStats(sRes);
        } catch (e) {
          console.error("Lỗi reload ngầm bản đồ mạng", e);
        }
      };
      reloadSilent();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Lắng nghe sự kiện bàn phím để di chuyển vật thể/thiết bị bằng phím mũi tên
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isAdmin) return; // Chặn phím tắt di chuyển với tài khoản khách
      if (groupBy !== "location" || !selectedElementId) return;

      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(e.key)) return;

      // Ngăn chặn cuộn trang khi di chuyển vật thể
      e.preventDefault();

      const shiftAmount = 25; // Dịch chuyển đúng 1 ô lưới (25px)
      let dx = 0;
      let dy = 0;

      if (e.key === "ArrowUp") dy = -shiftAmount;
      if (e.key === "ArrowDown") dy = shiftAmount;
      if (e.key === "ArrowLeft") dx = -shiftAmount;
      if (e.key === "ArrowRight") dx = shiftAmount;

      if (selectedElementId.startsWith("custom-")) {
        // Dịch chuyển vật thể văn phòng tự đặt
        setCustomElements((prev) => {
          const updated = prev.map((el) => {
            if (el.id === selectedElementId) {
              const newX = el.x + dx;
              const newY = el.y + dy;
              
              const isWall = el.type === "wall-h" || el.type === "wall-v";
              const wallLength = isWall ? (el.size || 2) * 25 : 50;
              
              // Khống chế trong biên canvas vẽ lưới kỹ thuật
              const limitX = Math.max(25, Math.min(775, newX));
              const limitY = Math.max(25, Math.min(525, newY));

              return {
                ...el,
                x: limitX,
                y: limitY
              };
            }
            return el;
          });
          localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
          return updated;
        });
      } else {
        // Dịch chuyển thiết bị máy trạm hoặc Server chính
        setNodePositions((prev) => {
          const currentPos = prev[selectedElementId] || { x: 400, y: 275 };
          const newX = currentPos.x + dx;
          const newY = currentPos.y + dy;

          const limitX = Math.max(50, Math.min(750, newX));
          const limitY = Math.max(50, Math.min(500, newY));

          const updated = {
            ...prev,
            [selectedElementId]: { x: limitX, y: limitY }
          };
          localStorage.setItem("netdevice_topology_positions", JSON.stringify(updated));
          return updated;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, groupBy]);

  const handleMouseDown = (e, nodeId) => {
    if (!isAdmin) return; // Không cho phép tài khoản khách kéo thả các nút/vật thể
    if (groupBy !== "location") return; // KHÔNG kéo thả ở chế độ phòng ban
    if (e.button !== 0) return; // Chỉ kéo thả bằng chuột trái
    e.preventDefault();
    setDraggedNodeId(nodeId);
    isDraggingRef.current = false; // Reset trạng thái kéo trước khi di chuyển
    setHoveredNode(null); // Ẩn tooltip ngay lập tức khi bắt đầu kéo thả

    // Tính toán khoảng cách lệch (drag offset) từ con trỏ chuột đến tâm vật dụng
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const mouseX = ((e.clientX - rect.left) / rect.width) * 800;
        const mouseY = ((e.clientY - rect.top) / rect.height) * 550;
        
        let originalX = 400;
        let originalY = 275;

        if (nodeId.startsWith("custom-")) {
          const el = customElements.find(item => item.id === nodeId);
          if (el) {
            originalX = el.x;
            originalY = el.y;
          }
        } else {
          const pos = nodePositions[nodeId] || { x: 400, y: 275 };
          originalX = pos.x;
          originalY = pos.y;
        }

        dragOffsetRef.current = {
          x: mouseX - originalX,
          y: mouseY - originalY
        };
      }
    }
  };

  const handleMouseMove = (e) => {
    if (groupBy !== "location" || (!draggedNodeId && !draggedHandle) || !canvasRef.current) return;

    try {
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Tính toán tọa độ chuột so với khung canvas wrapper ổn định (800x550)
      const rawX = ((e.clientX - rect.left) / rect.width) * 800;
      const rawY = ((e.clientY - rect.top) / rect.height) * 550;

      // Căn lề dựa theo lưới ô vuông (grid mesh 25px)
      const gridCellSize = 25;
      
      isDraggingRef.current = true; // Xác nhận đã di chuyển (kéo thả / thay đổi kích thước)

      if (draggedHandle) {
        const snappedX = Math.round(rawX / gridCellSize) * gridCellSize;
        const snappedY = Math.round(rawY / gridCellSize) * gridCellSize;

        // Xử lý thay đổi kích thước tường thông qua kéo thả 2 đầu
        setCustomElements((prev) => {
          const updated = prev.map((el) => {
            if (el.id === draggedHandle.id) {
              const isWallH = el.type === "wall-h";
              const isWallV = el.type === "wall-v";
              const isEffectiveH = (el.type === "wall-h" && (el.rotation === 0 || el.rotation === 180)) ||
                                   (el.type === "wall-v" && (el.rotation === 90 || el.rotation === 270));
              
              const oldLength = (el.size || 2) * 25;
              const theta = (el.rotation * Math.PI) / 180;
              const dx = snappedX - el.x;
              const dy = snappedY - el.y;

              // Chiếu tọa độ chuột từ hệ tọa độ màn hình sang hệ tọa độ cục bộ của bức tường
              const localX = dx * Math.cos(-theta) - dy * Math.sin(-theta);
              const localY = dx * Math.sin(-theta) + dy * Math.cos(-theta);

              let newSize = el.size || 2;
              let shiftX = 0;
              let shiftY = 0;

              if (isWallH) {
                if (draggedHandle.type === "end") {
                  const newLength = localX + oldLength / 2;
                  newSize = Math.max(1, Math.round(newLength / 25));
                  shiftX = -oldLength / 2 + (newSize * 25) / 2;
                } else {
                  // "start"
                  const newLength = oldLength / 2 - localX;
                  newSize = Math.max(1, Math.round(newLength / 25));
                  shiftX = oldLength / 2 - (newSize * 25) / 2;
                }
              } else if (isWallV) {
                if (draggedHandle.type === "end") {
                  const newLength = localY + oldLength / 2;
                  newSize = Math.max(1, Math.round(newLength / 25));
                  shiftY = -oldLength / 2 + (newSize * 25) / 2;
                } else {
                  // "start"
                  const newLength = oldLength / 2 - localY;
                  newSize = Math.max(1, Math.round(newLength / 25));
                  shiftY = oldLength / 2 - (newSize * 25) / 2;
                }
              }

              // Đổi độ lệch tâm từ hệ tọa độ cục bộ quay lại hệ tọa độ màn hình
              let newX = el.x + (shiftX * Math.cos(theta) - shiftY * Math.sin(theta));
              let newY = el.y + (shiftX * Math.sin(theta) + shiftY * Math.cos(theta));

              // Snapping thông minh theo chẵn/lẻ của kích thước tường để các đầu luôn trùng giao điểm lưới
              if (isEffectiveH) {
                if (newSize % 2 !== 0) {
                  newX = Math.round((newX - 12.5) / 25) * 25 + 12.5;
                } else {
                  newX = Math.round(newX / 25) * 25;
                }
                newY = Math.round(newY / 25) * 25;
              } else {
                // Effectively vertical
                if (newSize % 2 !== 0) {
                  newY = Math.round((newY - 12.5) / 25) * 25 + 12.5;
                } else {
                  newY = Math.round(newY / 25) * 25;
                }
                newX = Math.round(newX / 25) * 25;
              }

              // Giới hạn trong khung bản vẽ kỹ thuật
              const constrainedX = Math.max(25, Math.min(775, newX));
              const constrainedY = Math.max(25, Math.min(525, newY));

              return {
                ...el,
                size: newSize,
                x: constrainedX,
                y: constrainedY
              };
            }
            return el;
          });
          localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
          return updated;
        });
        return;
      }

      // Kéo thả toàn bộ phần tử (sử dụng dragOffset để tránh ghim tâm chuột giật nhảy)
      const targetX = rawX - dragOffsetRef.current.x;
      const targetY = rawY - dragOffsetRef.current.y;
      
      const snappedX = Math.round(targetX / gridCellSize) * gridCellSize;
      const snappedY = Math.round(targetY / gridCellSize) * gridCellSize;

      if (draggedNodeId.startsWith("custom-")) {
        setCustomElements((prev) => {
          const updated = prev.map((item) => {
            if (item.id === draggedNodeId) {
              const isEffectiveH = (item.type === "wall-h" && (item.rotation === 0 || item.rotation === 180)) ||
                                   (item.type === "wall-v" && (item.rotation === 90 || item.rotation === 270));
              const size = item.size || 2;
              const isOdd = size % 2 !== 0;

              let finalX = snappedX;
              let finalY = snappedY;

              if (isEffectiveH) {
                if (isOdd) {
                  finalX = Math.round((targetX - 12.5) / 25) * 25 + 12.5;
                } else {
                  finalX = snappedX;
                }
                finalY = snappedY;
              } else if (item.type === "wall-v" || item.type === "wall-h") {
                // Effectively vertical
                if (isOdd) {
                  finalY = Math.round((targetY - 12.5) / 25) * 25 + 12.5;
                } else {
                  finalY = snappedY;
                }
                finalX = snappedX;
              }

              const constrainedX = Math.max(50, Math.min(750, finalX));
              const constrainedY = Math.max(50, Math.min(500, finalY));

              return { ...item, x: constrainedX, y: constrainedY };
            }
            return item;
          });
          localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
          return updated;
        });
      } else {
        const constrainedX = Math.max(50, Math.min(750, snappedX));
        const constrainedY = Math.max(50, Math.min(500, snappedY));
        setNodePositions((prev) => {
          const updated = {
            ...prev,
            [draggedNodeId]: { x: constrainedX, y: constrainedY }
          };
          localStorage.setItem("netdevice_topology_positions", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error("Lỗi đồng bộ tọa độ kéo thả:", err);
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId) {
      setSelectedElementId(draggedNodeId);
    }
    setDraggedNodeId(null);
    setDraggedHandle(null);
    // Trì hoãn việc reset để sự kiện click có thể đọc chính xác trạng thái vừa kéo xong
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  // Đặt lại sơ đồ vẽ đồng tâm gốc
  const handleResetLayout = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả vị trí và dọn sạch các vật dụng văn phòng tự sắp xếp?")) {
      setNodePositions({});
      setCustomElements([]);
      setSelectedElementId(null);
      try {
        localStorage.removeItem("netdevice_topology_positions");
        localStorage.removeItem("netdevice_topology_custom_elements");
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <p className="text-slate-400 text-sm font-semibold animate-pulse">
          Đang dựng mô hình không gian làm việc lưới mạng...
        </p>
      </div>
    );
  }

  if (error && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl mb-4">
          <Info className="w-8 h-8" />
        </div>
        <p className="text-slate-300 font-bold">{error}</p>
        <button onClick={loadDevices} className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold rounded-xl transition-all">
          Thử lại
        </button>
      </div>
    );
  }

  // =====================================================================
  //               TÍNH TOÁN HÌNH HỌC VÀ DỰNG LAYOUT CHO GRAPH SVG
  // =====================================================================
  
  const width = 800;
  const height = 550;
  const cx = width / 2;
  const cy = height / 2;

  // Sắp xếp danh sách thiết bị ổn định theo device_id để tránh nhảy vị trí ngẫu nhiên khi cập nhật
  const sortedDevices = [...devices].sort((a, b) => a.device_id.localeCompare(b.device_id));

  // Kiểm tra ô lưới có bị chặn bởi vật cản văn phòng không
  const isCellBlocked = (col, row) => {
    const px = col * 25;
    const py = row * 25;
    
    for (const el of customElements) {
      if (!["wall-h", "wall-v", "desk", "kitchen", "shelf", "chair"].includes(el.type)) {
        continue;
      }
      
      const rad = -(el.rotation * Math.PI) / 180;
      const dx = px - el.x;
      const dy = py - el.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      
      if (el.type === "wall-h") {
        const L = (el.size || 2) * 25;
        // Chiều dài thực L/2, cộng 25px đệm mỗi đầu. Độ dày thực 6px (từ -3 đến +3), cộng 25px đệm mỗi bên.
        if (Math.abs(lx) <= L / 2 + 25 && Math.abs(ly) <= 28) return true;
      } else if (el.type === "wall-v") {
        const L = (el.size || 2) * 25;
        if (Math.abs(lx) <= 28 && Math.abs(ly) <= L / 2 + 25) return true;
      } else if (["desk", "kitchen", "shelf"].includes(el.type)) {
        // Kích thước thực 50x30 (nửa kích thước 25x15), cộng 25px đệm xung quanh.
        if (Math.abs(lx) <= 49 && Math.abs(ly) <= 39) return true;
      } else if (el.type === "chair") {
        // Kích thước thực 20x20 (nửa kích thước 10x10), cộng 25px đệm xung quanh.
        if (Math.abs(lx) <= 34 && Math.abs(ly) <= 34) return true;
      }
    }
    return false;
  };

  // Thuật toán BFS tìm đường đi gấp khúc tối ưu và tự động tránh vật cản trên lưới 25px
  const findOrthogonalPath = (x1, y1, x2, y2) => {
    const startCol = Math.round(x1 / 25);
    const startRow = Math.round(y1 / 25);
    const endCol = Math.round(x2 / 25);
    const endRow = Math.round(y2 / 25);
    
    if (startCol === endCol && startRow === endRow) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    
    const queue = [[startCol, startRow]];
    const parent = {};
    const visited = new Set();
    visited.add(`${startCol},${startRow}`);
    
    let found = false;
    
    while (queue.length > 0) {
      const [c, r] = queue.shift();
      
      if (c === endCol && r === endRow) {
        found = true;
        break;
      }
      
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
      ];
      
      for (const [dc, dr] of dirs) {
        const nc = c + dc;
        const nr = r + dr;
        
        if (nc >= 0 && nc <= 32 && nr >= 0 && nr <= 22) {
          const key = `${nc},${nr}`;
          if (!visited.has(key)) {
            const isTarget = nc === endCol && nr === endRow;
            const isSource = nc === startCol && nr === startRow;
            
            if (isTarget || isSource || !isCellBlocked(nc, nr)) {
              visited.add(key);
              parent[key] = [c, r];
              queue.push([nc, nr]);
            }
          }
        }
      }
    }
    
    if (found) {
      const points = [];
      let curr = [endCol, endRow];
      while (curr) {
        points.push(curr);
        const key = `${curr[0]},${curr[1]}`;
        curr = parent[key];
      }
      points.reverse();
      
      // Tối ưu hóa gộp các điểm cùng hàng/cột thẳng hàng
      const optPoints = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (i > 0 && i < points.length - 1) {
          const prev = points[i - 1];
          const next = points[i + 1];
          const sameCol = prev[0] === p[0] && next[0] === p[0];
          const sameRow = prev[1] === p[1] && next[1] === p[1];
          if (sameCol || sameRow) {
            continue;
          }
        }
        optPoints.push(p);
      }
      
      let d = `M ${x1} ${y1}`;
      for (let i = 1; i < optPoints.length - 1; i++) {
        d += ` L ${optPoints[i][0] * 25} ${optPoints[i][1] * 25}`;
      }
      d += ` L ${x2} ${y2}`;
      return d;
    }
    
    // Fallback: Gấp khúc đơn giản dạng L
    return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
  };

  // 1. Phân nhóm thiết bị theo bộ phận hoặc vị trí
  const groups = {};
  sortedDevices.forEach((dev) => {
    let key = groupBy === "department" ? dev.department : dev.location;
    key = key ? key.trim() : "";
    if (!key) {
      key = groupBy === "department" ? "Chưa rõ phòng" : "Chưa rõ vị trí";
    }
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(dev);
  });

  const groupKeys = Object.keys(groups);
  const totalGroups = groupKeys.length || 1;

  // Khai báo tập hợp cấu trúc dữ liệu đồ thị mạng
  const connections = [];
  const renderedNodes = [];

  // A. Nút Máy chủ chính (Server Core) - Chỉ cho phép kéo thả ở chế độ Phân theo Vị trí
  const serverId = "server-core";
  const serverX = (groupBy === "location" && nodePositions[serverId]?.x) ? nodePositions[serverId].x : cx;
  const serverY = (groupBy === "location" && nodePositions[serverId]?.y) ? nodePositions[serverId].y : cy;
  
  const serverNode = {
    id: serverId,
    name: "NetDevice Server",
    type: "server",
    x: serverX,
    y: serverY
  };
  renderedNodes.push(serverNode);

  // B. Dựng các nút Nhóm (Hubs) và nút Máy khách (Devices)
  const rHub = 125; // Bán kính vòng trong mặc định cho các Hub
  const rDev = 230; // Bán kính vòng ngoài mặc định cho các máy con

  if (groupBy === "location") {
    // Chế độ Vị trí: KHÔNG hiện các Folder vị trí (Hubs), chỉ hiện Server và các PC máy trạm nối trực tiếp
    const totalDevices = sortedDevices.length;
    sortedDevices.forEach((dev, idx) => {
      // Phân bổ đều các PC thành một vòng tròn lớn quanh Server nếu chưa được kéo thả
      const angle = (idx * 2 * Math.PI) / (totalDevices || 1) - Math.PI / 2;
      const defaultDx = cx + rDev * Math.cos(angle);
      const defaultDy = cy + rDev * Math.sin(angle);

      const devId = dev.device_id;
      const dx = nodePositions[devId]?.x ? nodePositions[devId].x : defaultDx;
      const dy = nodePositions[devId]?.y ? nodePositions[devId].y : defaultDy;

      const deviceNode = {
        ...dev,
        id: devId,
        type: "device",
        x: dx,
        y: dy
      };
      renderedNodes.push(deviceNode);

      // Tính toán đường đi gấp khúc và tự tránh vật cản văn phòng
      const pathD = findOrthogonalPath(serverX, serverY, dx, dy);

      // Kéo dây nối trực tiếp từ Server chính tới PC máy trạm con
      connections.push({
        id: `conn-server-to-${devId}`,
        x1: serverX,
        y1: serverY,
        x2: dx,
        y2: dy,
        d: pathD,
        type: dev.is_online ? "active-link" : "inactive-link",
        cpu_usage: dev.cpu_usage
      });
    });
  } else {
    // Chế độ Bộ phận: Giữ nguyên cấu trúc phân nhánh đồng tâm Server -> Hub phòng ban -> PC
    groupKeys.forEach((groupName, gIdx) => {
      const angle = (gIdx * 2 * Math.PI) / totalGroups - Math.PI / 2;
      
      const defaultHx = cx + rHub * Math.cos(angle);
      const defaultHy = cy + rHub * Math.sin(angle);
      
      const hubId = `hub-${groupName}`;
      const hx = defaultHx;
      const hy = defaultHy;

      const hubNode = {
        id: hubId,
        name: groupName,
        type: "hub",
        deviceCount: groups[groupName].length,
        x: hx,
        y: hy
      };
      renderedNodes.push(hubNode);

      // Kéo dây nối: Server Core -> Hub
      connections.push({
        id: `conn-server-to-${hubId}`,
        x1: serverX,
        y1: serverY,
        x2: hx,
        y2: hy,
        type: "core-link"
      });

      const devList = groups[groupName];
      const nDevs = devList.length;

      devList.forEach((dev, dIdx) => {
        const arcWidth = totalGroups === 1 ? Math.PI * 1.85 : (2 * Math.PI) / (totalGroups * 1.35);
        let devAngle = angle;
        if (nDevs > 1) {
          devAngle = angle - arcWidth / 2 + (dIdx * arcWidth) / (nDevs - 1);
        }

        const defaultDx = cx + rDev * Math.cos(devAngle);
        const defaultDy = cy + rDev * Math.sin(devAngle);

        const devId = dev.device_id;
        const dx = defaultDx;
        const dy = defaultDy;

        const deviceNode = {
          ...dev,
          id: devId,
          type: "device",
          x: dx,
          y: dy,
          hubId
        };
        renderedNodes.push(deviceNode);

        // Kéo dây nối: Hub -> Device con tương ứng
        connections.push({
          id: `conn-${hubId}-to-${devId}`,
          x1: hx,
          y1: hy,
          x2: dx,
          y2: dy,
          type: dev.is_online ? "active-link" : "inactive-link",
          cpu_usage: dev.cpu_usage
        });
      });
    });
  }

  // Xử lý sự kiện di chuột hiện tooltip chi tiết ngay cạnh thiết bị (khi KHÔNG trong trạng thái kéo thả)
  const handleNodeHover = (e, node) => {
    if (draggedNodeId || (node.type !== "device" && node.type !== "server") || !canvasRef.current) return;
    
    try {
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Chuyển đổi tọa độ SVG gốc (node.x, node.y) sang pixel màn hình thực tế tương ứng tỉ lệ canvas 800x550
        const nodeScreenX = (node.x / 800) * rect.width;
        const nodeScreenY = (node.y / 550) * rect.height;
        
        setTooltipPos({
          x: nodeScreenX,
          y: nodeScreenY
        });
        setHoveredNode(node);
      }
    } catch (err) {
      console.error("Lỗi cập nhật tọa độ tooltip", err);
    }
  };

  // Số liệu thống kê ở Sidebar
  const stats = {
    total: sortedDevices.length,
    online: sortedDevices.filter(d => d.is_online).length,
    offline: sortedDevices.filter(d => !d.is_online).length,
    highLoad: sortedDevices.filter(d => d.is_online && (d.cpu_usage > 80 || d.ram_usage > 85)).length
  };

  const selectedElement = customElements.find((item) => item.id === selectedElementId);

  return (
    <div className="space-y-8 animate-fade-in" ref={containerRef}>
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Network className="w-8 h-8 text-brand-500 glow-brand" /> Sơ đồ Mạng Kéo thả Tương tác
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Không gian phẳng phẳng lưới kỹ thuật số cho phép bạn tự do sắp xếp, kéo thả và cấu hình vị trí thực tế của thiết bị.
          </p>
        </div>
        
        {/* Bộ lọc Phân nhóm */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
          <button
            onClick={() => setGroupBy("department")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              groupBy === "department"
                ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Phân theo Bộ phận
          </button>
          <button
            onClick={() => setGroupBy("location")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              groupBy === "location"
                ? "bg-brand-600 text-white shadow-lg shadow-brand-600/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Phân theo Vị trí
          </button>
        </div>
      </div>

      {/* GRAPH PANEL GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Sidebar statistics & Settings (1/4 width) on the left */}
        <div className="space-y-6 xl:col-span-1">
          {/* 1. THƯ VIỆN VẬT DỤNG VĂN PHÒNG */}
          {isAdmin && groupBy === "location" && (
            <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl border border-brand-500/10 bg-slate-900/10">
              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Thư viện Vật dụng
              </h4>
              <p className="text-[10px] text-slate-500">
                Nhấp chuột để thêm vật dụng phụ, kéo thả sắp xếp để mô phỏng văn phòng thật:
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddElement("wall-h")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="w-6 h-1.5 bg-cyan-500/50 rounded group-hover:bg-cyan-400 transition-colors" />
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Tường Ngang</span>
                </button>
                <button
                  onClick={() => handleAddElement("wall-v")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="w-1.5 h-6 bg-cyan-500/50 rounded group-hover:bg-cyan-400 transition-colors" />
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Tường Dọc</span>
                </button>
                <button
                  onClick={() => handleAddElement("desk")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="w-6 h-4 bg-amber-600/20 border border-amber-500/65 rounded group-hover:border-amber-400 transition-colors" />
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Bàn Làm Việc</span>
                </button>
                <button
                  onClick={() => handleAddElement("chair")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 group-hover:border-slate-550 transition-colors" />
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Ghế Xoay</span>
                </button>
                <button
                  onClick={() => handleAddElement("door-single")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="text-rose-500/80 group-hover:text-rose-450 font-extrabold text-[13px] leading-none">🚪</span>
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Cửa Đơn</span>
                </button>
                <button
                  onClick={() => handleAddElement("door-double")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="text-rose-500/80 group-hover:text-rose-450 font-extrabold text-[13px] leading-none">🚪🚪</span>
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Cửa Đôi</span>
                </button>
                <button
                  onClick={() => handleAddElement("plant")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="text-emerald-500/80 group-hover:text-emerald-455 font-extrabold text-[13px] leading-none">🪴</span>
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Cây Cảnh</span>
                </button>
                <button
                  onClick={() => handleAddElement("toilet")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="text-sky-500/80 group-hover:text-sky-455 font-extrabold text-[13px] leading-none">🚽</span>
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Bồn Cầu</span>
                </button>
                <button
                  onClick={() => handleAddElement("kitchen")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="text-orange-500/80 group-hover:text-orange-455 font-extrabold text-[13px] leading-none">🍳</span>
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Bếp</span>
                </button>
                <button
                  onClick={() => handleAddElement("shelf")}
                  className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 group transition-all"
                >
                  <span className="text-slate-400 group-hover:text-slate-300 font-extrabold text-[13px] leading-none">🧱</span>
                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white">Kệ Đồ</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. HIỆU CHỈNH VẬT DỤNG ĐÃ CHỌN */}
          {isAdmin && groupBy === "location" && selectedElement && (
            <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl border border-cyan-500/20 bg-cyan-950/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Hiệu chỉnh {
                    selectedElement.type === "wall-h" ? "Tường Ngang" :
                    selectedElement.type === "wall-v" ? "Tường Dọc" :
                    selectedElement.type === "desk" ? "Bàn Làm Việc" :
                    selectedElement.type === "chair" ? "Ghế Xoay" :
                    (selectedElement.type === "door" || selectedElement.type === "door-single") ? "Cửa Đơn" :
                    selectedElement.type === "door-double" ? "Cửa Đôi" :
                    selectedElement.type === "plant" ? "Cây Cảnh" :
                    selectedElement.type === "toilet" ? "Bồn Cầu" :
                    selectedElement.type === "kitchen" ? "Bếp" :
                    selectedElement.type === "shelf" ? "Kệ Đồ" : "Vật dụng"
                  }
                </h4>
                <button
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="text-[10px] text-rose-455 hover:text-rose-400 font-bold uppercase hover:underline transition-all"
                >
                  Xóa bỏ
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Rotation Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Góc Xoay Bố Trí</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => {
                          setCustomElements((prev) => {
                            const updated = prev.map((item) => {
                              if (item.id === selectedElement.id) {
                                return { ...item, rotation: deg };
                              }
                              return item;
                            });
                            localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
                            return updated;
                          });
                        }}
                        className={`py-1.5 rounded-lg font-bold text-[10px] transition-all border ${
                          selectedElement.rotation === deg
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/5"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length Slider (Only for walls) */}
                {(selectedElement.type === "wall-h" || selectedElement.type === "wall-v") && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Chiều Dài Tường</label>
                      <span className="text-[10px] text-cyan-400 font-extrabold bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900">
                        {selectedElement.size || 2} ô ({ (selectedElement.size || 2) * 25 }px)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="24"
                      value={selectedElement.size || 2}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setCustomElements((prev) => {
                          const updated = prev.map((item) => {
                            if (item.id === selectedElement.id) {
                              return { ...item, size: val };
                            }
                            return item;
                          });
                          localStorage.setItem("netdevice_topology_custom_elements", JSON.stringify(updated));
                          return updated;
                        });
                      }}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500">
                      <span>Ngắn (25px)</span>
                      <span>Dài (600px)</span>
                    </div>
                  </div>
                )}

                {/* Positioning info (Read-only reference) */}
                <div className="pt-2 border-t border-slate-900/60 flex items-center justify-between text-[9px] text-slate-500">
                  <span>Tọa độ lưới: X: {selectedElement.x}, Y: {selectedElement.y}</span>
                  <span>Lưới phụ: 25px mesh</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. TRẠNG THÁI BẢN ĐỒ (STATS) */}
          <div className="glass-panel p-6 rounded-3xl space-y-5 shadow-xl">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-400" /> Trạng thái Bản đồ
            </h4>
            
            <div className="grid grid-cols-2 gap-3.5">
              {/* Total Card */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Tổng máy</span>
                <p className="text-xl font-black text-white mt-0.5">{stats.total}</p>
              </div>
              
              {/* Online Card */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center">
                <span className="text-[9px] text-emerald-500/60 font-bold uppercase">Online</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{stats.online}</p>
              </div>

              {/* Offline Card */}
              <div className="p-3 bg-slate-800/10 border border-slate-800/20 rounded-2xl text-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Offline</span>
                <p className="text-xl font-black text-slate-400 mt-0.5">{stats.offline}</p>
              </div>

              {/* High Load Card */}
              <div className={`p-3 rounded-2xl text-center ${
                stats.highLoad > 0 
                  ? "bg-amber-500/5 border border-amber-500/15" 
                  : "bg-slate-950/60 border border-slate-800/80"
              }`}>
                <span className={`text-[9px] font-bold uppercase ${
                  stats.highLoad > 0 ? "text-amber-500/70 animate-pulse" : "text-slate-500"
                }`}>Quá tải</span>
                <p className={`text-xl font-black mt-0.5 ${
                  stats.highLoad > 0 ? "text-amber-400" : "text-slate-300"
                }`}>{stats.highLoad}</p>
              </div>
            </div>
          </div>

          {/* 4. THIẾT LẬP SƠ ĐỒ (RESET CONTROL) */}
          {isAdmin && groupBy === "location" && (
            <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl border border-brand-500/10">
              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Thiết lập Sơ đồ
              </h4>
              
              <p className="text-[10px] text-slate-500">
                Nếu bạn muốn dọn dẹp các vị trí đã tự sắp xếp thủ công và Snapping tất cả nút trở lại dạng sơ đồ vòng đồng tâm sạch sẽ:
              </p>

              <button
                onClick={handleResetLayout}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded-xl text-slate-300 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform duration-250" />
                Đặt lại vị trí mặc định
              </button>

              <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5 text-[9px] text-slate-500">
                <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Dữ liệu sơ đồ tự động đồng bộ lên Server</span>
              </div>
            </div>
          )}
        </div>

        {/* Graph Display Area (3/4 width) on the right */}
        <div 
          ref={canvasRef}
          className="xl:col-span-3 glass-panel rounded-3xl w-full aspect-[800/550] flex items-center justify-center relative overflow-hidden select-none bg-slate-950/40"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* BACKGROUND GLOW */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-brand-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="100%"
            className="z-10 overflow-visible cursor-default"
          >
            {/* SVG STYLES & FILTERS & GRID PATTERN */}
            <defs>
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Mẫu hoa văn Lưới kỹ thuật số Blueprint */}
              <pattern id="blueprint-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <rect width="25" height="25" fill="none" />
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(34, 211, 238, 0.035)" strokeWidth="0.8" />
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(34, 211, 238, 0.08)" strokeWidth="1.2" />
              </pattern>
            </defs>

            <style>
              {`
                @keyframes pulse-laser-flow {
                  from { stroke-dashoffset: 20; }
                  to { stroke-dashoffset: 0; }
                }
                .flow-active-link {
                  stroke-dasharray: 6, 12;
                  animation: pulse-laser-flow 1.5s linear infinite;
                }
              `}
            </style>

            {/* 1. LỚP LƯỚI KỸ THUẬT SỐ BLUEPRINT NỀN (Chỉ hiện khi phân theo Vị trí) */}
            {groupBy === "location" && (
              <rect
                id="blueprint-bg"
                width={width}
                height={height}
                fill="url(#blueprint-grid)"
                className="cursor-default"
                onClick={() => setSelectedElementId(null)}
              />
            )}

            {/* 2. VẼ CÁC CÁP LIÊN KẾT ĐỘNG (DÂY NỐI) */}
            <g>
              {connections.map((conn) => {
                const isCore = conn.type === "core-link";
                const isActive = conn.type === "active-link";
                
                let strokeColor = "stroke-slate-800/80";
                let pulseColor = "#334155";
                
                if (isCore) {
                  strokeColor = "stroke-slate-700/50";
                  pulseColor = "rgba(99, 102, 241, 0.4)";
                } else if (isActive) {
                  const highLoad = conn.cpu_usage > 80;
                  strokeColor = highLoad ? "stroke-amber-500/25" : "stroke-emerald-500/20";
                  pulseColor = highLoad ? "#f59e0b" : "#10b981";
                }

                const pathD = conn.d || `M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`;

                return (
                  <g key={conn.id}>
                    {/* Cáp tĩnh nền */}
                    <path
                      d={pathD}
                      fill="none"
                      className={`${strokeColor} transition-all duration-75`}
                      strokeWidth={isCore ? 2.5 : 1.8}
                      strokeDasharray={isCore ? "4,4" : isActive ? "none" : "2,2"}
                    />
                    
                    {/* Xung quang Laser chạy chuyển động dọc dây cáp khi máy trạm hoạt động */}
                    {(isActive || isCore) && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={pulseColor}
                        strokeWidth={isCore ? 2 : 1.5}
                        className="flow-active-link transition-all duration-75 pointer-events-none"
                        opacity="0.8"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* 3. VẼ CÁC NÚT (NODES) SAU DÂY NỐI ĐỂ KHÔNG BỊ DÂY ĐÈ LÊN MẶT */}
            <g>
              {renderedNodes.map((node) => {
                const isDraggingThis = draggedNodeId === node.id;
                
                // A. XỬ LÝ RENDER MÁY CHỦ CHÍNH (SERVER CORE)
                if (node.type === "server") {
                  const isLocationMode = groupBy === "location";
                  const mainR = isLocationMode ? 17 : 30;
                  const innerR = isLocationMode ? 13 : 23;
                  const glowR = isLocationMode ? 22 : 36;
                  const iconSizeClass = isLocationMode ? "w-4.5 h-4.5" : "w-5.5 h-5.5";
                  const iconOffset = isLocationMode ? -9 : -13;
                  const iconBoxSize = isLocationMode ? 18 : 26;
                  
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="group cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => handleMouseDown(e, node.id)}
                      onClick={(e) => {
                        // Tránh chuyển hướng nếu chỉ là thao tác kéo thả vừa xong
                        if (isDraggingRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        if (e.ctrlKey || e.shiftKey || e.altKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedElementId(node.id);
                          return;
                        }
                        onNavigateToDevice("server-core");
                      }}
                      onMouseEnter={(e) => handleNodeHover(e, { ...serverStats, type: "server", id: node.id, client_name: "NetDevice Server", is_online: true, x: node.x, y: node.y })}
                      onMouseMove={(e) => handleNodeHover(e, { ...serverStats, type: "server", id: node.id, client_name: "NetDevice Server", is_online: true, x: node.x, y: node.y })}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Vòng nét đứt chỉ báo đang chọn thiết bị để di chuyển bằng bàn phím */}
                      {selectedElementId === node.id && (
                        <circle
                          r={glowR + 4}
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="1.2"
                          strokeDasharray="3,3"
                          className="animate-spin"
                          style={{ animationDuration: "10s" }}
                        />
                      )}
                      
                      {/* Vòng hào quang phát sáng và kích thước máy chủ lớn */}
                      <circle r={glowR} className={`fill-none stroke-brand-500/20 animate-pulse ${isDraggingThis ? "scale-105" : ""}`} />
                      <circle r={mainR} className={`fill-slate-950 stroke-brand-500/70 glow-brand group-hover:stroke-brand-400 transition-all ${isDraggingThis ? "stroke-brand-400 stroke-[2.5]" : ""}`} strokeWidth="2" />
                      <circle r={innerR} className="fill-brand-950/20 stroke-brand-500/35" strokeWidth="1" />
                      
                      <foreignObject x={iconOffset} y={iconOffset} width={iconBoxSize} height={iconBoxSize} className="pointer-events-none">
                        <div className="flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
                           <Server className={iconSizeClass} />
                        </div>
                      </foreignObject>
                      
                      {/* Ký hiệu kéo thả */}
                      <circle r={isLocationMode ? 4.5 : 6} cx={isLocationMode ? 13 : 22} cy={isLocationMode ? -13 : -22} className="fill-slate-900 stroke-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <foreignObject x={isLocationMode ? 10.5 : 18} y={isLocationMode ? -15.5 : -26} width={isLocationMode ? 5 : 8} height={isLocationMode ? 5 : 8} className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Move className={`text-slate-400 ${isLocationMode ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
                      </foreignObject>

                      {/* Nhãn văn bản Server (Chỉ hiển thị khi di chuột vào) */}
                      {(hoveredNode?.id === node.id) && (
                        <text
                          y={isLocationMode ? 28 : -42}
                          textAnchor="middle"
                          className="fill-white font-extrabold text-[9px] tracking-widest uppercase bg-slate-950/90 px-1.5 py-0.5 rounded shadow-lg border border-slate-800 pointer-events-none animate-fade-in"
                        >
                          {node.name}
                        </text>
                      )}
                    </g>
                  );
                }

                // B. XỬ LÝ RENDER CÁC HUB THƯ MỤC NHÓM
                if (node.type === "hub") {
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="group cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => handleMouseDown(e, node.id)}
                      onDoubleClick={(e) => {
                        if (isDraggingRef.current) return;
                        setGroupBy(groupBy === "department" ? "location" : "department");
                      }}
                      title="Nhấp đúp chuột để đổi nhanh chế độ phân nhóm"
                    >
                      {/* Hào quang nền */}
                      <circle r="22" className={`fill-slate-950 stroke-slate-800/80 group-hover:stroke-brand-500 transition-all ${isDraggingThis ? "stroke-brand-500 stroke-[2]" : ""}`} strokeWidth="1.5" />
                      <circle r="17" className="fill-slate-900/90 stroke-slate-800/40" strokeWidth="1" />
                      <foreignObject x="-9" y="-9" width="18" height="18" className="pointer-events-none">
                        <div className="flex items-center justify-center text-brand-400 group-hover:scale-115 transition-transform">
                          <Folder className="w-3.5 h-3.5 fill-brand-500/10" />
                        </div>
                      </foreignObject>
                      
                      {/* Ký hiệu kéo thả */}
                      <circle r="5" cx="15" cy="-15" className="fill-slate-900 stroke-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <foreignObject x="12" y="-18" width="6" height="6" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Move className="w-1.5 h-1.5 text-slate-500" />
                      </foreignObject>

                      {/* Tên nhóm và số lượng máy */}
                      <text
                        y="34"
                        textAnchor="middle"
                        className="fill-slate-300 font-bold text-[9px] bg-slate-950/80 px-1 py-0.5 rounded shadow"
                      >
                        {node.name.length > 15 ? `${node.name.slice(0, 13)}...` : node.name}
                      </text>
                      <text
                        y="44"
                        textAnchor="middle"
                        className="fill-slate-500 font-medium text-[8px]"
                      >
                        ({node.deviceCount} máy)
                      </text>
                    </g>
                  );
                }

                // C. XỬ LÝ RENDER CÁC MÁY TRẠM MONITOR (CLIENT DEVICE)
                const isOnline = node.is_online;
                const isHighLoad = isOnline && (node.cpu_usage > 80 || node.ram_usage > 85);
                const isLocationMode = groupBy === "location";
                
                let ringColor = "stroke-slate-800/60";
                let iconColor = "text-slate-500";
                let pulseClass = "";

                if (isOnline) {
                  if (isHighLoad) {
                    ringColor = "stroke-amber-500/60 fill-amber-500/5";
                    iconColor = "text-amber-400";
                    pulseClass = "animate-pulse";
                  } else {
                    ringColor = "stroke-emerald-500/60 fill-emerald-500/5";
                    iconColor = "text-emerald-400";
                  }
                } else {
                  ringColor = "stroke-red-500/60 fill-red-500/5";
                  iconColor = "text-red-500";
                }

                const mainR = isLocationMode ? 17 : 13.5;
                const innerR = isLocationMode ? 13 : 9.5;
                const glowR = isLocationMode ? 22 : 17;
                const iconSizeClass = isLocationMode ? "w-4.5 h-4.5" : "w-3.5 h-3.5";
                const iconOffset = isLocationMode ? -9 : -7.5;
                const iconBoxSize = isLocationMode ? 18 : 15;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="group cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    onClick={(e) => {
                      if (isDraggingRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      if (e.ctrlKey || e.shiftKey || e.altKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedElementId(node.id);
                        return;
                      }
                      onNavigateToDevice(node.id);
                    }}
                    onMouseEnter={(e) => handleNodeHover(e, node)}
                    onMouseMove={(e) => handleNodeHover(e, node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Vòng nét đứt chỉ báo đang chọn thiết bị để di chuyển bằng bàn phím */}
                    {selectedElementId === node.id && (
                      <circle
                        r={glowR + 4}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1.2"
                        strokeDasharray="3,3"
                        className="animate-spin"
                        style={{ animationDuration: "8s" }}
                      />
                    )}
                    
                    {/* Hào quang nhấp nháy phát sáng nếu Online */}
                    {isOnline && (
                      <circle
                        r={glowR}
                        className={`fill-none ${isHighLoad ? "stroke-amber-500/20" : "stroke-emerald-500/20"} animate-ping`}
                        style={{ animationDuration: isHighLoad ? "1.5s" : "3s" }}
                      />
                    )}
                    
                    <circle r={mainR} className={`fill-slate-950 ${ringColor} group-hover:stroke-brand-500 transition-all ${isDraggingThis ? "stroke-brand-500 stroke-[1.8]" : ""}`} strokeWidth="1.5" />
                    {isLocationMode && (
                      <circle r={innerR} className="fill-brand-950/5 stroke-slate-800/30" strokeWidth="0.8" />
                    )}
                    
                    <foreignObject x={iconOffset} y={iconOffset} width={iconBoxSize} height={iconBoxSize} className="pointer-events-none">
                      <div className={`flex items-center justify-center ${iconColor} ${pulseClass} group-hover:scale-115 transition-transform`}>
                        <Monitor className={iconSizeClass} />
                      </div>
                    </foreignObject>
                    
                    {/* Nhãn kéo thả siêu nhỏ */}
                    <circle r={isLocationMode ? 4.5 : 4} cx={isLocationMode ? 13 : 10} cy={isLocationMode ? -13 : -10} className="fill-slate-900 stroke-slate-800/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <foreignObject x={isLocationMode ? 10.5 : 8} y={isLocationMode ? -15.5 : -12} width={isLocationMode ? 5 : 4} height={isLocationMode ? 5 : 4} className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Move className="w-1.5 h-1.5 text-slate-500" />
                    </foreignObject>

                    {/* Nhãn văn bản máy khách (Chỉ hiển thị khi di chuột vào) */}
                    {(hoveredNode?.id === node.id) && (
                      <text
                        y={isLocationMode ? 28 : 24}
                        textAnchor="middle"
                        className="fill-brand-400 font-extrabold text-[9px] pointer-events-none filter drop-shadow-[0_0_3px_rgba(34,211,238,0.4)] animate-fade-in"
                      >
                        {node.client_name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* 3. VẼ CÁC VẬT DỤNG VĂN PHÒNG TỰ PLACED (CHỈ HIỆN KHI Ở CHẾ ĐỘ VỊ TRÍ) */}
            {groupBy === "location" && (
              <g>
                {customElements.map((el) => {
                  const isSelected = selectedElementId === el.id;
                  const isWall = el.type === "wall-h" || el.type === "wall-v";
                  const wallLength = isWall ? (el.size || 2) * 25 : 50;
                  const wallOffset = -wallLength / 2;
                  
                  let elementGraphic = null;
                  
                  if (el.type === "wall-h") {
                    elementGraphic = (
                      <rect
                        x={wallOffset}
                        y="-3"
                        width={wallLength}
                        height="6"
                        rx="1"
                        className={`fill-cyan-950/80 stroke-cyan-500/80 transition-all ${isSelected ? "stroke-cyan-400 stroke-2" : ""}`}
                        strokeWidth="1.5"
                      />
                    );
                  } else if (el.type === "wall-v") {
                    elementGraphic = (
                      <rect
                        x="-3"
                        y={wallOffset}
                        width="6"
                        height={wallLength}
                        rx="1"
                        className={`fill-cyan-950/80 stroke-cyan-500/80 transition-all ${isSelected ? "stroke-cyan-400 stroke-2" : ""}`}
                        strokeWidth="1.5"
                      />
                    );
                  } else if (el.type === "desk") {
                    elementGraphic = (
                      <g>
                        {/* Desk top with high-visibility warm teak wood color */}
                        <rect
                          x="-25"
                          y="-15"
                          width="50"
                          height="30"
                          rx="3.5"
                          className={`transition-all ${
                            isSelected 
                              ? "fill-[#b45309]/30 stroke-[#fbbf24] stroke-[1.8]" 
                              : "fill-[#b45309]/15 stroke-[#d97706] hover:fill-[#b45309]/25 hover:stroke-[#f59e0b]"
                          }`}
                          strokeWidth="1.2"
                        />
                        {/* Elegant light wood trim inside the desk top */}
                        <rect
                          x="-23"
                          y="-13"
                          width="46"
                          height="26"
                          rx="2"
                          fill="none"
                          stroke="rgba(245, 158, 11, 0.2)"
                          strokeWidth="0.8"
                          className="pointer-events-none"
                        />
                        {/* Premium Cyber Desk Pad */}
                        <rect 
                          x="-18" 
                          y="-10" 
                          width="36" 
                          height="18" 
                          rx="1.5" 
                          fill="rgba(34, 211, 238, 0.15)" 
                          stroke="rgba(34, 211, 238, 0.5)" 
                          strokeWidth="0.8" 
                        />
                        {/* Mechanical Keyboard details */}
                        <rect x="-10" y="3" width="20" height="4" rx="0.5" fill="rgba(148, 163, 184, 0.55)" />
                        {/* Mouse details */}
                        <ellipse cx="12" cy="5" rx="1.5" ry="2.2" fill="rgba(148, 163, 184, 0.45)" />
                      </g>
                    );
                  } else if (el.type === "chair") {
                    elementGraphic = (
                      <g>
                        {/* Chair base */}
                        <circle
                          r="10"
                          className={`fill-slate-800/80 stroke-slate-500 transition-all ${isSelected ? "stroke-brand-400 stroke-1.8" : "group-hover:stroke-slate-350"}`}
                          strokeWidth="1.2"
                        />
                        {/* Backrest arch */}
                        <path d="M -8 -6 A 10 10 0 0 0 8 -6" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.8" />
                        {/* Armrests */}
                        <line x1="-11" y1="-2" x2="-11" y2="4" stroke="rgba(148, 163, 184, 0.6)" strokeWidth="1" />
                        <line x1="11" y1="-2" x2="11" y2="4" stroke="rgba(148, 163, 184, 0.6)" strokeWidth="1" />
                      </g>
                    );
                  } else if (el.type === "door" || el.type === "door-single") {
                    elementGraphic = (
                      <g>
                        {/* Frame / Jamb blocks */}
                        <rect x="-16.5" y="13" width="3" height="4" fill="#fb7185" />
                        <rect x="13.5" y="13" width="3" height="4" fill="#fb7185" />
                        {/* Pivot line representing door swing */}
                        <line x1="-15" y1="15" x2="-15" y2="-15" className="stroke-rose-500/60" strokeWidth="1.5" strokeDasharray="2,2" />
                        {/* Door swing arc */}
                        <path d="M 15 15 A 30 30 0 0 0 -15 -15" fill="none" className="stroke-rose-500/40" strokeWidth="1.2" strokeDasharray="3,3" />
                        {/* Door leaf panel (swung open at 90 degrees) */}
                        <line x1="-15" y1="15" x2="-15" y2="-15" className="stroke-rose-400" strokeWidth="2.2" />
                        {/* Hinge point */}
                        <circle cx="-15" cy="15" r="2.5" fill="#f43f5e" />
                      </g>
                    );
                  } else if (el.type === "door-double") {
                    elementGraphic = (
                      <g>
                        {/* Frame / Jamb blocks */}
                        <rect x="-26.5" y="-2" width="3" height="4" fill="#fb7185" />
                        <rect x="23.5" y="-2" width="3" height="4" fill="#fb7185" />
                        {/* Left door swing arc */}
                        <path d="M 0 0 A 25 25 0 0 0 -25 -25" fill="none" className="stroke-rose-500/40" strokeWidth="1.2" strokeDasharray="3,3" />
                        {/* Right door swing arc */}
                        <path d="M 0 0 A 25 25 0 0 1 25 -25" fill="none" className="stroke-rose-500/40" strokeWidth="1.2" strokeDasharray="3,3" />
                        {/* Left door leaf swung open at 90 degrees */}
                        <line x1="-25" y1="0" x2="-25" y2="-25" className="stroke-rose-400" strokeWidth="2.2" />
                        {/* Right door leaf swung open at 90 degrees */}
                        <line x1="25" y1="0" x2="25" y2="-25" className="stroke-rose-400" strokeWidth="2.2" />
                        {/* Hinges */}
                        <circle cx="-25" cy="0" r="2.5" fill="#f43f5e" />
                        <circle cx="25" cy="0" r="2.5" fill="#f43f5e" />
                      </g>
                    );
                  } else if (el.type === "plant") {
                    elementGraphic = (
                      <g>
                        <circle
                          r="8"
                          className={`fill-emerald-950/40 stroke-emerald-500/60 transition-all ${isSelected ? "stroke-emerald-400 stroke-1.8" : "group-hover:stroke-emerald-450"}`}
                          strokeWidth="1.2"
                        />
                        {/* Leaves */}
                        <path d="M 0 -8 C -3 -3 -3 3 0 8 C 3 3 3 -3 0 -8" fill="rgba(16, 185, 129, 0.75)" />
                        <path d="M -8 0 C -3 -3 3 -3 8 0 C 3 3 -3 3 -8 0" fill="rgba(16, 185, 129, 0.75)" />
                      </g>
                    );
                  } else if (el.type === "toilet") {
                    elementGraphic = (
                      <g>
                        {/* Water Tank */}
                        <rect x="-10" y="-12" width="20" height="6" rx="1.5" className="fill-slate-800/80 stroke-slate-400" strokeWidth="1.2" />
                        {/* Seat outer structure */}
                        <ellipse cx="0" cy="3" rx="8" ry="10" className="fill-slate-800/80 stroke-slate-400" strokeWidth="1.2" />
                        {/* Seat inner bowl hole */}
                        <ellipse cx="0" cy="3" rx="4.8" ry="6.2" fill="none" stroke="rgba(34, 211, 238, 0.35)" strokeWidth="0.8" />
                        {/* Water interior color */}
                        <ellipse cx="0" cy="3" rx="3.5" ry="4.5" fill="rgba(34, 211, 238, 0.12)" />
                        {/* Flush lever / button */}
                        <rect x="-6" y="-11" width="3.5" height="1.8" rx="0.5" fill="#22d3ee" />
                      </g>
                    );
                  } else if (el.type === "kitchen") {
                    elementGraphic = (
                      <g>
                        {/* Base Kitchen Countertop */}
                        <rect x="-25" y="-15" width="50" height="30" rx="2" className="fill-slate-800/80 stroke-slate-400" strokeWidth="1.2" />
                        {/* Sink Basin */}
                        <rect x="-19" y="-10" width="13" height="20" rx="1" fill="none" stroke="rgba(148, 163, 184, 0.55)" strokeWidth="1" />
                        {/* Faucet spout */}
                        <path d="M -19 0 L -14 0" fill="none" stroke="rgba(34, 211, 238, 0.7)" strokeWidth="1.5" />
                        {/* Glass Cooktop Stove Panel */}
                        <rect x="2" y="-11" width="16" height="22" rx="1.5" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="0.8" />
                        {/* Large burner ring */}
                        <circle cx="10" cy="-5" r="4" fill="none" stroke="#f97316" strokeWidth="1.2" opacity="0.9" />
                        <circle cx="10" cy="-5" r="1.5" fill="#ef4444" />
                        {/* Small burner ring */}
                        <circle cx="10" cy="5" r="3.2" fill="none" stroke="#f97316" strokeWidth="1.2" opacity="0.9" />
                        <circle cx="10" cy="5" r="1.2" fill="#ef4444" />
                      </g>
                    );
                  } else if (el.type === "shelf") {
                    elementGraphic = (
                      <g>
                        {/* Main cabinet border */}
                        <rect x="-25" y="-10" width="50" height="20" rx="1.5" className="fill-slate-800/80 stroke-slate-400" strokeWidth="1.2" />
                        {/* Cabinet Split divider */}
                        <line x1="-25" y1="0" x2="25" y2="0" stroke="rgba(148, 163, 184, 0.65)" strokeWidth="1" />
                        {/* Drawers divider */}
                        <line x1="-8" y1="-10" x2="-8" y2="10" stroke="rgba(148, 163, 184, 0.55)" strokeWidth="1" />
                        <line x1="8" y1="-10" x2="8" y2="10" stroke="rgba(148, 163, 184, 0.55)" strokeWidth="1" />
                        {/* Brass Drawer knobs / pulls */}
                        <rect x="-18" y="-3.5" width="4" height="1.5" rx="0.5" fill="#eab308" opacity="0.85" />
                        <rect x="-18" y="2" width="4" height="1.5" rx="0.5" fill="#eab308" opacity="0.85" />
                        <rect x="-3.5" y="-3.5" width="7" height="1.5" rx="0.5" fill="#eab308" opacity="0.85" />
                        <rect x="-3.5" y="2" width="7" height="1.5" rx="0.5" fill="#eab308" opacity="0.85" />
                        <rect x="14" y="-3.5" width="4" height="1.5" rx="0.5" fill="#eab308" opacity="0.85" />
                        <rect x="14" y="2" width="4" height="1.5" rx="0.5" fill="#eab308" opacity="0.85" />
                      </g>
                    );
                  }
                  
                  // Tự động co dãn khung nét đứt bao quanh vật dụng dựa theo kích thước thật
                  let boxW = 56;
                  let boxH = 56;
                  if (isSelected) {
                    if (el.type === "wall-h") {
                      boxW = wallLength + 8;
                      boxH = 16;
                    } else if (el.type === "wall-v") {
                      boxW = 16;
                      boxH = wallLength + 8;
                    } else if (el.type === "desk" || el.type === "kitchen") {
                      boxW = 56;
                      boxH = 36;
                    } else if (el.type === "shelf") {
                      boxW = 56;
                      boxH = 26;
                    } else if (el.type === "toilet") {
                      boxW = 30;
                      boxH = 32;
                    } else if (el.type === "door-double") {
                      boxW = 56;
                      boxH = 32;
                    }
                  }
                  
                  return (
                    <g
                      key={el.id}
                      transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation})`}
                      className="group cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(el.id);
                        handleMouseDown(e, el.id);
                      }}
                    >
                      {/* Bounding box for selection glow */}
                      {isSelected && (
                        <rect
                          x={-boxW / 2}
                          y={-boxH / 2}
                          width={boxW}
                          height={boxH}
                          fill="none"
                          stroke="rgba(34, 211, 238, 0.15)"
                          strokeWidth="1"
                          strokeDasharray="3,3"
                        />
                      )}
                      
                      {/* Graphics rendered dynamically */}
                      {elementGraphic}
                      
                      {/* DRAG RESIZE HANDLES FOR WALLS (Only render if selected and not dragging) */}
                      {isAdmin && isWall && isSelected && !draggedNodeId && !draggedHandle && (
                        <>
                          {/* Start Handle */}
                          <circle
                            cx={el.type === "wall-h" ? wallOffset : 0}
                            cy={el.type === "wall-v" ? wallOffset : 0}
                            r="6.5"
                            className="fill-cyan-400 stroke-slate-950 hover:fill-cyan-300 hover:scale-125 transition-all cursor-pointer"
                            strokeWidth="1.8"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setDraggedHandle({ id: el.id, type: "start" });
                            }}
                            title="Kéo để thay đổi chiều dài"
                          />
                          {/* End Handle */}
                          <circle
                            cx={el.type === "wall-h" ? wallLength / 2 : 0}
                            cy={el.type === "wall-v" ? wallLength / 2 : 0}
                            r="6.5"
                            className="fill-cyan-400 stroke-slate-950 hover:fill-cyan-300 hover:scale-125 transition-all cursor-pointer"
                            strokeWidth="1.8"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setDraggedHandle({ id: el.id, type: "end" });
                            }}
                            title="Kéo để thay đổi chiều dài"
                          />
                        </>
                      )}
                      
                      {/* CONTROL BUTTONS FOR SELECTED ELEMENT (Only render if selected and not dragging) */}
                      {isAdmin && isSelected && !draggedNodeId && !draggedHandle && (
                        <g transform={`rotate(${-el.rotation})`} className="pointer-events-auto">
                          {/* DELETE BUTTON (Left top) */}
                          <g
                            transform="translate(-25, -25)"
                            className="cursor-pointer"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDeleteElement(el.id);
                            }}
                            title="Xóa vật dụng"
                          >
                            <circle r="7.5" fill="#f43f5e" className="hover:fill-rose-600 transition-colors" />
                            {/* X shape */}
                            <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" fill="none" stroke="white" strokeWidth="1.2" />
                          </g>
                          
                          {/* ROTATE BUTTON (Right top) */}
                          <g
                            transform="translate(25, -25)"
                            className="cursor-pointer"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleRotateElement(el.id);
                            }}
                            title="Xoay 90 độ"
                          >
                            <circle r="7.5" fill="#0ea5e9" className="hover:fill-sky-600 transition-colors" />
                            {/* Circular arrow arc */}
                            <path d="M -3 -1 A 3 3 0 0 1 3 -1 L 3 2" fill="none" stroke="white" strokeWidth="1" />
                            <polygon points="1,-1 3,-3 3,1" fill="white" />
                          </g>

                          {/* SIZE ADJUSTMENT BUTTONS (Only for wall components - as clickable fallback) */}
                          {isWall && (
                            <>
                              {/* DECREASE LENGTH (Left bottom) */}
                              <g
                                transform="translate(-25, 25)"
                                className="cursor-pointer"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleAdjustElementSize(el.id, -1);
                                }}
                                title="Giảm chiều dài"
                              >
                                <circle r="7.5" fill="#64748b" className="hover:fill-slate-600 transition-colors" />
                                {/* Minus sign */}
                                <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="white" strokeWidth="1.5" />
                              </g>
                              
                              {/* INCREASE LENGTH (Right bottom) */}
                              <g
                                transform="translate(25, 25)"
                                className="cursor-pointer"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleAdjustElementSize(el.id, 1);
                                }}
                                title="Tăng chiều dài"
                              >
                                <circle r="7.5" fill="#10b981" className="hover:fill-emerald-600 transition-colors" />
                                {/* Plus sign */}
                                <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="white" strokeWidth="1.5" />
                                <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="white" strokeWidth="1.5" />
                              </g>
                            </>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
          </svg>

          {/* THÈ GLASSMORPHIC HIỂN THỊ CHI TIẾT HOVER (Hiện ngay cạnh thiết bị) */}
          {hoveredNode && (
            <div
              className="absolute glass-panel p-4 rounded-2xl w-60 pointer-events-none z-50 text-xs shadow-2xl border border-slate-700/50 animate-scale-up animate-fade-in"
              style={{
                // Nếu vị trí nút nằm quá nửa bên phải canvas, hiển thị sang bên trái nút để tránh tràn viền
                left: (() => {
                  if (!canvasRef.current) return 0;
                  const rect = canvasRef.current.getBoundingClientRect();
                  const tooltipWidth = 240; // w-60
                  const spacing = 16;
                  if (tooltipPos.x + spacing + tooltipWidth > rect.width) {
                    return tooltipPos.x - tooltipWidth - spacing;
                  }
                  return tooltipPos.x + spacing;
                })(),
                // Căn giữa theo chiều dọc so với tâm nút, giới hạn trong phạm vi container canvas
                top: (() => {
                  if (!canvasRef.current) return 0;
                  const rect = canvasRef.current.getBoundingClientRect();
                  const tooltipHeight = 160; // Chiều cao ước lượng của tooltip
                  const idealTop = tooltipPos.y - tooltipHeight / 2;
                  return Math.max(10, Math.min(rect.height - tooltipHeight - 10, idealTop));
                })()
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <span className="font-bold text-slate-100 truncate pr-2">
                  {hoveredNode.client_name || hoveredNode.hostname}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  hoveredNode.type === "server"
                    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                    : hoveredNode.is_online 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {hoveredNode.type === "server" ? "Server Core" : hoveredNode.is_online ? "Online" : "Offline"}
                </span>
              </div>

              {hoveredNode.type === "server" && !hoveredNode.cpu_model ? (
                <div className="flex items-center justify-center py-4 space-x-2">
                  <Loader2 className="w-4 h-4 text-brand-550 animate-spin" />
                  <span className="text-[10px] text-slate-500 italic animate-pulse">Đang tải tài nguyên...</span>
                </div>
              ) : hoveredNode.is_online || hoveredNode.type === "server" ? (
                <div className="space-y-2">
                  {hoveredNode.type === "server" ? (
                    <>
                      <p className="text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">HĐH:</span> {hoveredNode.os_name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        <span className="font-semibold text-slate-300">CPU:</span> {hoveredNode.cpu_model} ({hoveredNode.cpu_cores} nhân)
                      </p>
                      <p className="text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">Đơn vị:</span> Máy chủ Giám sát
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">Người dùng:</span> {hoveredNode.current_user} ({hoveredNode.owner})
                    </p>
                  )}
                  
                  {/* CPU Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Tải CPU:</span>
                      <span className={`font-bold ${hoveredNode.cpu_usage > 80 ? "text-amber-400" : "text-slate-300"}`}>
                        {Math.round(hoveredNode.cpu_usage)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          hoveredNode.cpu_usage > 80 ? "bg-amber-500" : "bg-brand-500"
                        }`}
                        style={{ width: `${hoveredNode.cpu_usage}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Tải RAM:</span>
                      <span className={`font-bold ${hoveredNode.ram_usage > 85 ? "text-amber-400" : "text-slate-300"}`}>
                        {Math.round(hoveredNode.ram_usage)}% {hoveredNode.ram_total_gb ? `(${hoveredNode.ram_used_gb} GB / ${hoveredNode.ram_total_gb} GB)` : ""}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          hoveredNode.ram_usage > 85 ? "bg-amber-500" : "bg-brand-500"
                        }`}
                        style={{ width: `${hoveredNode.ram_usage}%` }}
                      />
                    </div>
                  </div>
                  
                  {hoveredNode.type !== "server" && (
                    <div className="flex items-center gap-1.5 text-[9px] text-brand-400 font-semibold pt-1">
                      <span>Nhấp chuột để xem chi tiết</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 text-center py-2 font-medium italic">
                  Thiết bị hiện đang ngoại tuyến
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 5. HƯỚNG DẪN SỬ DỤNG - ĐỂ Ở DƯỚI CÙNG HOÀN TOÀN */}
      <div className="glass-panel p-6 rounded-3xl mt-6 space-y-4 shadow-xl border border-slate-800/60 bg-slate-950/20">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-brand-500" /> Hướng dẫn sử dụng sơ đồ mạng
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="space-y-2">
            <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Kéo thả & Sắp xếp vị trí
            </h5>
            <p className="pl-3 text-slate-400 leading-relaxed">
              Nhấn giữ chuột trái vào máy chủ chính hoặc từng máy trạm PC. Di chuột kéo thả để di chuyển đến vị trí mong muốn trên lưới và nhả chuột để cố định.
            </p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Thêm & Thay đổi vật dụng
            </h5>
            <p className="pl-3 text-slate-400 leading-relaxed">
              Nhấp chọn vật dụng từ <strong>Thư viện Vật dụng ở bên trái</strong> để thêm vào bản đồ. Nhấp chọn vật dụng đã thêm để xoay góc, kéo co dãn chiều dài tường (qua 2 đầu mút cyan) hoặc xóa bỏ.
            </p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Tự động lưu & Đồng bộ
            </h5>
            <p className="pl-3 text-slate-400 leading-relaxed">
              Sơ đồ bố cục văn phòng của bạn được <strong>tự động lưu vĩnh viễn và đồng bộ</strong> trên Server máy chủ. Nhấp "Đặt lại vị trí mặc định" trong sidebar để dọn dẹp và thiết lập lại sơ đồ đồng tâm.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
