"use client";

/**
 * O painel de quem comprou a Bússola.
 *
 * Mesma casca visual do painel do admin, outra cabeça: aqui ninguém está
 * gerenciando leads, a pessoa está lendo a própria vida. Por isso nenhuma
 * palavra de gestão aparece nesta tela — nem "lead", nem "cadastro", nem
 * "administrador".
 *
 * Três áreas, e só:
 *   1. Minha Bússola — os dados de nascimento e o mapa que sai deles
 *   2. A leitura     — escolhe a data, lê os cinco planetas e a síntese
 *   3. Diário de bordo — tudo que ela já leu, em ordem
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import AnaliseDoDia from "@/components/AnaliseDoDia";
import ChartZoomModal from "@/components/ChartZoomModal";
import Ajuda from "@/components/Ajuda";
import ColetaDadosBussola from "@/components/ColetaDadosBussola";

const C = {
  bg: "#0f0b1e",
  card: "#1a1535",
  primary: "#7F77DD",
  light: "#AFA9EC",
  dark: "#3C3489",
  gold: "#EF9F27",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.2)",
};

export type AreaAluno = "bussola" | "leitura" | "diario" | "dados";

interface Mapa {
  svg: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  status: string;
}

interface ItemDiario {
  id: string;
  data: string;
  data_fim?: string | null;
  tipo?: "dia" | "periodo";
  pergunta?: string | null;
  area?: string | null;
  sintese_preview?: string;
  planeta_destaque?: string | null;
  status: string;
  tem_sintese: boolean;
  contexto?: {
    area?: string | null;
    pergunta?: string | null;
    data_fim?: string | null;
    tipo?: string;
  };
  created_at?: string;
}

function porExtenso(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d} de ${meses[m - 1]} de ${a}`;
}

function formataDataRelativa(dataIso?: string): string {
  if (!dataIso) return "";
  try {
    const d = new Date(dataIso);
    const agora = new Date();
    const diffMs = agora.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 2) return "Agora mesmo";
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHoras < 24 && d.getDate() === agora.getDate()) {
      return `Hoje às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diffDias === 1) {
      return `Ontem às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

const ROTULO_AREA: Record<string, string> = {
  carreira: "💼 Carreira & Negócios",
  financas: "💰 Finanças & Recursos",
  relacionamentos: "🤝 Relacionamentos",
  autoconhecimento: "🌱 Autoconhecimento",
  geral: "🌐 Panorama Geral",
};

export default function PainelAluno({
  area,
  usuario,
  onIrPara,
}: {
  area: AreaAluno;
  usuario: { name?: string; email?: string } | null;
  onIrPara: (a: AreaAluno) => void;
}) {
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [diario, setDiario] = useState<ItemDiario[]>([]);
  const [zoom, setZoom] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [analiseIdParaAbrir, setAnaliseIdParaAbrir] = useState<string | null>(null);
  const [buscaFiltro, setBuscaFiltro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "perguntas" | "periodos">("todos");
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setMapa(await api.get<Mapa>("/members/chart"));
    } catch {
      setMapa(null); // sem mapa ainda: a tela explica o que falta
    }
    try {
      setDiario(await api.get<ItemDiario[]>("/members/analises"));
    } catch {
      setDiario([]);
    }
    setCarregando(false);
  }, []);

  const handleExcluirDoDiario = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Deseja remover esta pesquisa do seu histórico?")) return;
    try {
      setDeletandoId(id);
      await api.delete(`/members/analises/${id}`);
      setDiario((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert("Não foi possível excluir esta pesquisa.");
    } finally {
      setDeletandoId(null);
    }
  };

  const handleAbrirLeitura = (id: string) => {
    setAnaliseIdParaAbrir(id);
    onIrPara("leitura");
  };

  useEffect(() => {
    carregar();
  }, [carregar]);

  const primeiroNome = usuario?.name?.trim().split(" ")[0] || "";
  const nomeExibido = primeiroNome
    ? primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1)
    : "";

  // ──────────────────────────────────────────────── Coleta / Meus Dados
  if (area === "dados") {
    return (
      <div className="w-full">
        <ColetaDadosBussola
          title="Meus Dados de Nascimento"
          subtitle="Seus dados calibram o cálculo astronômico das 12 casas e os trânsitos da sua Bússola."
          onSuccess={() => {
            carregar();
            onIrPara("bussola");
          }}
          onCancel={() => onIrPara("bussola")}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────── Minha Bússola
  if (area === "bussola") {
    return (
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
              {nomeExibido ? `A bússola do ${nomeExibido}` : "A sua bússola"}
            </h2>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: C.muted }}>
              Este é o céu do minuto em que você nasceu. Ele não muda nunca, e é
              contra ele que toda leitura de data é calculada.
            </p>
          </div>
          {mapa?.svg && (
            <button
              onClick={() => onIrPara("dados")}
              className="text-xs px-3.5 py-2 rounded-xl border transition-all text-amber-400 hover:text-amber-300 border-amber-400/30 hover:border-amber-400/60 bg-amber-400/5 hover:bg-amber-400/10 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              ⚙️ Editar Meus Dados
            </button>
          )}
        </div>

        {carregando ? (
          <p className="text-sm" style={{ color: C.muted }}>Carregando...</p>
        ) : mapa?.svg ? (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                { rotulo: "Sol", valor: mapa.sun_sign, diz: "quem você é quando ninguém está pedindo nada" },
                { rotulo: "Lua", valor: mapa.moon_sign, diz: "o que você sente antes de pensar" },
                { rotulo: "Ascendente", valor: mapa.rising_sign, diz: "como você chega nos lugares" },
              ].filter((s) => s.valor).map((s) => (
                <div
                  key={s.rotulo}
                  className="px-4 py-3 rounded-xl"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  <p className="text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>
                    {s.rotulo}
                  </p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: C.gold }}>
                    {s.valor}
                  </p>
                  <p className="text-[11px] mt-1 max-w-[190px] leading-snug" style={{ color: C.muted }}>
                    {s.diz}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setZoom(true)}
              className="w-full rounded-2xl overflow-hidden transition-all hover:opacity-95"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
              aria-label="Abrir o mapa em tela cheia"
            >
              <div
                className="p-4"
                dangerouslySetInnerHTML={{ __html: mapa.svg }}
              />
            </button>
            <p className="text-xs mt-3" style={{ color: C.muted }}>
              Clique no mapa para abrir em tela cheia e dar zoom.
            </p>

            <ChartZoomModal
              isOpen={zoom}
              onClose={() => setZoom(false)}
              title={nomeExibido ? `Mapa de ${nomeExibido}` : "Seu mapa"}
              svgContent={mapa.svg}
            />

            <button
              onClick={() => onIrPara("leitura")}
              className="mt-8 px-6 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.gold}, #c67c13)`, color: "#120b24" }}
            >
              Ler um dia →
            </button>
          </>
        ) : (
          <div className="space-y-6">
            <ColetaDadosBussola
              title="Calibre a sua Bússola"
              subtitle="Para desenhar sua mandala e começar a ler o céu do seu dia a dia, informe seus dados de nascimento abaixo."
              onSuccess={() => {
                carregar();
                onIrPara("bussola");
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────── A leitura
  if (area === "leitura") {
    if (!carregando && !mapa?.svg) {
      return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div
            className="p-4 rounded-2xl flex items-center gap-3.5"
            style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            <span className="text-2xl">🧭</span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Precisamos da sua data e local de nascimento</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                A leitura do dia projeta os planetas sobre as suas casas natais. Calibre sua bússola para ver sua análise.
              </p>
            </div>
          </div>
          <ColetaDadosBussola
            title="Cadastrar Dados de Nascimento"
            subtitle="Preencha uma única vez para liberar suas previsões diárias e acompanhamento de trânsitos."
            onSuccess={() => {
              carregar();
              onIrPara("leitura");
            }}
          />
        </div>
      );
    }

    return (
      <div className="w-full -mx-2">
        <AnaliseDoDia
          nome={usuario?.name}
          analiseIdInicial={analiseIdParaAbrir}
        />
      </div>
    );
  }

  // Filtro de buscas do Diário de bordo
  const diarioFiltrado = diario.filter((item) => {
    const temPergunta = Boolean(item.pergunta || item.contexto?.pergunta);
    const ehPeriodo = item.tipo === "periodo" || Boolean(item.data_fim || item.contexto?.data_fim);

    if (filtroTipo === "perguntas" && !temPergunta) return false;
    if (filtroTipo === "periodos" && !ehPeriodo) return false;

    if (!buscaFiltro.trim()) return true;
    const q = buscaFiltro.toLowerCase();
    const pergunta = (item.pergunta || item.contexto?.pergunta || "").toLowerCase();
    const dataStr = item.data.toLowerCase();
    const dataExtenso = porExtenso(item.data).toLowerCase();
    const areaStr = (item.area || item.contexto?.area || "").toLowerCase();
    const preview = (item.sintese_preview || "").toLowerCase();
    return (
      pergunta.includes(q) ||
      dataStr.includes(q) ||
      dataExtenso.includes(q) ||
      areaStr.includes(q) ||
      preview.includes(q)
    );
  });

  const totalComPerguntas = diario.filter((i) => i.pergunta || i.contexto?.pergunta).length;
  const totalPeriodos = diario.filter((i) => i.tipo === "periodo" || i.data_fim || i.contexto?.data_fim).length;

  // ──────────────────────────────────────────────── Diário de bordo (Histórico de Buscas)
  return (
    <div className="w-full max-w-4xl">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">
            Registro de Consultas & Timing
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Diário de bordo
            <Ajuda titulo="Histórico de Consultas">
              Toda pesquisa, pergunta ou previsão de período que você realiza fica salva cronologicamente aqui. Você pode revisitar as orientações a qualquer momento para comparar o que o céu indicava com as decisões concretas do seu dia a dia.
            </Ajuda>
          </h2>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/25 text-[#e4d18c]">
            {diario.length} {diario.length === 1 ? "pesquisa salva" : "pesquisas salvas"}
          </span>
        </div>
        <p className="text-sm mt-2 leading-relaxed text-zinc-400">
          Suas buscas anteriores, dúvidas enviadas ao céu e previsões personalizadas da sua Bússola.
        </p>
      </div>

      {carregando ? (
        <div className="p-12 text-center bg-[#12141c]/50 border border-white/5 rounded-2xl animate-pulse">
          <p className="text-xs uppercase tracking-widest text-[#d4af37] font-mono">
            Carregando histórico de pesquisas...
          </p>
        </div>
      ) : diario.length === 0 ? (
        <div
          className="p-8 sm:p-10 rounded-2xl text-center space-y-4 relative overflow-hidden"
          style={{ background: "#12141c", border: `1px solid ${C.border}` }}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] flex items-center justify-center mx-auto text-2xl">
            🧭
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Seu Diário de bordo está pronto
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
              Toda vez que você consultar o céu ou enviar uma pergunta na aba <strong>A leitura do dia</strong>, o registro ficará salvo automaticamente aqui como seu histórico de busca.
            </p>
          </div>
          <button
            onClick={() => onIrPara("leitura")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-gradient-to-r from-[#d4af37] via-[#e5c463] to-[#c79d2f] text-zinc-950 shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-[0.99] cursor-pointer"
          >
            <span>Fazer Primeira Pesquisa</span>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Barra de Busca e Filtros */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-3.5">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                🔍
              </span>
              <input
                type="text"
                value={buscaFiltro}
                onChange={(e) => setBuscaFiltro(e.target.value)}
                placeholder="Filtrar por pergunta, data ou palavra-chave..."
                className="w-full h-11 bg-[#181a24] border border-white/10 rounded-xl pl-10 pr-4 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37]/70 transition-colors"
              />
              {buscaFiltro && (
                <button
                  type="button"
                  onClick={() => setBuscaFiltro("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Chips de Filtro Rápido */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFiltroTipo("todos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filtroTipo === "todos"
                    ? "bg-[#d4af37]/20 text-[#e4d18c] border border-[#d4af37]/40 font-semibold"
                    : "bg-[#181a24] text-zinc-400 border border-white/5 hover:border-white/15 hover:text-zinc-200"
                }`}
              >
                Todas ({diario.length})
              </button>
              {totalComPerguntas > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo("perguntas")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filtroTipo === "perguntas"
                      ? "bg-[#d4af37]/20 text-[#e4d18c] border border-[#d4af37]/40 font-semibold"
                      : "bg-[#181a24] text-zinc-400 border border-white/5 hover:border-white/15 hover:text-zinc-200"
                  }`}
                >
                  Com Pergunta ({totalComPerguntas})
                </button>
              )}
              {totalPeriodos > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo("periodos")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filtroTipo === "periodos"
                      ? "bg-[#d4af37]/20 text-[#e4d18c] border border-[#d4af37]/40 font-semibold"
                      : "bg-[#181a24] text-zinc-400 border border-white/5 hover:border-white/15 hover:text-zinc-200"
                  }`}
                >
                  Previsões de Período ({totalPeriodos})
                </button>
              )}
            </div>
          </div>

          {/* Lista de Registros Filtrados */}
          {diarioFiltrado.length === 0 ? (
            <div className="p-8 text-center bg-[#12141c]/40 border border-white/5 rounded-2xl">
              <p className="text-xs text-zinc-400">
                Nenhuma pesquisa encontrada para os filtros atuais.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBuscaFiltro("");
                  setFiltroTipo("todos");
                }}
                className="mt-2 text-xs text-[#d4af37] hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {diarioFiltrado.map((item) => {
                const perguntaTexto = item.pergunta || item.contexto?.pergunta;
                const areaKey = (item.area || item.contexto?.area || "").toLowerCase();
                const areaRotulo = ROTULO_AREA[areaKey] || (areaKey ? `Área: ${areaKey}` : null);
                const ehPeriodo = item.tipo === "periodo" || Boolean(item.data_fim || item.contexto?.data_fim);
                const dataFimStr = item.data_fim || item.contexto?.data_fim;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAbrirLeitura(item.id)}
                    className="w-full p-5 rounded-2xl text-left transition-all bg-[#12141c] border border-white/10 hover:border-[#d4af37]/50 hover:bg-[#161822] cursor-pointer group relative overflow-hidden shadow-lg shadow-black/20"
                  >
                    {/* Borda superior de destaque */}
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 group-hover:via-[#d4af37]/40 to-transparent transition-all" />

                    {/* Linha 1: Badges, Data Alvo e Momento da Pesquisa */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                          ehPeriodo
                            ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25"
                            : "bg-[#d4af37]/10 text-[#e4d18c] border-[#d4af37]/25"
                        }`}>
                          {ehPeriodo ? "Previsão de Período" : "Leitura do Dia"}
                        </span>

                        {areaRotulo && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300">
                            {areaRotulo}
                          </span>
                        )}

                        {item.planeta_destaque && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Líder: {item.planeta_destaque}
                          </span>
                        )}
                      </div>

                      {item.created_at && (
                        <span className="text-[11px] font-mono text-zinc-500">
                          {formataDataRelativa(item.created_at)}
                        </span>
                      )}
                    </div>

                    {/* Data Alvo da Leitura */}
                    <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <span>
                        {ehPeriodo && dataFimStr
                          ? `${porExtenso(item.data)} até ${porExtenso(dataFimStr)}`
                          : porExtenso(item.data)}
                      </span>
                    </h4>

                    {/* Pergunta ou Contexto da Busca */}
                    {perguntaTexto ? (
                      <div className="mt-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                        <span className="text-base text-[#d4af37] shrink-0 mt-0.5">💬</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            Pergunta realizada:
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-zinc-100 italic mt-0.5 leading-snug">
                            "{perguntaTexto}"
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 mt-1">
                        Consulta geral das energias planetárias ativas sobre as 12 casas natais.
                      </p>
                    )}

                    {/* Preview da Síntese */}
                    {item.sintese_preview && (
                      <p className="mt-2.5 text-xs text-zinc-300 line-clamp-2 leading-relaxed bg-[#181a24]/60 p-2.5 rounded-xl border border-white/[0.04]">
                        <span className="text-[#d4af37] font-semibold mr-1.5 font-mono text-[11px]">
                          SÍNTESE:
                        </span>
                        {item.sintese_preview}
                      </p>
                    )}

                    {/* Ações inferiores */}
                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#d4af37] group-hover:text-[#f3de9a] flex items-center gap-1.5 transition-colors">
                        <span>Acessar Leitura Completa</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleExcluirDoDiario(e, item.id)}
                        disabled={deletandoId === item.id}
                        title="Excluir esta pesquisa do histórico"
                        className="text-zinc-500 hover:text-red-400 text-xs px-2.5 py-1 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer flex items-center gap-1"
                      >
                        {deletandoId === item.id ? (
                          <span className="inline-block animate-spin text-[10px]">⏳</span>
                        ) : (
                          <span>🗑️</span>
                        )}
                        <span className="text-[11px]">Remover</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
