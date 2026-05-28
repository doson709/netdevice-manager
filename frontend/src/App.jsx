import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import DeviceList from "./pages/DeviceList";
import SoftwareSearch from "./pages/SoftwareSearch";
import DeviceDetail from "./pages/DeviceDetail";
import NetworkTopology from "./pages/NetworkTopology";
import Login from "./pages/Login";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem("netdevice_admin_token") || localStorage.getItem("netdevice_guest_mode") === "true";
  });

  const [isAdmin, setIsAdmin] = useState(() => {
    return !!localStorage.getItem("netdevice_admin_token");
  });

  const [hash, setHash] = useState(window.location.hash || "#/dashboard");

  const handleLogout = () => {
    localStorage.removeItem("netdevice_admin_token");
    localStorage.removeItem("netdevice_admin_user");
    localStorage.removeItem("netdevice_guest_mode");
    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  useEffect(() => {
    // Nếu URL trống hash, tự động gán #/dashboard mặc định
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }

    const handleHashChange = () => {
      setHash(window.location.hash || "#/dashboard");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Hàm điều hướng tiện ích bằng cách đổi hash trên thanh địa chỉ URL
  const navigateTo = (newHash) => {
    window.location.hash = newHash;
  };

  // Phân tích hash hiện tại để xác định tab và ID chi tiết thiết bị đang mở
  const getRouteInfo = () => {
    const currentHash = hash || "#/dashboard";
    
    // Hỗ trợ đường dẫn chi tiết thiết bị dạng: #/device/:id
    if (currentHash.startsWith("#/device/")) {
      const deviceId = currentHash.replace("#/device/", "");
      return { tab: "devices", selectedDeviceId: deviceId };
    }

    // Các tab thông thường
    switch (currentHash) {
      case "#/dashboard":
        return { tab: "dashboard", selectedDeviceId: null };
      case "#/devices":
        return { tab: "devices", selectedDeviceId: null };
      case "#/software":
        return { tab: "software", selectedDeviceId: null };
      case "#/topology":
        return { tab: "topology", selectedDeviceId: null };
      default:
        return { tab: "dashboard", selectedDeviceId: null };
    }
  };

  const { tab, selectedDeviceId } = getRouteInfo();

  // Điều phối hiển thị trang chi tiết hoặc các tab dựa trên URL
  const renderContent = () => {
    if (selectedDeviceId) {
      return (
        <DeviceDetail
          deviceId={selectedDeviceId}
          onBackToList={() => navigateTo("#/devices")}
          isAdmin={isAdmin}
        />
      );
    }

    switch (tab) {
      case "dashboard":
        return <Dashboard onNavigateToDevice={(id) => navigateTo(`#/device/${id}`)} />;
      case "devices":
        return <DeviceList onNavigateToDevice={(id) => navigateTo(`#/device/${id}`)} isAdmin={isAdmin} />;
      case "software":
        return <SoftwareSearch onNavigateToDevice={(id) => navigateTo(`#/device/${id}`)} />;
      case "topology":
        return <NetworkTopology onNavigateToDevice={(id) => navigateTo(`#/device/${id}`)} isAdmin={isAdmin} />;
      default:
        return <Dashboard onNavigateToDevice={(id) => navigateTo(`#/device/${id}`)} />;
    }
  };

  if (!isLoggedIn) {
    return (
      <Login
        onLoginSuccess={() => {
          setIsLoggedIn(true);
          setIsAdmin(true);
        }}
        onGuestLogin={() => {
          localStorage.setItem("netdevice_guest_mode", "true");
          setIsLoggedIn(true);
          setIsAdmin(false);
        }}
      />
    );
  }

  return (
    <Layout
      activeTab={tab}
      setActiveTab={(newTab) => {
        navigateTo(`#/${newTab}`);
      }}
      onLogout={handleLogout}
      isAdmin={isAdmin}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
