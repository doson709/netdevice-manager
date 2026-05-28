import React, { useState } from "react";
import { api } from "../utils/api";
import { Cpu, Lock, User, ShieldAlert, KeyRound, Eye } from "lucide-react";

export default function Login({ onLoginSuccess, onGuestLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.login(username, password);
      if (res && res.token) {
        localStorage.setItem("netdevice_admin_token", res.token);
        localStorage.setItem("netdevice_admin_user", JSON.stringify(res.user));
        onLoginSuccess();
      } else {
        setError("Phản hồi đăng nhập không hợp lệ từ máy chủ.");
      }
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      // Trích xuất lỗi chi tiết từ server nếu có
      setError(
        err.message || "Tài khoản hoặc mật khẩu không chính xác!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden select-none p-6">
      {/* Sleek cyber grid overlay in background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(34,211,238,0.03)_1px,transparent_1px)] [background-size:25px_25px] opacity-60 pointer-events-none" />
      
      {/* Decorative neon ambient glows */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-brand-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Glassmorphic Login Card */}
      <div className="w-full max-w-[460px] glass-panel p-10 rounded-[32px] shadow-2xl border border-slate-800/80 bg-slate-900/10 backdrop-blur-xl relative z-10 animate-scale-up space-y-7">
        
        {/* Brand header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 bg-brand-500/10 rounded-2xl border border-brand-500/20 text-brand-400 glow-brand animate-pulse mx-auto">
            <Cpu className="w-9 h-9" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
              NETDEVICE MANAGER
            </h1>
            <p className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase">
              Hệ thống Giám sát & Quản lý thiết bị trạm
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="bg-rose-500/5 backdrop-blur-md border border-rose-500/20 text-rose-300 p-4.5 rounded-2xl flex gap-3.5 items-start animate-shake shadow-[0_0_15px_rgba(244,63,94,0.05)]">
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Đăng nhập thất bại</h4>
              <p className="text-xs font-medium text-rose-200/90 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider pl-1">Tên đăng nhập</label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập tài khoản admin..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-[13.5px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all font-semibold shadow-inner shadow-black/10"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider pl-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-[13.5px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all font-semibold shadow-inner shadow-black/10"
              />
            </div>
          </div>

          {/* Action Buttons Container */}
          <div className="space-y-3 pt-3">
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 active:scale-[0.99] text-white text-[13.5px] font-bold rounded-2xl shadow-lg shadow-brand-600/10 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4.5 h-4.5 text-brand-200 group-hover:rotate-45 transition-transform" />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>

            {/* Guest Access Button */}
            {onGuestLogin && (
              <button
                type="button"
                onClick={onGuestLogin}
                className="w-full py-3.5 bg-slate-950/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 active:scale-[0.99] text-slate-300 text-[13.5px] font-bold rounded-2xl transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <Eye className="w-4.5 h-4.5 text-slate-400 group-hover:scale-110 transition-transform" />
                <span>Xem với tư cách Khách (Chỉ xem)</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
