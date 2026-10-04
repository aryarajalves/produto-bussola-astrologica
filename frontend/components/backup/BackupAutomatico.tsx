"use client";

import React, { useState, useEffect } from "react";
import { IconCloud, IconCalendar, IconUploadCloud } from "./BackupIcons";
import BackupCards from "./BackupCards";
import TabelaBackups, { BackupItem } from "./TabelaBackups";
import AgendamentoBackup from "./AgendamentoBackup";
import ImportarBackup from "./ImportarBackup";

export default function BackupAutomatico() {
  const [activeTab, setActiveTab] = useState<"s3" | "agendamento" | "importar">("s3");
  const [status, setStatus] = useState<any>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${apiUrl}/admin/backups/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error("Erro ao buscar status:", e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchBackupsList = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch(`${apiUrl}/admin/backups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e) {
      console.error("Erro ao listar backups:", e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchAll = () => {
    fetchStatus();
    fetchBackupsList();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "#f0eeff" }}>
          🛡️ Backup Automático
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: "#8b87b8" }}>
          Gerencie backups manuais, automáticos e retenção de dados com armazenamento em nuvem no Backblaze B2.
        </p>
      </div>

      {/* 4 Cards de Métricas */}
      <BackupCards status={status} loading={loadingStatus} />

      {/* Navegação por Abas (Estilo Cósmico com Cores Vivas) */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3" style={{ borderColor: "rgba(127, 119, 221, 0.2)" }}>
        <button
          onClick={() => setActiveTab("s3")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === "s3"
              ? "shadow-lg shadow-[#7F77DD]/20"
              : "opacity-70 hover:opacity-100"
          }`}
          style={{
            background:
              activeTab === "s3"
                ? "linear-gradient(135deg, rgba(127, 119, 221, 0.35), rgba(60, 52, 137, 0.45))"
                : "rgba(255, 255, 255, 0.03)",
            color: activeTab === "s3" ? "#f0eeff" : "#8b87b8",
            border:
              activeTab === "s3"
                ? "1px solid rgba(127, 119, 221, 0.55)"
                : "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <IconCloud className="w-4 h-4" />
          <span>Backups no S3</span>
        </button>

        <button
          onClick={() => setActiveTab("agendamento")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === "agendamento"
              ? "shadow-lg shadow-[#7F77DD]/20"
              : "opacity-70 hover:opacity-100"
          }`}
          style={{
            background:
              activeTab === "agendamento"
                ? "linear-gradient(135deg, rgba(127, 119, 221, 0.35), rgba(60, 52, 137, 0.45))"
                : "rgba(255, 255, 255, 0.03)",
            color: activeTab === "agendamento" ? "#f0eeff" : "#8b87b8",
            border:
              activeTab === "agendamento"
                ? "1px solid rgba(127, 119, 221, 0.55)"
                : "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <IconCalendar className="w-4 h-4" />
          <span>Agendamento Automático</span>
        </button>

        <button
          onClick={() => setActiveTab("importar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === "importar"
              ? "shadow-lg shadow-[#7F77DD]/20"
              : "opacity-70 hover:opacity-100"
          }`}
          style={{
            background:
              activeTab === "importar"
                ? "linear-gradient(135deg, rgba(127, 119, 221, 0.35), rgba(60, 52, 137, 0.45))"
                : "rgba(255, 255, 255, 0.03)",
            color: activeTab === "importar" ? "#f0eeff" : "#8b87b8",
            border:
              activeTab === "importar"
                ? "1px solid rgba(127, 119, 221, 0.55)"
                : "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <IconUploadCloud className="w-4 h-4" />
          <span>Importar Backup Externo</span>
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === "s3" && (
        <TabelaBackups
          backups={backups}
          loading={loadingBackups}
          onRefresh={fetchAll}
        />
      )}

      {activeTab === "agendamento" && (
        <AgendamentoBackup onSaved={fetchAll} />
      )}

      {activeTab === "importar" && (
        <ImportarBackup
          onUploaded={() => {
            setActiveTab("s3");
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
