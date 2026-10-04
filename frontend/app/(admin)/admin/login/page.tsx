"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveToken } from "@/lib/api";

const C = {
  bg: "#0a0718",
  card: "#130f2c",
  inputBg: "#1a1538",
  primary: "#7F77DD",
  light: "#AFA9EC",
  dark: "#3C3489",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.22)",
};

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post<{ token: string; role: string }>("/auth/login", { email, password });
      if (res.role !== "admin") { setError("Acesso restrito a administradores."); return; }
      saveToken(res.token);
      router.push("/admin");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", { email });
      setSuccessMsg(res.message || "E-mail de recuperação enviado com sucesso!");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao enviar e-mail de recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at top, #1b133d 0%, #0a0718 70%)" }}
    >
      {/* Decorative cosmic background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Container */}
      <div
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl relative z-10 backdrop-blur-xl"
        style={{
          background: "rgba(19, 15, 44, 0.88)",
          border: `1px solid ${C.border}`,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 40px rgba(127, 119, 221, 0.15)",
        }}
      >
        {/* Left Column: Form Fields */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Painel Administrativo
            </div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: C.text }}>
              Bússola Astrológica
            </h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              {isForgot
                ? "Recuperação de credenciais de acesso"
                : "Entre com suas credenciais de administrador"}
            </p>
          </div>

          {!isForgot ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.light }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500/40"
                  style={{ background: C.inputBg, color: C.text, border: `1px solid ${C.border}` }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.light }}>
                  Senha
                </label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha"
                    required
                    className="w-full pl-4 pr-11 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: C.inputBg, color: C.text, border: `1px solid ${C.border}` }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    data-testid="toggle-password-visibility"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                    aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-300 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-center font-medium" style={{ color: "#ff8080" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/25 active:scale-[0.99]"
                style={{
                  background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
                  color: C.text,
                }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(true);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs hover:underline cursor-pointer"
                  style={{ color: C.light }}
                >
                  Esqueci minha senha 🔑
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs mb-2" style={{ color: C.muted }}>
                Digite seu e-mail cadastrado para receber sua nova senha de acesso:
              </p>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.light }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bussola.com"
                  required
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ background: C.inputBg, color: C.text, border: `1px solid ${C.border}` }}
                />
              </div>

              {error && <p className="text-sm text-center" style={{ color: "#ff8080" }}>{error}</p>}
              {successMsg && (
                <p
                  className="text-sm text-center p-3 rounded-lg"
                  style={{
                    background: "rgba(100,220,140,0.15)",
                    color: "#80ffaa",
                    border: "1px solid rgba(100,220,140,0.3)",
                  }}
                >
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/25 active:scale-[0.99]"
                style={{
                  background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
                  color: C.text,
                }}
              >
                {loading ? "Enviando..." : "Enviar E-mail de Recuperação"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs hover:underline cursor-pointer"
                  style={{ color: C.light }}
                >
                  ← Voltar para o Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Astrological Compass Showcase */}
        <div
          className="relative hidden md:flex flex-col items-center justify-center p-8 overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(28, 20, 60, 0.95), rgba(12, 8, 28, 0.98))",
            borderLeft: `1px solid ${C.border}`,
          }}
        >
          {/* Internal ambient aura */}
          <div className="absolute inset-0 bg-radial from-indigo-500/20 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Golden Compass Image Frame */}
            <div
              className="relative w-64 h-64 lg:w-72 lg:h-72 rounded-full p-2.5 mb-6 flex items-center justify-center overflow-hidden transition-all duration-500 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, rgba(200, 160, 90, 0.4), rgba(127, 119, 221, 0.3), rgba(60, 52, 137, 0.2))",
                boxShadow: "0 0 45px rgba(200, 160, 90, 0.25), 0 0 35px rgba(127, 119, 221, 0.3)",
                border: "1px solid rgba(220, 180, 100, 0.3)",
              }}
            >
              <img
                src="/bussola-astrologica.jpg"
                alt="Bússola Astrológica"
                data-testid="login-compass-image"
                className="w-full h-full object-cover rounded-full shadow-inner"
              />
            </div>

            <h2 className="text-xl font-bold tracking-wider" style={{ color: C.text }}>
              Bússola Astrológica
            </h2>
            <p className="text-xs max-w-xs mt-2 leading-relaxed" style={{ color: C.muted }}>
              Guia celeste e cálculos astrológicos precisos com sabedoria ancestral.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
