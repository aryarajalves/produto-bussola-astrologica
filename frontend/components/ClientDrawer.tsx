"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { C, type ClientDetail } from "@/types/admin";
import ReadingModal, { SECTION_LABELS, KEY_MIGRATION, SECTION_ORDER_FULL } from "./ReadingModal";
import ClientBirthEdit from "./ClientBirthEdit";
import ClientDrawerEmailEdit from "./ClientDrawerEmailEdit";

interface ClientDrawerProps {
  client: ClientDetail;
  onClose: () => void;
  onStatusChange: (id: string, s: string) => void;
  onDelete: (id: string) => void;
}

export default function ClientDrawer({
  client,
  onClose,
  onStatusChange,
  onDelete,
}: ClientDrawerProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [svgModal, setSvgModal] = useState(false);
  const [readingModal, setReadingModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendResult, setResendResult] = useState<{ password: string; email: string } | null>(null);
  const [localSections, setLocalSections] = useState(client.sections);

  const migratedKeys = new Set(
    localSections.map(s => KEY_MIGRATION[s.section_key] ?? s.section_key)
  );
  const missingSections = SECTION_ORDER_FULL.filter(k => !migratedKeys.has(k));
  const needsCompletion = missingSections.length > 0 && localSections.length > 0;

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const blob = await api.download(`/admin/clients/${client.id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mapa-${client.name.toLowerCase().replace(/ /g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert(`Erro ao baixar o PDF: ${e instanceof Error ? e.message : "Tente novamente."}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const completeSections = async () => {
    if (
      !confirm(
        `Gerar as seções faltantes para ${client.name}?\n\n` +
          `Seções que serão adicionadas: ${missingSections.join(", ")}\n\n` +
          `Este processo pode levar 1-2 minutos.`
      )
    )
      return;
    setCompleteLoading(true);
    try {
      const result = await api.post<{ added: string[]; sections: typeof client.sections }>(
        `/admin/clients/${client.id}/complete-sections`,
        {}
      );
      if (result.sections) setLocalSections(result.sections);
      alert(`✅ Seções adicionadas: ${result.added.join(", ") || "nenhuma nova."}`);
    } catch (e: unknown) {
      alert(`Erro ao completar: ${e instanceof Error ? e.message : "Tente novamente."}`);
    } finally {
      setCompleteLoading(false);
    }
  };

  const resendAccess = async () => {
    if (!confirm(`Gerar nova senha e reenviar acesso para ${client.name} (${client.email})?`)) return;
    setResendLoading(true);
    setResendResult(null);
    try {
      const res = await api.post<{ new_password: string; email: string; email_sent: boolean }>(
        `/admin/clients/${client.id}/resend-access`,
        {}
      );
      setResendResult({ password: res.new_password, email: res.email });
    } catch (e: unknown) {
      alert(`Erro ao reenviar acesso: ${e instanceof Error ? e.message : "Tente novamente."}`);
    } finally {
      setResendLoading(false);
    }
  };

  const deleteClient = async () => {
    if (
      !confirm(
        `⚠️ Apagar ${client.name} permanentemente?\n\n` +
          `Isso vai remover o usuário, o mapa e todas as seções. Essa ação não pode ser desfeita.`
      )
    )
      return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/clients/${client.id}`);
      onDelete(client.id);
      onClose();
    } catch (e: unknown) {
      alert(`Erro ao apagar: ${e instanceof Error ? e.message : "Tente novamente."}`);
      setDeleteLoading(false);
    }
  };

  const drawerContent: Record<string, string> = {};
  localSections.forEach(s => {
    const key = KEY_MIGRATION[s.section_key] ?? s.section_key;
    drawerContent[key] = s.content;
  });
  const drawerSections = SECTION_ORDER_FULL.map(key => ({
    section_key: key,
    content: drawerContent[key] ?? "",
  }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 overflow-y-auto"
        style={{ width: 480, background: C.card, borderLeft: `1px solid ${C.border}` }}
      >
        <div className="p-6 border-b" style={{ borderColor: C.border }}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold" style={{ color: C.light }}>{client.name}</h2>
              <p className="text-sm" style={{ color: C.muted }}>{client.email}</p>
            </div>
            <button onClick={onClose} style={{ color: C.muted }}>✕</button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {[client.sun_sign, client.moon_sign, client.rising_sign].filter(Boolean).map((s, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ background: C.dark, color: C.light }}>
                {["☀️", "🌙", "⬆️"][i]} {s}
              </span>
            ))}
          </div>

          {/* Custo de Criação OpenAI */}
          {(() => {
            const clientCost = client.openai_cost || (client.chart as any)?.openai_cost || (client.chart?.chart_data as any)?.openai_cost;
            if (!clientCost) return null;
            return (
              <div
                className="mt-3 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap"
                style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)" }}
              >
                <div>
                  <p className="text-xs font-semibold text-emerald-400">💰 Custo de Criação (OpenAI)</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-sm font-bold font-mono text-emerald-300">
                      {clientCost.cost_formatted_usd || `$${(clientCost.cost_usd || 0).toFixed(4)}`} USD
                    </span>
                    <span className="text-xs text-emerald-400/80 font-mono">
                      ({clientCost.cost_formatted_brl || `R$ ${(clientCost.cost_brl || 0).toFixed(4)}`})
                    </span>
                  </div>
                </div>
                {clientCost.total_tokens ? (
                  <div className="text-right">
                    <span className="text-xs font-mono text-purple-300">
                      ⚡ {clientCost.total_tokens.toLocaleString()} tokens
                    </span>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {clientCost.model || "gpt-5.6-sol"}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {needsCompletion && (
            <div
              className="mt-3 rounded-xl p-3 flex items-center justify-between gap-3"
              style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}55` }}
            >
              <div>
                <p className="text-xs font-semibold" style={{ color: C.gold }}>✨ Mapa incompleto</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>Faltam: {missingSections.join(", ")}</p>
              </div>
              <button
                onClick={completeSections}
                disabled={completeLoading}
                className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: C.gold, color: "#1a1535" }}
              >
                {completeLoading ? "⏳ Gerando..." : "Completar Mapa"}
              </button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Email editável */}
          <ClientDrawerEmailEdit client={client} />

          {/* Dados de nascimento editáveis */}
          <ClientBirthEdit client={client} />

          {/* Respostas do formulário */}
          {[
            ["O que está acontecendo na sua vida agora?", client.form_vida_agora],
            ["Se você pudesse mudar uma coisa hoje?", client.form_carrega_tempo],
            ["O que espera descobrir?", client.form_espera_descobrir],
          ].filter(([, v]) => v).map(([q, a]) => (
            <div key={q} className="rounded-xl p-4" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-medium mb-1" style={{ color: C.primary }}>{q}</p>
              <p className="text-sm" style={{ color: C.text }}>{a}</p>
            </div>
          ))}

          {/* SVG miniatura */}
          {client.chart?.svg_content && (
            <div>
              <h3 className="font-semibold mb-3" style={{ color: C.light }}>Mapa Natal</h3>
              <div
                className="cursor-pointer rounded-xl overflow-hidden"
                style={{ border: `1px solid ${C.border}`, maxHeight: 200, overflow: "hidden" }}
                onClick={() => setSvgModal(true)}
                dangerouslySetInnerHTML={{ __html: client.chart.svg_content }}
              />
              <p className="text-xs mt-1 text-center" style={{ color: C.muted }}>Clique para expandir</p>
            </div>
          )}

          {/* Seções — accordion + botão ler completo */}
          {localSections.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold" style={{ color: C.light }}>Seções da leitura</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: C.dark, color: C.light, border: `1px solid ${C.border}` }}
                  >
                    {pdfLoading ? "⏳" : "📥"} {pdfLoading ? "..." : "PDF"}
                  </button>
                  <button
                    onClick={() => setReadingModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
                      color: C.text,
                      boxShadow: `0 0 16px rgba(127,119,221,0.4)`,
                    }}
                  >
                    📖 Ler Completo
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {drawerSections.map(s => {
                  const lbl = SECTION_LABELS[s.section_key] || { title: s.section_key, icon: "•" };
                  const isEmpty = !s.content;
                  return (
                    <div
                      key={s.section_key}
                      className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${C.border}`, opacity: isEmpty ? 0.55 : 1 }}
                    >
                      <button
                        className="w-full text-left px-4 py-3 flex justify-between items-center gap-3"
                        style={{ background: open === s.section_key ? C.dark : C.bg, color: C.light }}
                        onClick={() => !isEmpty && setOpen(open === s.section_key ? null : s.section_key)}
                        disabled={isEmpty}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span>{lbl.icon}</span>
                          <span>{lbl.title}</span>
                          {isEmpty && <span className="text-xs font-normal" style={{ color: C.muted }}>(em breve)</span>}
                        </span>
                        {!isEmpty && (
                          <span className="text-xs" style={{ color: C.muted }}>{open === s.section_key ? "▲" : "▼"}</span>
                        )}
                      </button>
                      {open === s.section_key && !isEmpty && (
                        <div className="px-4 py-4" style={{ background: C.bg, maxHeight: 320, overflowY: "auto" }}>
                          {s.content.split(/\n\n+/).map((para, i) =>
                            para.trim() ? (
                              <p key={i} className="text-sm leading-relaxed mb-3" style={{ color: "#c8c0f0" }}>
                                {para.replace(/\*\*/g, "").replace(/^#+\s*/gm, "")}
                              </p>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status de Email */}
          <div className="rounded-xl p-4" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <p className="text-xs font-semibold mb-2" style={{ color: C.muted }}>STATUS DO EMAIL</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {client.email_status === "sent" ? "✅" : client.email_status === "failed" ? "❌" : "⚪"}
                </span>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color:
                        client.email_status === "sent" ? "#34d399" : client.email_status === "failed" ? "#f87171" : C.muted,
                    }}
                  >
                    {client.email_status === "sent"
                      ? "Email entregue"
                      : client.email_status === "failed"
                      ? "Falha no envio"
                      : "Email não enviado"}
                  </p>
                  {client.email_sent_at && (
                    <p className="text-xs" style={{ color: C.muted }}>
                      {new Date(client.email_sent_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reenviar Acesso */}
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={resendAccess}
                disabled={resendLoading}
                className="w-full py-3 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #1a3a2a, #0f2a1e)",
                  color: "#4ade80",
                  border: "1px solid #4ade8044",
                }}
              >
                {resendLoading ? "⏳ Gerando..." : "📧 Reenviar Email"}
              </button>

              <button
                onClick={async () => {
                  let phone = (client.whatsapp || "").replace(/\D/g, "");
                  if (!phone) {
                    const typed = prompt(`Digite o número do WhatsApp de ${client.name} com DDD (ex: 11999999999):`);
                    if (!typed) return;
                    phone = typed.replace(/\D/g, "");
                  }

                  let pass = resendResult?.password;
                  if (!pass) {
                    try {
                      setResendLoading(true);
                      const res = await api.post<{ new_password: string; email: string; email_sent: boolean }>(
                        `/admin/clients/${client.id}/resend-access`,
                        {}
                      );
                      pass = res.new_password;
                      setResendResult({ password: res.new_password, email: res.email });
                    } catch {
                      pass = "sirius123";
                    } finally {
                      setResendLoading(false);
                    }
                  }

                  const text = `✨ Olá, ${client.name}! Aqui é a Andrieli Oliver da Bussola Astrologica.\n\nSeu Mapa da Alma está pronto! 🔮\n\n🔐 Seus dados de acesso:\n• Link: https://academysirius.online/login\n• E-mail: ${client.email}\n• Senha: ${pass}\n\nAcesse agora para ler a sua carta sagrada! 🌟`;
                  const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;
                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
                }}
                disabled={resendLoading}
                className="w-full py-3 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #153322, #0d2618)",
                  color: "#25D366",
                  border: "1px solid #25D36644",
                }}
              >
                {resendLoading ? "⏳ Gerando senha..." : "💬 Enviar via WhatsApp"}
              </button>
            </div>

            {resendResult && (
              <div className="mt-3 p-4 rounded-xl" style={{ background: "#0a1f0f", border: "1px solid #4ade8055" }}>
                <p className="text-xs mb-2 font-semibold" style={{ color: "#4ade80" }}>
                  ✅ Email enviado para {resendResult.email}
                </p>
                <p className="text-xs mb-1" style={{ color: C.muted }}>Nova senha (copie agora):</p>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 px-3 py-2 rounded-lg text-base font-bold tracking-widest"
                    style={{ background: "#0f0b1e", color: C.gold, border: `1px solid ${C.border}` }}
                  >
                    {resendResult.password}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(resendResult.password)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{ background: C.dark, color: C.light, border: `1px solid ${C.border}` }}
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: C.muted }}>
                  ⚠️ Esta senha não será exibida novamente.
                </p>
              </div>
            )}
          </div>

          {/* Status + Apagar */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onStatusChange(client.id, client.chart?.status === "ready" ? "pending" : "ready")}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: C.dark, color: C.light, border: `1px solid ${C.border}` }}
            >
              {client.chart?.status === "ready" ? "Marcar como Pendente" : "Marcar como Pronto"}
            </button>
            <button
              onClick={deleteClient}
              disabled={deleteLoading}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: "#3f0f0f", color: "#ff8080", border: "1px solid #ff404066" }}
              title="Apagar cliente permanentemente"
            >
              {deleteLoading ? "⏳" : "🗑️"}
            </button>
          </div>
        </div>
      </div>

      {svgModal && client.chart?.svg_content && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/80" onClick={() => setSvgModal(false)} />
          <div className="fixed inset-4 z-[70] overflow-auto rounded-2xl" style={{ background: C.card }}>
            <button className="absolute top-4 right-4 text-2xl" style={{ color: C.muted }} onClick={() => setSvgModal(false)}>✕</button>
            <div dangerouslySetInnerHTML={{ __html: client.chart.svg_content }} />
          </div>
        </>
      )}

      {readingModal && (
        <ReadingModal
          client={{ ...client, sections: localSections }}
          onClose={() => setReadingModal(false)}
        />
      )}
    </>
  );
}
