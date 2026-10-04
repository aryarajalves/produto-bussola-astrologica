"use client";

import React, { useState } from "react";
import {
  IconDownload,
  IconRefresh,
  IconTrash,
  IconPlay,
  IconSearch,
  IconFilter,
  IconFileArchive,
} from "./BackupIcons";
import { DeleteBackupModal, RestoreBackupModal } from "./BackupModais";
import { toast } from "@/components/Toast";

export interface BackupItem {
  key: string;
  filename: string;
  size_bytes: number;
  size_formatted: string;
  type: "Manual" | "Automático" | "Externo";
  created_at: string;
}

interface TabelaBackupsProps {
  backups: BackupItem[];
  loading: boolean;
  onRefresh: () => void;
}

export default function TabelaBackups({ backups, loading, onRefresh }: TabelaBackupsProps) {
  const [filterType, setFilterType] = useState<string>("todos");
  const [search, setSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [executingManual, setExecutingManual] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modais de confirmação
  const [deleteModalItem, setDeleteModalItem] = useState<BackupItem | null>(null);
  const [restoreModalItem, setRestoreModalItem] = useState<BackupItem | null>(null);

  const itemsPerPage = 10;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

  // Disparar backup manual
  const handleCreateManualBackup = async () => {
    setExecutingManual(true);
    try {
      const res = await fetch(`${apiUrl}/admin/backups/manual`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Falha ao gerar backup manual");
      }
      toast.success("Backup manual gerado e salvo no Backblaze B2 com sucesso!");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar backup manual.");
    } finally {
      setExecutingManual(false);
    }
  };

  // Baixar backup
  const handleDownload = async (filename: string) => {
    try {
      const res = await fetch(`${apiUrl}/admin/backups/download/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao obter URL de download");
      const data = await res.json();
      if (data.download_url) {
        window.open(data.download_url, "_blank");
        toast.success(`Download de ${filename} iniciado.`);
      }
    } catch (e: any) {
      toast.error(e.message || "Não foi possível baixar o backup.");
    }
  };

  // Confirmar Exclusão
  const confirmDelete = async () => {
    if (!deleteModalItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/backups/${deleteModalItem.filename}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao deletar backup");
      }
      toast.success(`Backup ${deleteModalItem.filename} excluído com sucesso!`);
      setDeleteModalItem(null);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Falha ao deletar arquivo do Backblaze B2.");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirmar Restauração
  const confirmRestore = async () => {
    if (!restoreModalItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/backups/restore/${restoreModalItem.filename}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao restaurar banco");
      }
      toast.success("Banco de dados restaurado com sucesso!");
      setRestoreModalItem(null);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Falha na restauração do backup.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtragem
  const filtered = backups.filter((b) => {
    const matchesType =
      filterType === "todos" ? true : b.type.toLowerCase() === filterType.toLowerCase();
    const matchesSearch = b.filename.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Card: Execução de Backup Manual */}
      <div
        className="p-6 rounded-2xl shadow-xl transition-all"
        style={{
          background: "linear-gradient(135deg, #1a1535, rgba(60, 52, 137, 0.45))",
          border: "1px solid rgba(127, 119, 221, 0.35)",
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
              <span className="p-2 rounded-xl bg-[#7F77DD]/20 text-[#AFA9EC] border border-[#7F77DD]/30">
                <IconFileArchive className="w-4 h-4" />
              </span>
              Execução de Backup Manual
            </h3>
            <p className="text-xs mt-1.5 max-w-xl leading-relaxed" style={{ color: "#8b87b8" }}>
              Cria um dump completo do banco PostgreSQL imediatamente, aplica compressão gzip e realiza o
              upload direto para a pasta configurada no Backblaze B2.
            </p>
          </div>
          <button
            onClick={handleCreateManualBackup}
            disabled={executingManual}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 cursor-pointer shrink-0 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #7F77DD, #534ab3)",
              color: "#ffffff",
              boxShadow: "0 0 20px rgba(127, 119, 221, 0.4)",
            }}
          >
            {executingManual ? (
              <>
                <IconRefresh className="w-4 h-4 animate-spin" />
                <span>Gerando Dump e Enviando...</span>
              </>
            ) : (
              <>
                <IconPlay className="w-4 h-4" />
                <span>Fazer Backup Agora</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Controles de Filtro e Busca */}
      <div
        className="p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
        }}
      >
        <div className="relative flex-1 min-w-[240px]">
          <span className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8b87b8" }}>
            <IconSearch className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome do dump..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl pl-10 pr-3 py-2 text-xs outline-none transition-all focus:border-[#7F77DD]"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#f0eeff",
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span style={{ color: "#8b87b8" }}>
            <IconFilter className="w-4 h-4" />
          </span>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl px-3 py-2 text-xs outline-none cursor-pointer transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#f0eeff",
            }}
          >
            <option value="todos" style={{ background: "#1a1535", color: "#f0eeff" }}>Todos os Tipos</option>
            <option value="manual" style={{ background: "#1a1535", color: "#f0eeff" }}>Manual</option>
            <option value="automático" style={{ background: "#1a1535", color: "#f0eeff" }}>Automático</option>
            <option value="externo" style={{ background: "#1a1535", color: "#f0eeff" }}>Externo</option>
          </select>

          <button
            onClick={onRefresh}
            title="Recarregar lista"
            className="p-2 rounded-xl transition cursor-pointer hover:brightness-125"
            style={{
              background: "rgba(127, 119, 221, 0.15)",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#AFA9EC",
            }}
          >
            <IconRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabela de Backups */}
      <div
        className="rounded-2xl overflow-hidden shadow-xl"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className="border-b font-semibold uppercase tracking-wider text-[11px]"
                style={{
                  background: "rgba(127, 119, 221, 0.08)",
                  borderColor: "rgba(127, 119, 221, 0.2)",
                  color: "#AFA9EC",
                }}
              >
                <th className="py-3.5 px-5">Arquivo</th>
                <th className="py-3.5 px-4">Tamanho</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Criado em</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "rgba(127, 119, 221, 0.1)" }}>
              {loading && paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center" style={{ color: "#8b87b8" }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconRefresh className="w-6 h-6 animate-spin text-[#7F77DD]" />
                      <span className="font-medium">Carregando backups do Backblaze B2...</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center" style={{ color: "#8b87b8" }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-2xl">📦</span>
                      <span className="font-medium">Nenhum backup encontrado no bucket.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((b) => (
                  <tr
                    key={b.key}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="py-3.5 px-5 font-mono" style={{ color: "#f0eeff" }}>
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-[#7F77DD]/15 text-[#AFA9EC] border border-[#7F77DD]/25 shrink-0">
                          <IconFileArchive className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate max-w-[280px] font-semibold" title={b.filename}>
                          {b.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium" style={{ color: "#AFA9EC" }}>
                      {b.size_formatted}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                          b.type === "Manual"
                            ? "bg-[#7F77DD]/20 text-[#AFA9EC] border-[#7F77DD]/35"
                            : b.type === "Automático"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/35"
                            : "bg-[#EF9F27]/20 text-[#EF9F27] border-[#EF9F27]/35"
                        }`}
                      >
                        {b.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4" style={{ color: "#8b87b8" }}>
                      {formatDate(b.created_at)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(b.filename)}
                          title="Baixar Backup"
                          className="p-2 rounded-xl transition cursor-pointer hover:brightness-125 shadow-sm"
                          style={{
                            background: "rgba(127, 119, 221, 0.15)",
                            border: "1px solid rgba(127, 119, 221, 0.3)",
                            color: "#AFA9EC",
                          }}
                        >
                          <IconDownload className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRestoreModalItem(b)}
                          title="Restaurar Banco de Dados"
                          className="p-2 rounded-xl transition cursor-pointer hover:brightness-125 shadow-sm"
                          style={{
                            background: "rgba(239, 159, 39, 0.15)",
                            border: "1px solid rgba(239, 159, 39, 0.35)",
                            color: "#EF9F27",
                          }}
                        >
                          <IconRefresh className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteModalItem(b)}
                          title="Excluir Backup"
                          className="p-2 rounded-xl transition cursor-pointer hover:brightness-125 shadow-sm"
                          style={{
                            background: "rgba(244, 63, 94, 0.15)",
                            border: "1px solid rgba(244, 63, 94, 0.35)",
                            color: "#f43f5e",
                          }}
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {filtered.length > itemsPerPage && (
          <div
            className="px-5 py-3.5 border-t flex items-center justify-between text-xs font-medium"
            style={{
              borderColor: "rgba(127, 119, 221, 0.15)",
              color: "#8b87b8",
            }}
          >
            <span>
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
              {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} backups
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-xl disabled:opacity-30 cursor-pointer transition"
                style={{
                  background: "rgba(127, 119, 221, 0.15)",
                  border: "1px solid rgba(127, 119, 221, 0.25)",
                  color: "#f0eeff",
                }}
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl disabled:opacity-30 cursor-pointer transition"
                style={{
                  background: "rgba(127, 119, 221, 0.15)",
                  border: "1px solid rgba(127, 119, 221, 0.25)",
                  color: "#f0eeff",
                }}
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Confirmação com Backdrop Preto e Painel Cósmico */}
      <DeleteBackupModal
        item={deleteModalItem}
        loading={actionLoading}
        onClose={() => setDeleteModalItem(null)}
        onConfirm={confirmDelete}
      />

      <RestoreBackupModal
        item={restoreModalItem}
        loading={actionLoading}
        onClose={() => setRestoreModalItem(null)}
        onConfirm={confirmRestore}
      />
    </div>
  );
}
