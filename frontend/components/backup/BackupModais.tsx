"use client";

import React from "react";
import { IconAlertTriangle, IconRefresh, IconTrash } from "./BackupIcons";
import { BackupItem } from "./TabelaBackups";

interface DeleteBackupModalProps {
  item: BackupItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteBackupModal({
  item,
  loading,
  onClose,
  onConfirm,
}: DeleteBackupModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div
        className="rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(244, 63, 94, 0.4)",
          boxShadow: "0 0 35px rgba(244, 63, 94, 0.2)",
        }}
      >
        <div className="flex items-center gap-3 text-rose-400">
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30">
            <IconAlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base" style={{ color: "#f0eeff" }}>Confirmar Exclusão</h4>
            <p className="text-xs text-rose-400 font-medium">Esta ação é irreversível.</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#f0eeff" }}>
          Você está prestes a excluir permanentemente o arquivo{" "}
          <strong className="text-rose-300 font-mono">{item.filename}</strong> do bucket
          Backblaze B2.
        </p>
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f0eeff",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
          >
            {loading ? <IconRefresh className="w-3.5 h-3.5 animate-spin" /> : <IconTrash className="w-3.5 h-3.5" />}
            <span>Excluir Definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface RestoreBackupModalProps {
  item: BackupItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RestoreBackupModal({
  item,
  loading,
  onClose,
  onConfirm,
}: RestoreBackupModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div
        className="rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(239, 159, 39, 0.4)",
          boxShadow: "0 0 35px rgba(239, 159, 39, 0.2)",
        }}
      >
        <div className="flex items-center gap-3 text-amber-400">
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30">
            <IconAlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base" style={{ color: "#f0eeff" }}>Restaurar Banco de Dados</h4>
            <p className="text-xs text-[#EF9F27] font-medium">Atenção: Ação Crítica</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#f0eeff" }}>
          A restauração substituirá os dados atuais pelo dump selecionado:{" "}
          <strong className="text-[#EF9F27] font-mono">{item.filename}</strong>.
          Recomenda-se realizar um backup manual antes de prosseguir.
        </p>
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f0eeff",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-[#EF9F27] hover:bg-[#ffaa2b] text-[#1a1535] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            {loading ? <IconRefresh className="w-3.5 h-3.5 animate-spin" /> : <IconRefresh className="w-3.5 h-3.5" />}
            <span>Confirmar Restauração</span>
          </button>
        </div>
      </div>
    </div>
  );
}
