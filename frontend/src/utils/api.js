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

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `API Error: ${response.status}`);
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
};
