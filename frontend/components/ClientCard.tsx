"use client";

import React from "react";

export interface Client {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  birth_date?: string;
  birth_time?: string;
  birth_city?: string;
  birth_state?: string;
  birth_country?: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  status: string;
  has_all_info?: boolean;
  missing_fields?: string[];
  created_at?: string;
}

interface ClientCardProps {
  client: Client;
  generatingId: string | null;
  onOpenClient: (id: string) => void;
  onGenerateChart: (client: Client) => void;
}

export default function ClientCard({
  client: c,
  generatingId,
  onOpenClient,
  onGenerateChart,
}: ClientCardProps) {
  const isReady = c.status === "ready";
  const isIncomplete = c.has_all_info === false || (c.missing_fields && c.missing_fields.length > 0);

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 transition-all hover:border-purple-500/40"
      style={{
        background: "#1a1535",
        border: "1px solid rgba(127, 119, 221, 0.2)",
      }}
    >
      <div className="flex items-center gap-4 min-w-[200px]">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
          style={{
            background: isReady ? "rgba(52, 211, 153, 0.15)" : "rgba(127, 119, 221, 0.2)",
            border: `1px solid ${isReady ? "rgba(52, 211, 153, 0.4)" : "rgba(127, 119, 221, 0.3)"}`,
            color: isReady ? "#34d399" : "#AFA9EC",
          }}
        >
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "#f0eeff" }}>{c.name}</span>
            {isIncomplete && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ⚠️ Faltam dados
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: "#8b87b8" }}>
            {c.email && !c.email.endsWith("@bussola.local") ? c.email : "Lead cadastrado (sem email externo)"}
          </div>
          {(c.birth_date || c.birth_city || c.birth_state) && (
            <div className="text-[11px] pt-1" style={{ color: "#AFA9EC" }}>
              {c.birth_date && <span>Nasc: {c.birth_date} {c.birth_time || ""}</span>}
              {(c.birth_city || c.birth_state) && <span> • {c.birth_city ? `${c.birth_city}/` : ""}{c.birth_state || ""}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-medium" style={{ color: "#EF9F27" }}>
            {c.sun_sign || "Aguardando"}
          </div>
          <div className="text-[10px]" style={{ color: isReady ? "#34d399" : "#f59e0b" }}>
            {isReady ? "Pronto" : "Pendente"}
          </div>
        </div>

        {isReady ? (
          <button
            type="button"
            onClick={() => onOpenClient(c.id)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
            style={{
              background: "rgba(52, 211, 153, 0.15)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              color: "#34d399",
            }}
          >
            👁️ Ver Leitura
          </button>
        ) : (
          <button
            type="button"
            disabled={generatingId === c.id}
            onClick={() => onGenerateChart(c)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7F77DD, #3C3489)",
              color: "#ffffff",
              opacity: generatingId === c.id ? 0.7 : 1,
            }}
          >
            {generatingId === c.id ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Gerando...</span>
              </>
            ) : (
              <span>✨ Criar Mapa Astral</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
