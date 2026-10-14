"use client";

/**
 * O resultado de uma leitura de trânsitos, desenhado.
 */

import { useState } from "react";
import Ajuda from "@/components/Ajuda";

const C = {
  card: "#1a1535",
  primary: "#7F77DD",
  light: "#AFA9EC",
  dark: "#3C3489",
  gold: "#EF9F27",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.2)",
};

const ICONE: Record<string, string> = {
  Moon: "☽", Sun: "☉", Mercury: "☿", Venus: "♀", Mars: "♂",
};

const AULA_BUSSOLA: Record<string, { titulo: string; tab: string }> = {
  Moon: { titulo: "Aula da Lua", tab: "essencia" },
  Sun: { titulo: "Aula do Sol", tab: "essencia" },
  Mercury: { titulo: "Aula de Mercúrio", tab: "dons_esquecidos" },
  Venus: { titulo: "Aula de Vênus", tab: "ferida_e_dom" },
  Mars: { titulo: "Aula de Marte", tab: "luz_e_sombra" },
};

const AREA_DA_CASA: Record<number, string> = {
  1: "você mesmo",
  2: "dinheiro e valor",
  3: "conversas do dia",
  4: "casa e família",
  5: "criar e se expor",
  6: "rotina e corpo",
  7: "o outro e parcerias",
  8: "o que é dividido",
  9: "estudo e horizonte",
  10: "carreira e imagem",
  11: "gente e grupos",
  12: "bastidor e descanso",
};

const AJUDA_MAPA_POR_PLANETA: Record<string, { titulo: string; texto: string }> = {
  Moon: {
    titulo: "Como a Lua mexe no íntimo",
    texto:
      "Aqui está o ponto exato do mapa de nascimento que a Lua cutuca hoje. É onde o humor, a intuição e as reações emocionais batem direto nesse tema.",
  },
  Sun: {
    titulo: "Onde o Sol joga luz",
    texto:
      "Este é o ponto único do nascimento que o Sol ilumina agora. Ele traz clareza, energia vital e pede para encarar essa parte da história de frente.",
  },
  Mercury: {
    titulo: "O que Mercúrio ativa na mente",
    texto:
      "Aqui está a parte exclusiva do mapa natal tocada por Mercúrio. Mostra o que acelera os pensamentos, ideias de negócio e conversas que precisam acontecer.",
  },
  Venus: {
    titulo: "Onde Vênus abre portas",
    texto:
      "Este contato mostra como Vênus mexe diretamente com o bolso, a valorização, o poder de atração e os acordos favoráveis agora.",
  },
  Mars: {
    titulo: "Onde Marte exige atitude",
    texto:
      "Aqui o planeta da ação encosta num ponto do nascimento. Usado com direção, vira coragem e entrega rápida; reprimido, vira impaciência e atrito.",
  },
};

export interface Aspecto {
  aspecto: string;
  aspecto_pt: string;
  faz: string;
  ponto: string;
  ponto_pt: string;
  ponto_significa: string;
  orbe: number;
  aplicando: boolean;
  exato: boolean;
  forca: number;
}

export interface Posicao {
  planeta: string;
  planeta_pt: string;
  casa: number;
  signo: string;
  grau?: number;
  retrogrado: boolean;
  ate: string | null;
  texto: string;
  aspectos?: Aspecto[];
  prioridade?: number;
  destaque?: boolean;
  responde_a_pergunta?: boolean;
}

export interface MovimentoPeriodo {
  tipo: "mudanca_casa" | "pico_aspecto";
  data: string;
  planeta: string;
  planeta_pt: string;
  titulo: string;
  descricao: string;
}

export interface Leitura {
  id: string;
  data: string;
  data_fim?: string | null;
  movimentos_periodo?: MovimentoPeriodo[];
  posicoes: Posicao[];
  sintese: string;
  svg: string;
  status: string;
  contexto?: {
    area?: string | null;
    pergunta?: string | null;
    data_fim?: string | null;
    openai_cost?: {
      model?: string;
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      cost_usd?: number;
      cost_brl?: number;
      cost_formatted_usd?: string;
      cost_formatted_brl?: string;
    };
  };
  openai_cost?: {
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    cost_brl?: number;
    cost_formatted_usd?: string;
    cost_formatted_brl?: string;
  };
  hora_de_nascimento_conhecida?: boolean;
}

function curta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function porExtenso(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d} de ${meses[m - 1]} de ${a}`;
}

export default function LeituraResultado({ leitura }: { leitura: Leitura }) {
  const [verMapa, setVerMapa] = useState(false);
  const pergunta = leitura.contexto?.pergunta;
  const dataFim = leitura.data_fim || leitura.contexto?.data_fim;
  const cost = leitura.openai_cost || leitura.contexto?.openai_cost;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.gold }}>
          {dataFim
            ? `Previsão do Período · ${porExtenso(leitura.data)} até ${porExtenso(dataFim)}`
            : porExtenso(leitura.data)}
        </p>

        {cost && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold" style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#34d399" }}>
            <span>💰 Custo IA:</span>
            <span className="font-mono font-bold">{cost.cost_formatted_usd || `$${(cost.cost_usd || 0).toFixed(4)}`}</span>
            <span className="opacity-80 font-mono">({cost.cost_formatted_brl || `R$ ${(cost.cost_brl || 0).toFixed(4)}`})</span>
            {cost.total_tokens ? (
              <span className="text-[10px] text-gray-300 font-mono ml-1">
                • {cost.total_tokens.toLocaleString()} tokens
              </span>
            ) : null}
            {cost.model && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 font-mono">
                {cost.model}
              </span>
            )}
          </div>
        )}
      </div>

      {pergunta && (
        <p className="mt-2 text-sm italic" style={{ color: C.muted }}>
          Sobre: &ldquo;{pergunta}&rdquo;
        </p>
      )}

      {leitura.sintese ? (
        <div
          className="mt-3 p-6 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #1e1746 0%, #140f30 100%)",
            border: `1px solid ${C.primary}44`,
          }}
        >
          {leitura.sintese.split("\n\n").map((p, i) => (
            <p key={i} className="leading-relaxed text-base mb-4 last:mb-0" style={{ color: C.text }}>
              {p}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm px-4 py-3 rounded-xl" style={{ color: C.light, background: C.card }}>
          As cinco posições estão aqui embaixo. O resumo não foi escrito desta
          vez — peça a leitura de novo em alguns instantes.
        </p>
      )}

      {dataFim && (leitura.movimentos_periodo ?? []).length > 0 && (
        <div
          className="mt-6 p-5 rounded-2xl"
          style={{ background: C.card, border: `1px solid ${C.gold}44` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.gold }}>
            ✦ Marcos e viradas deste período
          </p>
          <div className="space-y-2.5 mt-3">
            {(leitura.movimentos_periodo ?? []).map((ev, idx) => (
              <div
                key={`${ev.data}-${ev.planeta}-${idx}`}
                className="p-3 rounded-xl flex items-start gap-3"
                style={{ background: "#120d28", border: `1px solid ${C.border}` }}
              >
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap mt-0.5"
                  style={{ background: `${C.gold}22`, color: C.gold }}
                >
                  {curta(ev.data)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#ffffff" }}>
                    {ICONE[ev.planeta] || "✦"} {ev.titulo}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: C.text }}>
                    {ev.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {leitura.hora_de_nascimento_conhecida === false && (
        <p className="mt-4 text-xs px-4 py-3 rounded-xl" style={{ color: C.muted, background: C.card }}>
          Sem a hora de nascimento no cadastro, o cálculo usou meio-dia. As
          áreas da vida abaixo podem sair deslocadas.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {leitura.posicoes.map((p) => {
          const ajudaMapa = AJUDA_MAPA_POR_PLANETA[p.planeta] || {
            titulo: `Como ${p.planeta_pt} toca o mapa`,
            texto: "Este é o ponto exclusivo do mapa de nascimento tocado por este planeta.",
          };

          return (
            <div
              key={p.planeta}
              className="p-5 rounded-2xl"
              style={{
                background: p.destaque
                  ? "linear-gradient(135deg, #221a3d 0%, #171231 100%)"
                  : C.card,
                border: p.destaque ? `1px solid ${C.gold}66` : `1px solid ${C.border}`,
              }}
            >
              {p.destaque && (
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: C.gold }}>
                  O mais forte de hoje
                  {" "}
                  <Ajuda titulo={`Por que ${p.planeta_pt} lidera hoje`}>
                    Entre os cinco planetas rápidos, {p.planeta_pt} é o que faz
                    o contato mais apertado com o mapa de nascimento neste momento.
                  </Ajuda>
                </p>
              )}

              <div className="flex items-start gap-3 flex-wrap">
                <span className="text-xl leading-none mt-0.5" style={{ color: C.gold }}>
                  {ICONE[p.planeta] || "✦"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold" style={{ color: "#ffffff" }}>
                    {AREA_DA_CASA[p.casa] || `casa ${p.casa}`}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
                    <span style={{ color: C.light, fontWeight: 600 }}>{p.planeta_pt}</span>
                    {" "}{p.grau !== undefined ? `a ${p.grau}° de ` : "em "}{p.signo}, casa {p.casa}
                    {p.retrogrado && " · retrógrado"}
                  </p>
                </div>
                {p.responde_a_pergunta && (
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ background: `${C.gold}22`, color: C.gold }}
                  >
                    responde a pergunta
                  </span>
                )}
                {p.ate && (
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ background: C.dark, color: C.light }}
                  >
                    até {curta(p.ate)}
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm leading-relaxed" style={{ color: C.text }}>
                {p.texto}
              </p>

              {(p.aspectos ?? []).length > 0 && (
                <div className="mt-4 pt-4 space-y-3" style={{ borderTop: `1px solid ${C.border}` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>
                    No mapa de nascimento, isso bate em
                    {" "}
                    <Ajuda titulo={ajudaMapa.titulo}>
                      {ajudaMapa.texto}
                    </Ajuda>
                  </p>
                  {(p.aspectos ?? []).slice(0, 3).map((a) => (
                    <div key={a.ponto} className="flex items-start gap-3">
                      <span
                        className="mt-1.5 rounded-full flex-shrink-0"
                        style={{
                          width: a.exato ? 9 : 6,
                          height: a.exato ? 9 : 6,
                          background: a.aplicando ? C.gold : C.muted,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: C.text }}>
                          <span style={{ color: C.light }}>{a.ponto_significa}</span>
                          {" — "}
                          {a.faz}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: C.muted }}>
                          {a.aspecto_pt} {a.ponto_pt}
                          {" · "}
                          {a.exato ? "no pico agora" : a.aplicando ? "apertando" : "já afrouxando"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {p.retrogrado && (
                <p className="mt-3 text-xs leading-relaxed" style={{ color: C.muted }}>
                  Voltando sobre o próprio caminho: serve para rever e retomar,
                  não para abrir frente nova.
                </p>
              )}

              {/* Atalho para aprofundamento na aula da Bússola */}
              {AULA_BUSSOLA[p.planeta] && (
                <div
                  className="mt-3.5 pt-3 flex items-center justify-between flex-wrap gap-2"
                  style={{ borderTop: `1px dashed ${C.border}` }}
                >
                  <span className="text-[11px]" style={{ color: C.muted }}>
                    Quer dominar essa força no seu mapa?
                  </span>
                  <a
                    href={`/dashboard?tab=${AULA_BUSSOLA[p.planeta].tab}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:brightness-125 hover:border-purple-400/60"
                    style={{ background: "rgba(127,119,221,0.12)", color: C.light, border: `1px solid ${C.border}` }}
                  >
                    <span>📖 {AULA_BUSSOLA[p.planeta].titulo}</span>
                    <span>→</span>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {leitura.svg && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setVerMapa((v) => !v)}
            className="text-xs font-medium underline"
            style={{ color: C.light }}
          >
            {verMapa ? "Fechar o desenho" : `Ver a roda dupla de ${curta(leitura.data)}`}
          </button>
          {verMapa && (
            <div
              className="mt-3 p-3 rounded-xl overflow-auto"
              style={{ background: "#0b0818", border: `1px solid ${C.border}` }}
              dangerouslySetInnerHTML={{ __html: leitura.svg }}
            />
          )}
        </div>
      )}
    </div>
  );
}
