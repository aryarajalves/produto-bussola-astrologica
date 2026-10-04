"use client";

import React from "react";
import { IconDatabase, IconClock, IconCloud, IconCheckCircle } from "./BackupIcons";

interface BackupStatus {
  b2_connected: boolean;
  b2_bucket: string;
  b2_endpoint: string;
  b2_error?: string | null;
  last_backup_at?: string | null;
  last_backup_status: string;
  next_backup_at?: string | null;
  is_auto_active: boolean;
  frequency_hours: number;
  retention_current: number;
  retention_max: number;
  b2_folder: string;
}

interface BackupCardsProps {
  status: BackupStatus | null;
  loading: boolean;
}

export default function BackupCards({ status, loading }: BackupCardsProps) {
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Nenhum backup realizado";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Último Backup */}
      <div
        className="p-5 rounded-2xl flex flex-col justify-between shadow-xl transition-all hover:border-[#7F77DD]/40"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
            Último Backup
          </span>
          <div className="p-2 rounded-xl bg-[#7F77DD]/15 border border-[#7F77DD]/30 text-[#AFA9EC]">
            <IconCheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "#f0eeff" }}>
            {loading ? "Carregando..." : formatDate(status?.last_backup_at)}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.last_backup_status === "success"
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : status?.last_backup_status === "error"
                  ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  : "bg-gray-400"
              }`}
            />
            <span className="text-xs" style={{ color: "#8b87b8" }}>
              {status?.last_backup_status === "success"
                ? "Concluído com Sucesso"
                : status?.last_backup_status === "error"
                ? "Erro no último dump"
                : "Sem execuções recentes"}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Próximo Backup */}
      <div
        className="p-5 rounded-2xl flex flex-col justify-between shadow-xl transition-all hover:border-[#7F77DD]/40"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
            Próximo Backup
          </span>
          <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300">
            <IconClock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "#f0eeff" }}>
            {loading
              ? "Carregando..."
              : status?.is_auto_active
              ? formatDate(status?.next_backup_at)
              : "Desativado"}
          </p>
          <p className="text-xs mt-2.5" style={{ color: "#8b87b8" }}>
            {status?.is_auto_active
              ? `Frequência: a cada ${status?.frequency_hours} horas`
              : "Agendamento automático pausado"}
          </p>
        </div>
      </div>

      {/* Card 3: Retenção S3/B2 */}
      <div
        className="p-5 rounded-2xl flex flex-col justify-between shadow-xl transition-all hover:border-[#7F77DD]/40"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
            Retenção S3/B2
          </span>
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#EF9F27]">
            <IconDatabase className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "#f0eeff" }}>
            {loading ? "..." : `${status?.retention_current ?? 0} Dumps mantidos`}
          </p>
          <div className="mt-2.5 flex items-center justify-between text-xs" style={{ color: "#8b87b8" }}>
            <span>Limite configurado:</span>
            <span className="font-bold text-[#EF9F27]">Máx {status?.retention_max ?? 30}</span>
          </div>
        </div>
      </div>

      {/* Card 4: Status Backblaze B2 */}
      <div
        className="p-5 rounded-2xl flex flex-col justify-between shadow-xl transition-all hover:border-[#7F77DD]/40"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
            Status Backblaze B2
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <IconCloud className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status?.b2_connected
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse"
                  : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]"
              }`}
            />
            <p className="text-base font-bold" style={{ color: "#f0eeff" }}>
              {loading ? "Verificando..." : status?.b2_connected ? "Conectado" : "Desconectado"}
            </p>
          </div>
          <p className="text-xs mt-2.5 truncate" style={{ color: "#8b87b8" }} title={status?.b2_bucket}>
            Bucket: <span className="font-semibold text-[#AFA9EC]">{status?.b2_bucket || "zap-voice"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
