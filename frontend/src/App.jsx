import { useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import DeviceList from "./pages/DeviceList";
import SoftwareSearch from "./pages/SoftwareSearch";
import DeviceDetail from "./pages/DeviceDetail";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Điều phối hiển thị trang chi tiết hoặc các tab
  const renderContent = () => {
    if (selectedDeviceId) {
      return (
        <DeviceDetail
          deviceId={selectedDeviceId}
          onBackToList={() => setSelectedDeviceId(null)}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigateToDevice={(id) => setSelectedDeviceId(id)} />;
      case "devices":
        return <DeviceList onNavigateToDevice={(id) => setSelectedDeviceId(id)} />;
      case "software":
        return <SoftwareSearch onNavigateToDevice={(id) => setSelectedDeviceId(id)} />;
      default:
        return <Dashboard onNavigateToDevice={(id) => setSelectedDeviceId(id)} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={(tab) => {
      // Khi nhấn đổi tab thì xóa luôn chi tiết thiết bị đang mở
      setSelectedDeviceId(null);
      setActiveTab(tab);
    }}>
      {renderContent()}
    </Layout>
  );
}

export default App;
