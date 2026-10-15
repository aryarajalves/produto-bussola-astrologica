"use client";

/**
 * O "?" que explica uma coisa só, no lugar onde a dúvida nasce.
 *
 * Tutorial a pessoa vê uma vez e esquece. A dúvida real aparece três semanas
 * depois, olhando um selo que ela não lembra o que significa. Por isso a
 * explicação mora colada no elemento, e não numa página de ajuda que ninguém
 * abre.
 *
 * Regra de ouro deste componente: um "?" explica UMA coisa, em no máximo três
 * frases. Se precisar de mais que isso, o elemento está mal desenhado.
 */

import { useEffect, useRef, useState } from "react";

const C = {
  card: "#1a1535",
  primary: "#7F77DD",
  light: "#AFA9EC",
  gold: "#EF9F27",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.2)",
};

export default function Ajuda({
  titulo,
  children,
  alinhar = "esquerda",
}: {
  titulo: string;
  children: React.ReactNode;
  alinhar?: "esquerda" | "direita";
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc — o popover nunca prende a pessoa.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <span className="relative inline-flex" ref={caixa}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={`O que é: ${titulo}`}
        aria-expanded={aberto}
        className="inline-flex items-center justify-center rounded-full transition-all hover:opacity-100"
        style={{
          width: 18,
          height: 18,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          color: aberto ? "#120b24" : C.light,
          background: aberto ? C.gold : "transparent",
          border: `1px solid ${aberto ? C.gold : C.border}`,
          opacity: aberto ? 1 : 0.75,
        }}
      >
        ?
      </button>

      {aberto && (
        <span
          role="tooltip"
          className="absolute z-50 block w-[clamp(220px,78vw,340px)] p-4 rounded-xl text-left"
          style={{
            top: 26,
            [alinhar === "direita" ? "right" : "left"]: 0,
            background: "linear-gradient(135deg, #1e1746 0%, #140f30 100%)",
            border: `1px solid ${C.primary}55`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}
        >
          <span className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.gold }}>
            {titulo}
          </span>
          <span className="block text-[13px] leading-relaxed" style={{ color: C.text }}>
            {children}
          </span>
        </span>
      )}
    </span>
  );
}
