"use client";

import React, { useState, useEffect } from "react";
import {
  IconClock,
  IconFolder,
  IconDatabase,
  IconSave,
  IconShieldCheck,
  IconRefresh,
} from "./BackupIcons";
import { toast } from "@/components/Toast";

interface BackupConfigData {
  is_active: boolean;
  frequency_hours: number;
  b2_folder: string;
  retention_max: number;
  last_backup_at?: string | null;
  next_backup_at?: string | null;
}

interface AgendamentoBackupProps {
  onSaved: () => void;
}

export default function AgendamentoBackup({ onSaved }: AgendamentoBackupProps) {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [frequencyHours, setFrequencyHours] = useState<number>(6);
  const [b2Folder, setB2Folder] = useState<string>("AreaDeMembros/backups/");
  const [retentionMax, setRetentionMax] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/backups/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: BackupConfigData = await res.json();
        setIsActive(data.is_active);
        setFrequencyHours(data.frequency_hours);
        setB2Folder(data.b2_folder);
        setRetentionMax(data.retention_max);
      }
    } catch (e) {
      console.error("Erro ao carregar configurações de backup:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/admin/backups/config`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: isActive,
          frequency_hours: Number(frequencyHours),
          b2_folder: b2Folder.trim(),
          retention_max: Number(retentionMax),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao salvar preferências");
      }

      toast.success("Configurações de agendamento salvas com sucesso!");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Falha ao salvar preferências de backup.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl p-12 text-center shadow-xl"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
          color: "#8b87b8",
        }}
      >
        <IconRefresh className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7F77DD]" />
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form
        onSubmit={handleSave}
        className="rounded-2xl p-6 sm:p-8 shadow-xl space-y-6"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.25)",
        }}
      >
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
            <span className="p-2 rounded-xl bg-[#7F77DD]/20 text-[#AFA9EC] border border-[#7F77DD]/30">
              <IconClock className="w-4 h-4" />
            </span>
            Parâmetros do Agendador Automático
          </h3>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#8b87b8" }}>
            Configure a rotina periódica de sincronização do banco com o Backblaze B2.
          </p>
        </div>

        {/* Ativar/Desativar Switch */}
        <div
          className="flex items-center justify-between p-4 rounded-xl border"
          style={{
            background: "rgba(127, 119, 221, 0.06)",
            borderColor: "rgba(127, 119, 221, 0.2)",
          }}
        >
          <div className="space-y-0.5">
            <span className="text-sm font-semibold" style={{ color: "#f0eeff" }}>
              Ativar Backup Automático
            </span>
            <p className="text-xs" style={{ color: "#8b87b8" }}>
              Quando habilitado, o sistema executa dumps recorrentes na frequência definida.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isActive ? "bg-[#7F77DD] shadow-[0_0_12px_rgba(127,119,221,0.6)]" : "bg-white/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frequência */}
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#AFA9EC" }}>
              <IconClock className="w-3.5 h-3.5 text-[#7F77DD]" />
              Frequência de Execução
            </label>
            <select
              value={frequencyHours}
              onChange={(e) => setFrequencyHours(Number(e.target.value))}
              disabled={!isActive}
              className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer transition-all disabled:opacity-40"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.3)",
                color: "#f0eeff",
              }}
            >
              <option value={6} style={{ background: "#1a1535", color: "#f0eeff" }}>A cada 6 horas (Recomendado)</option>
              <option value={12} style={{ background: "#1a1535", color: "#f0eeff" }}>A cada 12 horas</option>
              <option value={24} style={{ background: "#1a1535", color: "#f0eeff" }}>A cada 24 horas (Diário)</option>
              <option value={48} style={{ background: "#1a1535", color: "#f0eeff" }}>A cada 48 horas (A cada 2 dias)</option>
              <option value={168} style={{ background: "#1a1535", color: "#f0eeff" }}>A cada 7 dias (Semanal)</option>
            </select>
            <p className="text-[11px]" style={{ color: "#8b87b8" }}>
              O agendador criará backups de forma autônoma nesse intervalo.
            </p>
          </div>

          {/* Limite de Retenção */}
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#AFA9EC" }}>
              <IconDatabase className="w-3.5 h-3.5 text-[#EF9F27]" />
              Limite de Retenção (Máximo de Dumps)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={retentionMax}
              onChange={(e) => setRetentionMax(Number(e.target.value))}
              className="w-full rounded-xl px-3.5 py-2 text-xs outline-none transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.3)",
                color: "#f0eeff",
              }}
            />
            <p className="text-[11px]" style={{ color: "#8b87b8" }}>
              Backups antigos que ultrapassarem este limite serão descartados do bucket.
            </p>
          </div>
        </div>

        {/* Pasta de Destino no B2 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#AFA9EC" }}>
            <IconFolder className="w-3.5 h-3.5 text-[#7F77DD]" />
            Pasta de Destino no Backblaze B2
          </label>
          <input
            type="text"
            value={b2Folder}
            onChange={(e) => setB2Folder(e.target.value)}
            placeholder="Ex: AreaDeMembros/backups/"
            className="w-full rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#f0eeff",
            }}
          />
          <p className="text-[11px]" style={{ color: "#8b87b8" }}>
            Prefixo onde os arquivos <code className="text-[#AFA9EC] font-bold">.dump.gz</code> serão gravados no bucket.
          </p>
        </div>

        {/* Card Informativo */}
        <div
          className="p-4 rounded-xl border flex items-start gap-3"
          style={{
            background: "rgba(127, 119, 221, 0.08)",
            borderColor: "rgba(127, 119, 221, 0.25)",
          }}
        >
          <span className="text-[#AFA9EC] shrink-0 mt-0.5">
            <IconShieldCheck className="w-5 h-5" />
          </span>
          <div className="text-xs space-y-1">
            <p className="font-bold" style={{ color: "#f0eeff" }}>Garantia de Integridade e Isolamento</p>
            <p className="leading-relaxed" style={{ color: "#8b87b8" }}>
              Todos os dumps gerados são criptografados em trânsito e em repouso nos servidores do Backblaze B2,
              permitindo recuperação rápida contra falhas de infraestrutura.
            </p>
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 cursor-pointer shadow-lg"
            style={{
              background: "linear-gradient(135deg, #7F77DD, #534ab3)",
              color: "#ffffff",
              boxShadow: "0 0 20px rgba(127, 119, 221, 0.4)",
            }}
          >
            {saving ? (
              <>
                <IconRefresh className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <IconSave className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
