"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { C, type ClientDetail } from "@/types/admin";

export const SECTION_LABELS: Record<string, { title: string; icon: string; subtitle: string }> = {
  portal:          { title: "Portal",               icon: "♀",  subtitle: "Abertura" },
  essencia:        { title: "Essência",              icon: "☽",  subtitle: "Portal I" },
  ferida_e_dom:    { title: "A Ferida e o Dom",      icon: "⚷",  subtitle: "Portal II" },
  dons_esquecidos: { title: "Dons Esquecidos",       icon: "✦",  subtitle: "Portal III" },
  luz_e_sombra:    { title: "Luz e Sombra",          icon: "◑",  subtitle: "Portal IV" },
  reencontro:      { title: "O Reencontro",          icon: "𓂀", subtitle: "Portal V" },
  rituais:         { title: "Rituais de Integração", icon: "⊕",  subtitle: "Portal VI" },
  afirmagias:      { title: "Afirmagias",            icon: "☉",  subtitle: "Portal VII" },
  introducao:      { title: "Portal",               icon: "♀",  subtitle: "Abertura" },
  primeiro_portal: { title: "Essência",              icon: "☽",  subtitle: "Portal I" },
  segundo_portal:  { title: "A Ferida e o Dom",      icon: "⚷",  subtitle: "Portal II" },
  terceiro_portal: { title: "Dons Esquecidos",       icon: "✦",  subtitle: "Portal III" },
  quarto_portal:   { title: "Luz e Sombra",          icon: "◑",  subtitle: "Portal IV" },
  quinto_portal:   { title: "O Reencontro",          icon: "𓂀", subtitle: "Portal V" },
};

export const KEY_MIGRATION: Record<string, string> = {
  "introducao":      "portal",
  "primeiro_portal": "essencia",
  "segundo_portal":  "ferida_e_dom",
  "terceiro_portal": "dons_esquecidos",
  "quarto_portal":   "luz_e_sombra",
  "quinto_portal":   "reencontro",
};

export const SECTION_ORDER_FULL = [
  "portal", "essencia", "ferida_e_dom", "dons_esquecidos",
  "luz_e_sombra", "reencontro", "rituais", "afirmagias",
];

export default function ReadingModal({ client, onClose }: { client: ClientDetail; onClose: () => void }) {
  const contentByKey: Record<string, string> = {};
  client.sections.forEach(s => {
    const key = KEY_MIGRATION[s.section_key] ?? s.section_key;
    contentByKey[key] = s.content;
  });

  const allSections = SECTION_ORDER_FULL.map(key => ({
    section_key: key,
    content: contentByKey[key] ?? "",
  }));

  const [activeKey, setActiveKey] = useState(allSections[0].section_key);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const activeSection = allSections.find(s => s.section_key === activeKey)!;

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

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/90" onClick={onClose} />
      <div
        className="fixed inset-0 z-[90] flex flex-col"
        style={{ background: "#0a0718" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: C.light }}>
              Leitura Completa — {client.name}
            </h2>
            <p className="text-xs" style={{ color: C.muted }}>
              ☀️ {client.sun_sign} · 🌙 {client.moon_sign} · ⬆️ {client.rising_sign}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
                color: C.text,
                boxShadow: `0 0 12px rgba(127,119,221,0.35)`,
              }}
            >
              {pdfLoading ? "⏳" : "📥"} {pdfLoading ? "Gerando..." : "Baixar PDF"}
            </button>
            <button
              onClick={onClose}
              className="text-2xl w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
              style={{ color: C.muted }}
            >✕</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de navegação */}
          <div className="flex-shrink-0 overflow-y-auto py-4"
            style={{ width: 220, borderRight: `1px solid ${C.border}`, background: C.card }}>
            {client.chart?.svg_content && (
              <div className="px-4 pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <p className="text-xs mb-2 font-medium uppercase tracking-widest" style={{ color: C.muted }}>
                  Mapa Natal
                </p>
                <div
                  className="cursor-pointer rounded-xl overflow-hidden hover:opacity-80 transition-all"
                  style={{ border: `1px solid ${C.border}` }}
                  onClick={() => setShowChart(true)}
                  dangerouslySetInnerHTML={{ __html: client.chart!.svg_content }}
                />
                <p className="text-xs mt-1 text-center" style={{ color: C.muted }}>
                  Clique para expandir
                </p>
              </div>
            )}
            {allSections.map(s => {
              const lbl = SECTION_LABELS[s.section_key] || { title: s.section_key, icon: "•" };
              const isActive = s.section_key === activeKey;
              const isEmpty = !s.content;
              return (
                <button
                  key={s.section_key}
                  onClick={() => setActiveKey(s.section_key)}
                  className="w-full text-left px-5 py-3 flex items-center gap-3 transition-all"
                  style={{
                    background: isActive ? `${C.primary}22` : "transparent",
                    borderLeft: isActive ? `3px solid ${C.primary}` : "3px solid transparent",
                    color: isActive ? C.light : isEmpty ? `${C.muted}88` : C.muted,
                    opacity: isEmpty && !isActive ? 0.55 : 1,
                  }}
                >
                  <span className="text-lg">{lbl.icon}</span>
                  <span className="text-sm font-medium">{lbl.title}</span>
                  {isEmpty && <span className="ml-auto text-xs opacity-60">•</span>}
                </button>
              );
            })}
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const lbl = SECTION_LABELS[activeSection.section_key] || { title: activeSection.section_key, icon: "•" };
              return (
                <div className="max-w-3xl mx-auto px-10 py-10">
                  <div className="mb-8 pb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">{lbl.icon}</span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: C.primary }}>
                          {SECTION_LABELS[activeSection.section_key]?.subtitle || "Portal"}
                        </p>
                        <h1 className="text-3xl font-bold" style={{ color: C.light }}>{lbl.title}</h1>
                      </div>
                    </div>
                  </div>

                  {activeSection.section_key === "portal" && client.chart?.svg_content && (
                    <div className="mb-10">
                      <div
                        className="rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-all mx-auto"
                        style={{
                          border: `1px solid ${C.border}`,
                          maxWidth: 420,
                          background: "#0a0718",
                          boxShadow: `0 0 40px rgba(127,119,221,0.15)`,
                        }}
                        onClick={() => setShowChart(true)}
                        dangerouslySetInnerHTML={{ __html: client.chart!.svg_content }}
                      />
                      <p className="text-xs text-center mt-2" style={{ color: C.muted }}>
                        Mapa Natal · Clique para expandir
                      </p>
                    </div>
                  )}

                  {activeSection.content ? (
                    <div className="space-y-4">
                      {activeSection.content.split(/\n\n+/).map((para, i) => (
                        para.trim() ? (
                          <p
                            key={i}
                            className="text-base leading-relaxed"
                            style={{ color: para.startsWith("#") || para.startsWith("**") ? C.light : "#c8c0f0" }}
                          >
                            {para.replace(/\*\*/g, "").replace(/^#+\s*/gm, "")}
                          </p>
                        ) : null
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <span className="text-6xl mb-5 opacity-40">{lbl.icon}</span>
                      <p className="text-lg font-semibold mb-2" style={{ color: C.light }}>
                        Seção em breve
                      </p>
                      <p className="text-sm max-w-xs" style={{ color: C.muted }}>
                        Esta seção será incluída nas próximas gerações do mapa.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer: navegação entre seções */}
        <div className="flex items-center justify-between px-8 py-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${C.border}`, background: C.card }}>
          {(() => {
            const idx = allSections.findIndex(s => s.section_key === activeKey);
            const prev = allSections[idx - 1];
            const next = allSections[idx + 1];
            return (
              <>
                <button
                  onClick={() => prev && setActiveKey(prev.section_key)}
                  disabled={!prev}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all disabled:opacity-30"
                  style={{ background: C.dark, color: C.light }}
                >
                  ← {prev ? (SECTION_LABELS[prev.section_key]?.title || prev.section_key) : ""}
                </button>
                <span className="text-xs" style={{ color: C.muted }}>
                  {idx + 1} / {allSections.length}
                </span>
                <button
                  onClick={() => next && setActiveKey(next.section_key)}
                  disabled={!next}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all disabled:opacity-30"
                  style={{ background: C.dark, color: C.light }}
                >
                  {next ? (SECTION_LABELS[next.section_key]?.title || next.section_key) : ""} →
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}
