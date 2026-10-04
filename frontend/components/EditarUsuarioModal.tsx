"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

export interface UserToEdit {
  id: string;
  name: string;
  email: string;
  whatsapp?: string | null;
  role: string;
  is_active: boolean;
  is_super_admin?: boolean;
}

interface EditarUsuarioModalProps {
  isOpen: boolean;
  user: UserToEdit | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

export default function EditarUsuarioModal({
  isOpen,
  user,
  onClose,
  onUserUpdated,
}: EditarUsuarioModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<"client" | "admin">("client");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setWhatsapp(user.whatsapp || "");
      setRole(user.role === "admin" ? "admin" : "client");
      setIsActive(user.is_active ?? true);
    }
  }, [user]);

  if (!isOpen || !mounted || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user.is_super_admin) {
      toast.error("O Super Admin não pode ser alterado.");
      return;
    }

    if (!name.trim()) {
      toast.error("Informe o nome do usuário.");
      return;
    }

    if (!email.trim()) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim() || null,
        role,
        is_active: isActive,
      };

      await api.put(`/admin/users/${user.id}`, payload);
      toast.success("Usuário atualizado com sucesso!");
      onUserUpdated();
      onClose();
    } catch (err: any) {
      const detail = err?.message || err?.response?.data?.detail || "Erro ao atualizar usuário.";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      data-testid="editar-usuario-modal-backdrop"
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
        data-testid="editar-usuario-modal-panel"
        className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border my-auto"
        style={{
          background: "linear-gradient(180deg, #1d1838 0%, #130f26 100%)",
          borderColor: "rgba(127, 119, 221, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(127, 119, 221, 0.2)",
        }}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight" style={{ color: "#f0eeff" }}>
              Editar Usuário
            </h3>
            <p className="text-xs mt-1" style={{ color: "#8b87b8" }}>
              Atualize os dados cadastrais, cargo e permissões do usuário.
            </p>
          </div>

          <button
            type="button"
            data-testid="close-edit-user-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-xs transition-colors hover:bg-white/10 cursor-pointer"
            style={{ color: "#8b87b8" }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {user.is_super_admin ? (
          <div
            data-testid="super-admin-protected-warning"
            className="p-4 rounded-2xl border text-sm"
            style={{
              background: "rgba(239, 159, 39, 0.1)",
              borderColor: "rgba(239, 159, 39, 0.3)",
              color: "#EF9F27",
            }}
          >
            👑 <strong>Super Admin do Sistema:</strong> Este usuário é o administrador principal configurado nas variáveis de ambiente. Suas credenciais não podem ser alteradas pelo painel por motivos de integridade e segurança.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
                Nome Completo *
              </label>
              <input
                data-testid="edit-user-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(127, 119, 221, 0.3)",
                  color: "#f0eeff",
                }}
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
                E-mail *
              </label>
              <input
                data-testid="edit-user-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(127, 119, 221, 0.3)",
                  color: "#f0eeff",
                }}
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
                WhatsApp / Telefone (Opcional)
              </label>
              <input
                data-testid="edit-user-whatsapp-input"
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="5511999999999"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(127, 119, 221, 0.3)",
                  color: "#f0eeff",
                }}
              />
            </div>

            {/* Tipo de Usuário (Role) */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
                Tipo de Acesso (Papel)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="edit-role-client-btn"
                  onClick={() => setRole("client")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === "client" ? "ring-2 ring-purple-400" : "opacity-75"
                  }`}
                  style={{
                    background: role === "client" ? "rgba(127, 119, 221, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    borderColor: role === "client" ? "#7F77DD" : "rgba(127, 119, 221, 0.2)",
                  }}
                >
                  <div className="font-semibold text-xs" style={{ color: "#f0eeff" }}>
                    🎓 Aluno (Cliente)
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
                    Acesso à área de membros e mapa
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="edit-role-admin-btn"
                  onClick={() => setRole("admin")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === "admin" ? "ring-2 ring-amber-400" : "opacity-75"
                  }`}
                  style={{
                    background: role === "admin" ? "rgba(239, 159, 39, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    borderColor: role === "admin" ? "#EF9F27" : "rgba(127, 119, 221, 0.2)",
                  }}
                >
                  <div className="font-semibold text-xs" style={{ color: "#EF9F27" }}>
                    🛡️ Administrador
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
                    Acesso completo ao painel admin
                  </div>
                </button>
              </div>
            </div>

            {/* Status da Conta */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
                Status da Conta
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="edit-status-active-btn"
                  onClick={() => setIsActive(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    isActive ? "ring-2 ring-emerald-400" : "opacity-70"
                  }`}
                  style={{
                    background: isActive ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    borderColor: isActive ? "#34d399" : "rgba(127, 119, 221, 0.2)",
                    color: isActive ? "#34d399" : "#8b87b8",
                  }}
                >
                  ● Ativo
                </button>

                <button
                  type="button"
                  data-testid="edit-status-inactive-btn"
                  onClick={() => setIsActive(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    !isActive ? "ring-2 ring-rose-400" : "opacity-70"
                  }`}
                  style={{
                    background: !isActive ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    borderColor: !isActive ? "#f43f5e" : "rgba(127, 119, 221, 0.2)",
                    color: !isActive ? "#f43f5e" : "#8b87b8",
                  }}
                >
                  ✕ Inativo
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                data-testid="cancel-edit-user-btn"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10 cursor-pointer"
                style={{ color: "#8b87b8" }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                data-testid="save-edit-user-btn"
                className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                  color: "#ffffff",
                }}
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
