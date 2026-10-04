"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { C, type ClientDetail } from "@/types/admin";

interface ClientDrawerEmailEditProps {
  client: ClientDetail;
}

export default function ClientDrawerEmailEdit({ client }: ClientDrawerEmailEditProps) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(client.email);
  const [emailSaveLoading, setEmailSaveLoading] = useState(false);
  const [emailSaveResult, setEmailSaveResult] = useState<{
    password: string;
    email_sent: boolean;
  } | null>(null);

  const saveEmail = async () => {
    if (!emailInput.trim() || emailInput === client.email) {
      setEditingEmail(false);
      return;
    }
    if (!emailInput.includes("@")) {
      alert("Email inválido.");
      return;
    }
    setEmailSaveLoading(true);
    setEmailSaveResult(null);
    try {
      const res = await api.patch<{ message: string; email_sent: boolean; password: string }>(
        `/admin/clients/${client.id}/email`,
        { email: emailInput.trim() }
      );
      client.email = emailInput.trim();
      setEmailSaveResult({ password: res.password, email_sent: res.email_sent });
      setEditingEmail(false);
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : "Tente novamente."}`);
    } finally {
      setEmailSaveLoading(false);
    }
  };

  return (
    <div className="rounded-xl p-4" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: C.light }}>Email de acesso</h3>
        {!editingEmail ? (
          <button
            onClick={() => {
              setEditingEmail(true);
              setEmailInput(client.email);
              setEmailSaveResult(null);
            }}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: C.card, color: C.light, border: `1px solid ${C.border}` }}
          >
            ✏️ Editar
          </button>
        ) : (
          <button
            onClick={() => setEditingEmail(false)}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}` }}
          >
            Cancelar
          </button>
        )}
      </div>

      {!editingEmail ? (
        <p className="text-sm" style={{ color: C.muted }}>✉️ {client.email}</p>
      ) : (
        <div className="space-y-3">
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="Novo email..."
            style={{
              background: C.card,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 12px",
              width: "100%",
              outline: "none",
            }}
          />
          <button
            onClick={saveEmail}
            disabled={emailSaveLoading}
            className="w-full py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: C.gold, color: "#1a1535" }}
          >
            {emailSaveLoading ? "⏳ Salvando..." : "Salvar e reenviar acesso"}
          </button>
        </div>
      )}

      {emailSaveResult && (
        <div className="mt-3 p-3 rounded-xl text-xs space-y-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {emailSaveResult.email_sent ? (
            <p style={{ color: "#34d399" }}>✅ Email atualizado e reenvio realizado com sucesso!</p>
          ) : (
            <p style={{ color: "#f59e0b" }}>⚠️ Email atualizado, mas o reenvio falhou. Anote a senha e envie manualmente.</p>
          )}
          <p className="font-mono mt-1" style={{ color: C.text }}>Senha gerada: <strong>{emailSaveResult.password}</strong></p>
          <p style={{ color: C.muted }}>Email: {client.email}</p>
        </div>
      )}
    </div>
  );
}
