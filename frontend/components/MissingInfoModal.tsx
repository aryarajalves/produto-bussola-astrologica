"use client";

import React from "react";

export interface MissingClientData {
  id: string;
  name: string;
  missing_fields?: string[];
}

interface MissingInfoModalProps {
  client: MissingClientData | null;
  onClose: () => void;
  onGoToHome: () => void;
}

export default function MissingInfoModal({ client, onClose, onGoToHome }: MissingInfoModalProps) {
  if (!client) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 text-center space-y-5 shadow-2xl transition-all"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
          ⚠️
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-2">
            Informações Incompletas
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Estão faltando informações essenciais para calcular as coordenadas celestes e criar o Mapa Astral de <strong className="text-white">{client.name}</strong>.
          </p>
        </div>

        {client.missing_fields && client.missing_fields.length > 0 && (
          <div
            className="rounded-xl p-3 text-left space-y-1 text-xs"
            style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)" }}
          >
            <div className="font-semibold text-red-400">Campos obrigatórios ausentes:</div>
            <ul className="list-disc list-inside text-red-200 space-y-0.5">
              {client.missing_fields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-purple-300/80">
          Por favor, acesse a aba <strong>Home</strong> para preencher as suas informações de nascimento.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-xs transition-all text-zinc-400 hover:text-white border border-white/10"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToHome();
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all text-white shadow-lg hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #7F77DD, #3C3489)" }}
          >
            👉 Ir para a Home
          </button>
        </div>
      </div>
    </div>
  );
}
