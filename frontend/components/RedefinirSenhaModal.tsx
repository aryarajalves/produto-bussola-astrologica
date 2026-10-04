"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/components/Toast";

interface RedefinirSenhaModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  resetUrl: string;
  onClose: () => void;
}

export default function RedefinirSenhaModal({
  isOpen,
  userName,
  userEmail,
  resetUrl,
  onClose,
}: RedefinirSenhaModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !resetUrl) return null;

  const fullUrl = resetUrl.startsWith("http")
    ? resetUrl
    : typeof window !== "undefined"
    ? `${window.location.origin}${resetUrl}`
    : resetUrl;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Link de redefinição copiado com sucesso!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  const modalContent = (
    <div
      data-testid="redefinir-senha-modal-backdrop"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        data-testid="redefinir-senha-modal-panel"
        className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border my-auto"
        style={{
          background: "linear-gradient(180deg, #1d1838 0%, #130f26 100%)",
          borderColor: "rgba(127, 119, 221, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(127, 119, 221, 0.2)",
        }}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              🔑
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: "#f0eeff" }}>
                Link de Redefinição de Senha
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "#8b87b8" }}>
                Envie este link para que o próprio usuário crie sua nova senha.
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-reset-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-xs transition-colors hover:bg-white/10 cursor-pointer"
            style={{ color: "#8b87b8" }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Informações do Usuário */}
        <div
          className="p-4 rounded-2xl border text-xs space-y-1.5"
          style={{
            background: "rgba(127, 119, 221, 0.1)",
            borderColor: "rgba(127, 119, 221, 0.25)",
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: "#8b87b8" }}>Usuário:</span>
            <span className="font-bold" style={{ color: "#f0eeff" }}>
              {userName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "#8b87b8" }}>E-mail:</span>
            <span className="font-mono text-purple-300">{userEmail}</span>
          </div>
        </div>

        {/* Link e Botão Copiar */}
        <div className="space-y-2">
          <label className="block text-xs font-medium" style={{ color: "#AFA9EC" }}>
            Link seguro gerado (válido por 48 horas):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              data-testid="reset-password-url-input"
              value={fullUrl}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl select-all outline-none truncate"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.3)",
                color: "#f0eeff",
              }}
            />
            <button
              type="button"
              data-testid="copy-reset-url-btn"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
              style={{
                background: copied
                  ? "rgba(52, 211, 153, 0.2)"
                  : "linear-gradient(135deg, #7F77DD, #534ab3)",
                color: copied ? "#34d399" : "#ffffff",
                border: copied ? "1px solid #34d399" : "none",
              }}
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>{copied ? "Copiado" : "Copiar Link"}</span>
            </button>
          </div>
        </div>

        {/* Dica / Orientações */}
        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 font-medium">
          💡 Ao abrir este link, o usuário será direcionado para uma página exclusiva onde poderá digitar e confirmar sua nova senha com total segurança.
        </div>

        {/* Rodapé: Apenas 1 botão fechar */}
        <div className="flex items-center justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            data-testid="finish-reset-modal-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              color: "#f0eeff",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
