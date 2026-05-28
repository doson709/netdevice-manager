const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8085`;

/**
 * Hàm chung thực hiện gọi API fetch kèm xử lý lỗi
 */
async function apiCall(endpoint, method = "GET", body = null) {
  const url = `${API_BASE_URL.rstrip ? API_BASE_URL.replace(/\/$/, '') : API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  const token = localStorage.getItem("netdevice_admin_token");
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `API Error: ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed && typeof parsed.detail === "string") {
          errMsg = parsed.detail;
        } else if (parsed && typeof parsed.detail === "object" && parsed.detail !== null) {
          // Xử lý FastAPI validation errors dạng danh sách các lỗi
          errMsg = JSON.stringify(parsed.detail);
        } else if (parsed && parsed.message) {
          errMsg = parsed.message;
        }
      } catch (e) {
        if (errText) {
          errMsg = errText;
        }
      }
      throw new Error(errMsg);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Call failed for ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Dashboard
  getDashboardStats: () => apiCall("/api/dashboard"),
  getServerStats: () => apiCall("/api/dashboard/server"),

  // Devices
  getDevices: (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        query.append(key, params[key]);
      }
    });
    return apiCall(`/api/devices?${query.toString()}`);
  },

  getDeviceDetail: (id) => apiCall(`/api/devices/${id}`),

  getDeviceHistory: (id, hours = 24) => apiCall(`/api/devices/${id}/history?hours=${hours}`),

  getDeviceSoftware: (id, params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        query.append(key, params[key]);
      }
    });
    return apiCall(`/api/devices/${id}/software?${query.toString()}`);
  },

  updateDeviceMetadata: (id, payload) => apiCall(`/api/devices/${id}`, "PUT", payload),

  deleteDevice: (id) => apiCall(`/api/devices/${id}`, "DELETE"),

  // Reports / Global Search
  searchGlobalSoftware: (query, page = 1, limit = 50) => {
    return apiCall(`/api/reports/software/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  },

  getTopSoftware: (limit = 15) => apiCall(`/api/reports/software/top?limit=${limit}`),

  // Topology Sync
  getTopology: () => apiCall("/api/topology"),
  saveTopology: (payload) => apiCall("/api/topology", "POST", payload),

  // Authentication
  login: (username, password) => apiCall("/api/auth/login", "POST", { username, password }),
};
