"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import { PasswordInput } from "@/components/PasswordInput";

interface TokenInfo {
  valid: boolean;
  name: string;
  email: string;
}

function RedefinirSenhaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Requisitos de senha forte
  const hasMinLength = password.length >= 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  useEffect(() => {
    if (!token) {
      setErrorMsg("Nenhum token de redefinição de senha foi encontrado na URL.");
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const data = await api.get<TokenInfo>(`/auth/verify-reset-token/${encodeURIComponent(token)}`);
        setTokenInfo(data);
      } catch (err: any) {
        const msg = err.response?.data?.detail || "Link de redefinição de senha inválido ou expirado.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("A senha deve atender a todos os 5 requisitos de segurança.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password: password.trim(),
      });

      setSuccessMsg(true);
      toast.success("Sua senha foi redefinida com sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Erro ao redefinir senha. Tente novamente.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="redefinir-senha-page"
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at top, #1e1338 0%, #0d091a 100%)",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl border relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #1d1838 0%, #130f26 100%)",
          borderColor: "rgba(127, 119, 221, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(127, 119, 221, 0.2)",
        }}
      >
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl border border-purple-500/30 bg-purple-500/10 shadow-lg shadow-purple-500/10">
            🧭
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#f0eeff" }}>
            Sirius Academy
          </h1>
          <p className="text-xs" style={{ color: "#8b87b8" }}>
            Redefinição Segura de Senha
          </p>
        </div>

        {/* Estado Carregando */}
        {loading ? (
          <div className="py-12 text-center text-xs space-y-2" style={{ color: "#8b87b8" }}>
            <div className="inline-block animate-spin text-2xl">✨</div>
            <p>Validando link de redefinição...</p>
          </div>
        ) : errorMsg ? (
          /* Erro de Token Inválido / Expirado */
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
              <span className="text-xl block mb-1">⚠️</span>
              {errorMsg}
            </div>
            <p className="text-xs" style={{ color: "#8b87b8" }}>
              Por segurança, solicite um novo link de redefinição para o administrador da sua conta.
            </p>
            <Link
              href="/admin/login"
              className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                color: "#ffffff",
              }}
            >
              Voltar ao Login
            </Link>
          </div>
        ) : successMsg ? (
          /* Sucesso ao Redefinir */
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 space-y-1">
              <span className="text-2xl block mb-1">🎉</span>
              <p className="font-bold text-sm">Senha redefinida com sucesso!</p>
              <p>Agora você já pode acessar sua conta utilizando sua nova senha.</p>
            </div>
            <Link
              href="/admin/login"
              data-testid="go-to-login-btn"
              className="inline-block w-full py-3 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 text-center"
              style={{
                background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                color: "#ffffff",
              }}
            >
              Ir para o Login 🚀
            </Link>
          </div>
        ) : (
          /* Formulário de Criação da Nova Senha */
          <form onSubmit={handleSubmit} className="space-y-4">
            {tokenInfo && (
              <div
                className="p-3.5 rounded-2xl border text-xs"
                style={{
                  background: "rgba(127, 119, 221, 0.1)",
                  borderColor: "rgba(127, 119, 221, 0.25)",
                }}
              >
                <p style={{ color: "#8b87b8" }}>
                  Redefinindo senha para:{" "}
                  <strong style={{ color: "#f0eeff" }}>{tokenInfo.name}</strong>
                </p>
                <p className="font-mono text-purple-300 text-[11px] mt-0.5">{tokenInfo.email}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
                Nova Senha * (mínimo 12 caracteres, letras maiúsculas, minúsculas, números e caracteres especiais)
              </label>
              <PasswordInput
                required
                data-testid="new-password-input"
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />

              {/* Checklist de Validação de Senha Forte */}
              <div
                data-testid="password-requirements-box"
                className="p-3 rounded-xl border text-[11px] space-y-1 mt-2"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  borderColor: "rgba(127, 119, 221, 0.2)",
                }}
              >
                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-slate-400"}`}>
                  <span>{hasMinLength ? "✓" : "●"}</span>
                  <span>Mínimo de 12 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-400" : "text-slate-400"}`}>
                  <span>{hasUpperCase ? "✓" : "●"}</span>
                  <span>Pelo menos uma letra maiúscula (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-400" : "text-slate-400"}`}>
                  <span>{hasLowerCase ? "✓" : "●"}</span>
                  <span>Pelo menos uma letra minúscula (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400" : "text-slate-400"}`}>
                  <span>{hasNumber ? "✓" : "●"}</span>
                  <span>Pelo menos um número (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? "text-emerald-400" : "text-slate-400"}`}>
                  <span>{hasSpecialChar ? "✓" : "●"}</span>
                  <span>Pelo menos um caractere especial (!@#$%^&*...)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
                Confirmar Nova Senha *
              </label>
              <PasswordInput
                required
                data-testid="confirm-new-password-input"
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="submit-new-password-btn"
              className="w-full py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-95 cursor-pointer disabled:opacity-50 mt-2"
              style={{
                background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                color: "#ffffff",
              }}
            >
              {submitting ? "Salvando Nova Senha..." : "Definir Nova Senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0d091a] text-purple-300 text-xs">
          Carregando...
        </div>
      }
    >
      <RedefinirSenhaContent />
    </Suspense>
  );
}
