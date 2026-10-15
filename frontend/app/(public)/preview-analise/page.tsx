"use client";

// ⚠️ PÁGINA TEMPORÁRIA — só para você ver a tela da Análise do Dia sem precisar
// do Postgres rodando. Os dados abaixo são de EXEMPLO (cálculo real do dia
// 06/10/2026 para um mapa de teste), não vêm do banco e não vêm da IA.
// APAGAR esta pasta antes de commitar.

import { useEffect, useState } from "react";
import AnaliseDoDia from "@/components/AnaliseDoDia";

const EXEMPLO = {
  id: "preview",
  data: "2026-10-06",
  status: "ok",
  hora_de_nascimento_conhecida: true,
  sintese:
    "O dia junta duas coisas que costumam brigar: você querendo resolver sozinho e um assunto que só anda com outra pessoa dentro. É comum que isso apareça como pressa, e a pressa aqui atrapalha. A conversa que você vem empurrando com a barriga cabe em dez minutos e destrava o resto da semana. Marque antes do fim do dia, mesmo que seja só para dizer que quer falar.",
  svg:
    '<svg viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="400" height="400" fill="#0f0b1e"/>' +
    '<circle cx="200" cy="200" r="180" fill="none" stroke="#7F77DD" stroke-width="1.5"/>' +
    '<circle cx="200" cy="200" r="140" fill="none" stroke="#3C3489" stroke-width="1"/>' +
    '<circle cx="200" cy="200" r="90" fill="none" stroke="#EF9F27" stroke-width="1.5"/>' +
    '<text x="200" y="196" fill="#8b87b8" font-size="13" text-anchor="middle">desenho de exemplo</text>' +
    '<text x="200" y="216" fill="#8b87b8" font-size="11" text-anchor="middle">a roda real vem do Kerykeion</text>' +
    "</svg>",
  posicoes: [
    { planeta: "Moon", planeta_pt: "Lua", casa: 5, signo: "Leão", retrogrado: false, ate: "2026-10-07", texto: "O sentimento pede saída criativa. Fazer algo por gosto resolve mais do que conversar sobre o que você está sentindo. Namoro e brincadeira entram no humor do dia." },
    { planeta: "Sun", planeta_pt: "Sol", casa: 6, signo: "Libra", retrogrado: false, ate: "2026-10-08", texto: "A rotina e o corpo entram em foco. Não é hora de plano grande, é de ajustar o detalhe que trava o resto: o horário, o método, o exame que você vem empurrando." },
    { planeta: "Mercury", planeta_pt: "Mercúrio", casa: 7, signo: "Escorpião", retrogrado: false, ate: "2026-10-13", texto: "A cabeça está na outra pessoa: o que combinar, o que alinhar, o que ficou no ar. É a hora de definir em palavras o que vinha sendo suposto." },
    { planeta: "Venus", planeta_pt: "Vênus", casa: 7, signo: "Escorpião", retrogrado: true, ate: null, texto: "Facilita o encontro com o outro. Acordo sai, conversa difícil fica menos difícil, e vínculo se reata. Use para alinhar expectativa, não só para agradar." },
    { planeta: "Mars", planeta_pt: "Marte", casa: 4, signo: "Leão", retrogrado: false, ate: "2026-10-28", texto: "O atrito está em casa. Assunto antigo com família sobe fácil. Dá para resolver, mas escolha o momento: no meio do nervoso não sai acordo, sai briga." },
  ],
};

const HISTORICO = [
  { id: "h1", data: "2026-10-06", status: "ok", tem_sintese: true },
  { id: "h2", data: "2026-09-30", status: "ok", tem_sintese: true },
  { id: "h3", data: "2026-09-21", status: "ok", tem_sintese: true },
];

export default function PreviewAnalise() {
  const [pronto, setPronto] = useState(false);

  // Intercepta o fetch para a tela funcionar sem backend.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = (async (url: string) => {
      const corpo = String(url).includes("/members/analises") ? HISTORICO : EXEMPLO;
      await new Promise((r) => setTimeout(r, 400)); // para você ver o "Lendo o céu..."
      return new Response(JSON.stringify(corpo), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof window.fetch;
    setPronto(true);
    return () => { window.fetch = original; };
  }, []);

  if (!pronto) return null;

  return (
    <div style={{ background: "#0f0b1e", minHeight: "100vh", paddingBottom: 48 }}>
      <div
        style={{
          background: "#3C3489",
          color: "#f0eeff",
          fontSize: 13,
          padding: "10px 24px",
          textAlign: "center",
        }}
      >
        Pré-visualização com dados de exemplo — sem banco e sem IA. Apagar antes de commitar.
      </div>
      <AnaliseDoDia nome="Jordão Silva" />
    </div>
  );
}
