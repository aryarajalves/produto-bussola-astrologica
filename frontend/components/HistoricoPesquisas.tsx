"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

export interface LogItem {
  id: string;
  client_id?: string;
  created_at?: string;
  name: string;
  email: string;
  whatsapp?: string;
  birth_city?: string;
  birth_date?: string;
  birth_time?: string;
  status: "success" | "failed" | "in_progress" | string;
  error_message?: string;
  model_used?: string;
}

interface HistoricoPesquisasProps {
  onOpenClient?: (clientId: string) => void;
}

export default function HistoricoPesquisas({ onOpenClient }: HistoricoPesquisasProps) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Estados de seleção e exclusão
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [logToDelete, setLogToDelete] = useState<LogItem | null>(null);
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LogItem[]>("/admin/generation-logs");
      setLogs(res || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const totalPages = Math.max(1, Math.ceil(safeLogs.length / pageSize));
  const currentLogs = safeLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Seleção em massa
  const isAllSelectedInPage =
    currentLogs.length > 0 && currentLogs.every((l) => selectedLogIds.includes(l.id));

  const toggleSelectAllInPage = () => {
    if (isAllSelectedInPage) {
      setSelectedLogIds((prev) => prev.filter((id) => !currentLogs.some((l) => l.id === id)));
    } else {
      const toAdd = currentLogs.map((l) => l.id).filter((id) => !selectedLogIds.includes(id));
      setSelectedLogIds((prev) => [...prev, ...toAdd]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedLogIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedLogIds.length === 0) return;
    setBatchDeleteLoading(true);
    try {
      await api.delete("/admin/generation-logs/batch", { ids: selectedLogIds });
      toast.success(`${selectedLogIds.length} registro(s) do histórico excluído(s) com sucesso!`);
      setSelectedLogIds([]);
      setShowBatchDeleteModal(false);
      fetchLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao excluir registros selecionados.");
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!logToDelete) return;
    setSingleDeleteLoading(true);
    try {
      await api.delete(`/admin/generation-logs/${logToDelete.id}`);
      toast.success("Registro do histórico excluído com sucesso!");
      setSelectedLogIds((prev) => prev.filter((id) => id !== logToDelete.id));
      setLogToDelete(null);
      fetchLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao excluir registro.");
    } finally {
      setSingleDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const formatBrasiliaDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      // Normaliza para UTC adicionando Z se necessário para conversão exata para Brasília
      const normalized = dateStr.includes("Z") || dateStr.includes("+") || dateStr.includes("-", 10)
        ? dateStr
        : dateStr + "Z";
      return new Date(normalized).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Histórico */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
            <span>📜</span> Histórico de Pesquisas e Gerações
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "#8b87b8" }}>
            Registro das pesquisas realizadas e mapas astrais gerados no sistema.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:brightness-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(127, 119, 221, 0.3), rgba(60, 52, 137, 0.5))",
            color: "#f0eeff",
            border: "1px solid rgba(127, 119, 221, 0.4)",
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Atualizando...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Atualizar Histórico</span>
            </>
          )}
        </button>
      </div>

      {/* Barra de Ações em Massa */}
      {logs.length > 0 && (
        <div
          data-testid="logs-selection-bar"
          className="p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3"
          style={{
            background: "#1a1535",
            border: "1px solid rgba(127, 119, 221, 0.25)",
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-xs select-none" style={{ color: "#f0eeff" }}>
              <input
                type="checkbox"
                data-testid="select-all-logs-checkbox"
                checked={isAllSelectedInPage}
                onChange={toggleSelectAllInPage}
                className="w-4 h-4 rounded cursor-pointer accent-purple-500"
              />
              <span>Selecionar todos da página</span>
            </label>

            {selectedLogIds.length > 0 && (
              <span
                data-testid="selected-logs-count"
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"
              >
                {selectedLogIds.length} selecionado(s)
              </span>
            )}
          </div>

          {selectedLogIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="batch-delete-logs-btn"
                onClick={() => setShowBatchDeleteModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 text-white"
                style={{
                  background: "linear-gradient(135deg, #e11d48, #be123c)",
                  boxShadow: "0 0 15px rgba(225, 29, 72, 0.4)",
                }}
              >
                <span>🗑️</span>
                <span>Excluir Selecionados ({selectedLogIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLogIds([])}
                className="px-3 py-1.5 rounded-xl text-xs transition-colors hover:text-white"
                style={{ color: "#8b87b8" }}
              >
                Desmarcar todos
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de Registros */}
      {logs.length === 0 ? (
        <div
          className="p-10 text-center rounded-3xl"
          style={{
            background: "linear-gradient(145deg, rgba(26, 21, 53, 0.6) 0%, rgba(15, 11, 30, 0.8) 100%)",
            border: "1px solid rgba(127, 119, 221, 0.2)",
          }}
        >
          <div className="text-4xl mb-3">🔍</div>
          <h4 className="text-base font-semibold mb-1" style={{ color: "#f0eeff" }}>
            Nenhum histórico registrado no momento
          </h4>
          <p className="text-xs sm:text-sm max-w-md mx-auto" style={{ color: "#8b87b8" }}>
            Quando você realizar pesquisas e gerar mapas na aba <strong>Pesquisa</strong>, o registro das ações aparecerá listado aqui em tempo real.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentLogs.map((log) => {
            const isSuccess = log.status === "success" || log.status === "ready";
            const isFailed = log.status === "failed";
            const isSelected = selectedLogIds.includes(log.id);

            return (
              <div
                key={log.id}
                className={`p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 transition-all ${
                  isSelected ? "border-purple-500/80 shadow-lg shadow-purple-500/10" : "hover:border-purple-500/40"
                }`}
                style={{
                  background: isSelected ? "rgba(127, 119, 221, 0.12)" : "#1a1535",
                  border: `1px solid ${isSelected ? "rgba(127, 119, 221, 0.6)" : "rgba(127, 119, 221, 0.2)"}`,
                }}
              >
                <div className="flex items-start gap-3 min-w-[220px]">
                  {/* Checkbox de Seleção Individual */}
                  <input
                    type="checkbox"
                    data-testid={`checkbox-log-${log.id}`}
                    checked={isSelected}
                    onChange={() => toggleSelectOne(log.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-purple-500 shrink-0 mt-1"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base" style={{ color: "#f0eeff" }}>
                        {log.name || "Lead / Usuário"}
                      </span>
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: isSuccess
                            ? "rgba(52, 211, 153, 0.15)"
                            : isFailed
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                          color: isSuccess ? "#34d399" : isFailed ? "#f87171" : "#fbbf24",
                          border: `1px solid ${
                            isSuccess
                              ? "rgba(52, 211, 153, 0.3)"
                              : isFailed
                              ? "rgba(239, 68, 68, 0.3)"
                              : "rgba(245, 158, 11, 0.3)"
                          }`,
                        }}
                      >
                        {isSuccess ? "✅ Mapa Gerado" : isFailed ? "❌ Falhou" : "⏳ Em Andamento"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "#8b87b8" }}>
                      {log.birth_city && <span>📍 {log.birth_city}</span>}
                      {log.birth_date && <span>📅 Nasc: {log.birth_date}</span>}
                      {log.birth_time && <span>⏰ Hora: {log.birth_time}</span>}
                      {log.email && !log.email.includes("@bussola.local") && <span>✉️ {log.email}</span>}
                    </div>

                    {log.error_message && (
                      <p className="text-xs font-mono mt-1 text-red-400">
                        ⚠️ {log.error_message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-1.5 shrink-0 ml-auto">
                  <p className="text-xs font-mono" style={{ color: "#AFA9EC" }} title="Horário de Brasília">
                    {formatBrasiliaDate(log.created_at)}
                  </p>
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {log.model_used && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "#8b87b8",
                          border: "1px solid rgba(127, 119, 221, 0.2)",
                        }}
                      >
                        🤖 {log.model_used}
                      </span>
                    )}

                    {/* Botão de Excluir Registro Individual */}
                    <button
                      type="button"
                      data-testid={`delete-log-btn-${log.id}`}
                      onClick={() => setLogToDelete(log)}
                      title="Excluir este registro do histórico"
                      className="text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30"
                    >
                      <span>🗑️</span>
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Barra de Paginação (Visível sempre que houver registros) */}
          {logs.length > 0 && (
            <div
              data-testid="pagination-bar"
              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl mt-4"
              style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.25)" }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <p data-testid="pagination-info" className="text-xs" style={{ color: "#8b87b8" }}>
                  Mostrando <strong style={{ color: "#f0eeff" }}>{(currentPage - 1) * pageSize + 1}</strong> a <strong style={{ color: "#f0eeff" }}>{Math.min(currentPage * pageSize, logs.length)}</strong> de <strong style={{ color: "#f0eeff" }}>{logs.length}</strong> registros
                </p>

                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#8b87b8" }}>
                  <span>Itens por página:</span>
                  <select
                    data-testid="page-size-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg px-2 py-1 text-xs cursor-pointer outline-none"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(127, 119, 221, 0.3)",
                      color: "#f0eeff",
                    }}
                  >
                    <option value={5} style={{ background: "#1a1535" }}>5</option>
                    <option value={10} style={{ background: "#1a1535" }}>10</option>
                    <option value={20} style={{ background: "#1a1535" }}>20</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                  style={{
                    background: "rgba(127, 119, 221, 0.15)",
                    color: "#f0eeff",
                    border: "1px solid rgba(127, 119, 221, 0.3)",
                  }}
                >
                  ← Anterior
                </button>

                {/* Números das páginas */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className="w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
                        style={{
                          background: currentPage === page ? "linear-gradient(135deg, #7F77DD, #3C3489)" : "rgba(255, 255, 255, 0.05)",
                          color: currentPage === page ? "#ffffff" : "#8b87b8",
                          border: `1px solid ${currentPage === page ? "rgba(127, 119, 221, 0.5)" : "transparent"}`,
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}

                <span data-testid="page-indicator" className="text-xs px-2" style={{ color: "#AFA9EC" }}>
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                  style={{
                    background: "rgba(127, 119, 221, 0.15)",
                    color: "#f0eeff",
                    border: "1px solid rgba(127, 119, 221, 0.3)",
                  }}
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Exclusão Individual */}
      <ConfirmDeleteModal
        isOpen={!!logToDelete}
        title="Excluir Histórico de Pesquisa"
        message={`Tem certeza que deseja excluir o histórico de "${logToDelete?.name || 'Lead'}"?`}
        count={1}
        loading={singleDeleteLoading}
        confirmText="Sim, Excluir"
        onConfirm={handleConfirmSingleDelete}
        onClose={() => setLogToDelete(null)}
      />

      {/* Modal de Exclusão em Massa */}
      <ConfirmDeleteModal
        isOpen={showBatchDeleteModal}
        title="Excluir Histórico em Massa"
        message={`Tem certeza que deseja excluir os ${selectedLogIds.length} registros selecionados do histórico?`}
        count={selectedLogIds.length}
        loading={batchDeleteLoading}
        confirmText={`Excluir ${selectedLogIds.length} Registros`}
        onConfirm={handleConfirmBatchDelete}
        onClose={() => setShowBatchDeleteModal(false)}
      />
    </div>
  );
}

