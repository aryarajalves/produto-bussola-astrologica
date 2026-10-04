"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  count: number;
  loading?: boolean;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  count,
  loading = false,
  confirmText,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const modalContent = (
    <div
      data-testid="confirm-delete-modal-backdrop"
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
        data-testid="confirm-delete-modal-panel"
        className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl border my-auto text-center"
        style={{
          background: "linear-gradient(180deg, #1d1838 0%, #130f26 100%)",
          borderColor: "rgba(244, 63, 94, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(244, 63, 94, 0.15)",
        }}
      >
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl border border-rose-500/30 bg-rose-500/10">
          🗑️
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold" style={{ color: "#f0eeff" }}>
            {title}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "#8b87b8" }}>
            {message}
          </p>
        </div>

        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-300 font-medium">
          ⚠️ Esta ação é irreversível e excluirá permanentemente <strong>{count}</strong> {count === 1 ? "item selecionado" : "itens selecionados"}.
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            data-testid="cancel-delete-btn"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-50"
            style={{ color: "#8b87b8", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            data-testid="confirm-delete-btn"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #e11d48, #9f1239)",
              color: "#ffffff",
            }}
          >
            {loading
              ? "Excluindo..."
              : confirmText || (count === 1 ? "Sim, Excluir" : "Sim, Excluir em Massa")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
