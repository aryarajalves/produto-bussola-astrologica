"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import PaginationControls from "@/components/PaginationControls";

export interface PanelInvite {
  id: string;
  token: string;
  role: string;
  role_label: string;
  validity_type: string;
  expires_at: string | null;
  created_at: string;
  is_used: boolean;
  used_at: string | null;
  status: "active" | "used" | "expired";
  invite_path: string;
}

export default function ListaConvites() {
  const [invites, setInvites] = useState<PanelInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Paginação e Seleção em Massa
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<PanelInvite | null>(null);
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: PanelInvite[]; total: number }>("/admin/invites");
      setInvites(data?.items || []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedInviteIds([]);
  }, [statusFilter, roleFilter]);

  const formatBrasiliaDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const normalized = dateStr.includes("Z") || dateStr.includes("+") || dateStr.includes("-", 10)
        ? dateStr
        : `${dateStr}Z`;
      const date = new Date(normalized);
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getFullInviteUrl = (invitePath: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${invitePath}`;
  };

  const handleCopy = async (invite: PanelInvite) => {
    const url = getFullInviteUrl(invite.invite_path);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedToken(invite.token);
      toast.success("Link de convite copiado!");
      setTimeout(() => setCopiedToken(null), 3000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  // Contadores
  const totalInvites = invites.length;
  const activeCount = invites.filter((i) => i.status === "active").length;
  const usedCount = invites.filter((i) => i.status === "used").length;
  const expiredCount = invites.filter((i) => i.status === "expired").length;

  // Filtragem
  const filteredInvites = invites.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (roleFilter && i.role !== roleFilter) return false;
    return true;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredInvites.length / PAGE_SIZE));
  const pagedInvites = filteredInvites.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Seleção em Massa
  const isAllSelectedInPage =
    pagedInvites.length > 0 &&
    pagedInvites.every((inv) => selectedInviteIds.includes(inv.id));

  const toggleSelectAllInPage = () => {
    if (isAllSelectedInPage) {
      setSelectedInviteIds((prev) => prev.filter((id) => !pagedInvites.some((inv) => inv.id === id)));
    } else {
      const toAdd = pagedInvites.map((inv) => inv.id).filter((id) => !selectedInviteIds.includes(id));
      setSelectedInviteIds((prev) => [...prev, ...toAdd]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedInviteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchDelete = async () => {
    setBatchDeleteLoading(true);
    try {
      await api.delete("/admin/invites/batch", { ids: selectedInviteIds });
      toast.success(`${selectedInviteIds.length} convite(s) excluído(s) com sucesso!`);
      setSelectedInviteIds([]);
      setShowBatchDeleteModal(false);
      fetchInvites();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao excluir convites selecionados.");
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!inviteToDelete) return;
    setSingleDeleteLoading(true);
    try {
      await api.delete("/admin/invites/batch", { ids: [inviteToDelete.id] });
      toast.success("Convite excluído com sucesso!");
      setInviteToDelete(null);
      fetchInvites();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao excluir convite.");
    } finally {
      setSingleDeleteLoading(false);
    }
  };

  return (
    <div data-testid="lista-convites-container" className="space-y-6">
      {/* Cards de Métricas de Convites */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          className="p-4 sm:p-5 rounded-2xl space-y-1"
          style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <span className="text-xs" style={{ color: "#8b87b8" }}>Total de Convites</span>
          <div className="text-xl sm:text-2xl font-bold" style={{ color: "#f0eeff" }}>{totalInvites}</div>
        </div>

        <div
          className="p-4 sm:p-5 rounded-2xl space-y-1"
          style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <span className="text-xs" style={{ color: "#8b87b8" }}>Disponíveis (Ativos)</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{activeCount}</div>
        </div>

        <div
          className="p-4 sm:p-5 rounded-2xl space-y-1"
          style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <span className="text-xs" style={{ color: "#8b87b8" }}>Utilizados</span>
          <div className="text-xl sm:text-2xl font-bold text-purple-300">{usedCount}</div>
        </div>

        <div
          className="p-4 sm:p-5 rounded-2xl space-y-1"
          style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <span className="text-xs" style={{ color: "#8b87b8" }}>Expirados</span>
          <div className="text-xl sm:text-2xl font-bold text-rose-400">{expiredCount}</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div
        className="p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3"
        style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
      >
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <select
            data-testid="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
            style={{
              background: "#120d24",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#f0eeff",
            }}
          >
            <option value="">Todos os Status</option>
            <option value="active">Disponível (Ativo)</option>
            <option value="used">Utilizado</option>
            <option value="expired">Expirado</option>
          </select>

          <select
            data-testid="role-filter-select-invites"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
            style={{
              background: "#120d24",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#f0eeff",
            }}
          >
            <option value="">Todos os Papéis</option>
            <option value="client">Aluno</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchInvites}
          disabled={loading}
          data-testid="refresh-invites-btn"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
          style={{ color: "#8b87b8", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <span>🔄</span>
          <span>{loading ? "Carregando..." : "Atualizar"}</span>
        </button>
      </div>

      {/* Barra de Ações em Massa (Convites) */}
      {!loading && filteredInvites.length > 0 && (
        <div
          data-testid="invites-batch-bar"
          className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none" style={{ color: "#f0eeff" }}>
            <input
              type="checkbox"
              data-testid="select-all-invites-btn"
              checked={isAllSelectedInPage}
              onChange={toggleSelectAllInPage}
              className="w-4 h-4 rounded cursor-pointer accent-purple-500"
            />
            <span>Selecionar todos da página ({pagedInvites.length})</span>
          </label>

          {selectedInviteIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-semibold" style={{ color: "#AFA9EC" }}>
                {selectedInviteIds.length} selecionado(s)
              </span>
              <button
                type="button"
                data-testid="clear-selection-invites-btn"
                onClick={() => setSelectedInviteIds([])}
                className="px-2.5 py-1 rounded-lg text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Limpar
              </button>
              <button
                type="button"
                data-testid="batch-delete-invites-btn"
                onClick={() => setShowBatchDeleteModal(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-rose-500/10"
              >
                <span>🗑️</span>
                <span>Excluir Selecionados</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de Convites */}
      {loading ? (
        <div className="py-16 text-center text-sm" style={{ color: "#8b87b8" }}>
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Carregando convites...
        </div>
      ) : filteredInvites.length === 0 ? (
        <div
          data-testid="empty-invites-state"
          className="py-16 text-center rounded-2xl border"
          style={{ background: "#1a1535", borderColor: "rgba(127, 119, 221, 0.2)" }}
        >
          <span className="text-3xl block mb-2">🎟️</span>
          <p className="text-sm font-semibold" style={{ color: "#f0eeff" }}>
            Nenhum convite encontrado
          </p>
          <p className="text-xs mt-1" style={{ color: "#8b87b8" }}>
            Clique no botão "+ Criar Usuário" acima para gerar um novo link de convite.
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="invites-list">
          {pagedInvites.map((inv) => {
            const isCopied = copiedToken === inv.token;
            const isSelected = selectedInviteIds.includes(inv.id);
            const fullUrl = getFullInviteUrl(inv.invite_path);

            return (
              <div
                key={inv.id}
                data-testid={`invite-card-${inv.id}`}
                className={`p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 transition-all hover:border-purple-500/40 ${
                  isSelected ? "border-purple-500/60 bg-purple-500/5" : ""
                }`}
                style={{
                  background: isSelected ? "rgba(127, 119, 221, 0.08)" : "#1a1535",
                  border: isSelected ? "1px solid rgba(127, 119, 221, 0.5)" : "1px solid rgba(127, 119, 221, 0.2)",
                }}
              >
                {/* Lado Esquerdo: Checkbox, Badges e URL */}
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-[260px]">
                  <input
                    type="checkbox"
                    data-testid={`select-invite-${inv.id}`}
                    checked={isSelected}
                    onChange={() => toggleSelectOne(inv.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-purple-500 shrink-0 mt-1 sm:mt-0"
                  />

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Badge Papel */}
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
                        style={{
                          background: inv.role === "admin" ? "rgba(239, 159, 39, 0.15)" : "rgba(52, 211, 153, 0.15)",
                          color: inv.role === "admin" ? "#EF9F27" : "#34d399",
                          border: `1px solid ${inv.role === "admin" ? "rgba(239, 159, 39, 0.3)" : "rgba(52, 211, 153, 0.3)"}`,
                        }}
                      >
                        {inv.role === "admin" ? "🛡️ Administrador" : "🎓 Aluno"}
                      </span>

                      {/* Badge Status */}
                      {inv.status === "active" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          ● Disponível
                        </span>
                      )}
                      {inv.status === "used" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          ✓ Utilizado
                        </span>
                      )}
                      {inv.status === "expired" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                          ✕ Expirado
                        </span>
                      )}

                      <span className="text-xs" style={{ color: "#8b87b8" }}>
                        {inv.validity_type === "never"
                          ? "♾️ Nunca expira"
                          : `⏱️ Validade de ${inv.validity_type}`}
                      </span>
                    </div>

                    {/* Campo de Link com Cópia Rápida */}
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        readOnly
                        value={fullUrl}
                        className="w-full text-xs font-mono px-3 py-1.5 rounded-xl select-all outline-none truncate"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(127, 119, 221, 0.25)",
                          color: "#f0eeff",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(inv)}
                        data-testid="copy-invite-url-btn"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1"
                        style={{
                          background: isCopied
                            ? "rgba(52, 211, 153, 0.2)"
                            : "linear-gradient(135deg, #7F77DD, #534ab3)",
                          color: isCopied ? "#34d399" : "#ffffff",
                          border: isCopied ? "1px solid #34d399" : "none",
                        }}
                      >
                        <span>{isCopied ? "✓" : "📋"}</span>
                        <span>{isCopied ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Datas e Ação de Exclusão */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right space-y-1 text-xs" style={{ color: "#8b87b8" }}>
                    <p>
                      <strong style={{ color: "#AFA9EC" }}>Criado em:</strong> {formatBrasiliaDate(inv.created_at)}
                    </p>
                    {inv.is_used && inv.used_at && (
                      <p className="text-purple-300">
                        <strong>Utilizado em:</strong> {formatBrasiliaDate(inv.used_at)}
                      </p>
                    )}
                    {!inv.is_used && inv.expires_at && (
                      <p className={inv.status === "expired" ? "text-red-400" : "text-amber-300"}>
                        <strong>Expira em:</strong> {formatBrasiliaDate(inv.expires_at)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid={`delete-invite-btn-${inv.id}`}
                    onClick={() => setInviteToDelete(inv)}
                    className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all hover:bg-rose-500/25 active:scale-95 cursor-pointer"
                    style={{
                      background: "rgba(244, 63, 94, 0.12)",
                      color: "#fda4af",
                      border: "1px solid rgba(244, 63, 94, 0.3)",
                    }}
                    title="Excluir este convite"
                  >
                    <span>🗑️</span>
                    <span className="hidden sm:inline">Excluir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controles de Paginação (20 por página) */}
      {!loading && filteredInvites.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredInvites.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="convites"
        />
      )}

      {/* Modal de Exclusão Individual de Convite */}
      <ConfirmDeleteModal
        isOpen={!!inviteToDelete}
        title="Excluir Convite"
        message="Tem certeza que deseja excluir permanentemente este convite? O link deixará de funcionar imediatamente."
        count={1}
        confirmText="Sim, Excluir"
        loading={singleDeleteLoading}
        onClose={() => setInviteToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
      />

      {/* Modal de Exclusão em Massa (Convites) */}
      <ConfirmDeleteModal
        isOpen={showBatchDeleteModal}
        title="Excluir Convites Selecionados"
        message={`Tem certeza que deseja excluir os ${selectedInviteIds.length} convite(s) selecionado(s)? Links já gerados deixarão de funcionar.`}
        count={selectedInviteIds.length}
        loading={batchDeleteLoading}
        onClose={() => setShowBatchDeleteModal(false)}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
