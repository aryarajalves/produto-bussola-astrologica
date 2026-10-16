"use client";

/**
 * Bússola Astrológica — Tactical Editorial Dashboard
 *
 * Arquitetura de interface executiva (Linear + Co-Star + The Pattern):
 * - Canvas dark near-black e Surface Ladder em alta fidelidade.
 * - Bento Grid responsivo para as 5 forças ativas com hero card para o planeta líder.
 * - Tratamento editorial de manifesto para a Síntese Profunda.
 * - Timeline executiva para os marcos cronológicos do período.
 * - 100% da capacidade técnica, cálculos astronômicos e toques do mapa natal preservados.
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ChartZoomModal from "@/components/ChartZoomModal";
import Ajuda from "@/components/Ajuda";

// Design Tokens: Paleta Executiva Tática
const T = {
  canvas: "#08090c",
  surface1: "#0f1118",
  surface2: "#141722",
  surface3: "#1a1e2d",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.04)",
  borderGold: "rgba(226, 184, 87, 0.35)",
  gold: "#E2B857",
  goldMuted: "rgba(226, 184, 87, 0.15)",
  goldLight: "#F2D07E",
  text: "#F4F4F6",
  textMuted: "#8A8F9E",
  textLight: "#C5C8D4",
  accent: "#6366F1",
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

/** Explicações didáticas do "?" para cada planeta */
const AJUDA_MAPA_POR_PLANETA: Record<string, { titulo: string; texto: string }> = {
  Moon: {
    titulo: "Como chegamos a esta leitura da Lua",
    texto:
      "Nós cruzamos o movimento da Lua hoje com o ponto exato onde estava a sua sensibilidade quando você nasceu. Isso não é horóscopo geral: quando a Lua toca os pontos da lista abaixo, ela funciona como um gatilho rápido que mexe no seu humor, na sua intuição e no jeito que você reage ao ambiente antes mesmo de pensar. Saber disso ajuda você a entender por que certas conversas ou cobranças parecem pesar mais hoje, para você usar sua percepção com calma em vez de reagir no calor do momento.",
  },
  Sun: {
    titulo: "Como chegamos ao foco do Sol",
    texto:
      "Esta leitura nasce do encontro entre onde o Sol está passando agora e a sua identidade original de nascimento. O Sol funciona como um holofote de clareza: ao encostar nos pontos listados abaixo, ele ilumina com precisão onde a sua energia precisa estar concentrada. Mostra o palco onde a vida está exigindo sua presença, firmeza de postura e decisões pessoais, para você parar de pedir permissão e assumir a liderança desse assunto hoje.",
  },
  Mercury: {
    titulo: "Como chegamos à leitura de Mercúrio",
    texto:
      "Nós calculamos esta orientação comparando onde Mercúrio transita hoje com a parte mental do seu mapa de nascimento. Quando ele ativa os pontos abaixo, ele acelera seus pensamentos, traz ideias à tona e mostra quais assuntos precisam ser destravados. Isso explica por que a sua cabeça está inquieta com propostas, papéis ou mensagens, indicando o melhor momento para colocar combinados no papel e ter conversas diretas.",
  },
  Venus: {
    titulo: "Como chegamos à leitura de Vênus",
    texto:
      "Chegamos a esta leitura cruzando a passagem de Vênus com os pontos de valor e atração gravados no seu nascimento. Em vez de uma promessa vazia, isso mapeia onde o terreno da sua vida está com menos atrito: onde as pessoas estão mais abertas a ouvir suas ideias, onde seu trabalho é mais valorizado e onde você pode negociar valores e fechar acordos lucrativos sem precisar forçar a barra.",
  },
  Mars: {
    titulo: "Como chegamos à leitura de Marte",
    texto:
      "Esta leitura nasce do choque entre o combustível de Marte hoje e a sua iniciativa de nascença. Marte é o acelerador: ao tocar os pontos abaixo, ele mostra exatamente onde você sente pressa, onde a paciência encurta e, principalmente, onde você tem força e coragem para cortar o que atrasa o seu dia e partir para a ação imediata sem hesitar.",
  },
};

const AJUDA_DESTAQUE_POR_PLANETA: Record<string, { titulo: string; texto: string }> = {
  Sun: {
    titulo: "Por que o Sol é o mais forte de hoje no seu mapa",
    texto:
      "Entre todos os movimentos do céu, o Sol é o que faz o contato mais exato e apertado com o seu mapa de nascimento agora. Ele é o fio condutor principal da sua leitura: é onde a sua energia vital, sua autoridade e suas decisões precisam estar focadas hoje. O Sol ilumina a sua capacidade de se posicionar com clareza, dar a cara a tapa e liderar sem pedir permissão. Ignorar essa área hoje é desperdiçar energia no lugar errado; assumir a frente aqui destrava o resto da sua vida e dos seus negócios.",
  },
  Moon: {
    titulo: "Por que a Lua é a mais forte de hoje no seu mapa",
    texto:
      "A Lua faz o encontro mais apertado e direto com o seu mapa de nascimento neste momento. Ela funciona como o grande termômetro do seu dia: mexe direto no seu humor, na sua sensibilidade e nas suas reações imediatas antes mesmo de raciocinar. Saber disso ajuda você a ler o ambiente e as pessoas com precisão cirúrgica, sem cair no erro de reagir impulsivamente ou tomar decisões no calor do momento.",
  },
  Mercury: {
    titulo: "Por que Mercúrio é o mais forte de hoje no seu mapa",
    texto:
      "Mercúrio faz o contato mais intenso com o seu nascimento hoje, transformando a sua mente e comunicação no grande motor do dia. É o momento em que suas palavras, mensagens, negociações e propostas têm peso dobrado. Aproveite este alinhamento para ter conversas diretas, colocar combinados no papel e destravar decisões práticas.",
  },
  Venus: {
    titulo: "Por que Vênus é a mais forte de hoje no seu mapa",
    texto:
      "Vênus encosta com força máxima no seu mapa natal hoje, criando a sua melhor janela de valor, atração e acordos. É onde o terreno da sua vida está mais receptivo para você ser ouvido, valorizar sua entrega, cobrar o preço justo e fechar parcerias lucrativas com o menor nível de atrito possível.",
  },
  Mars: {
    titulo: "Por que Marte é o mais forte de hoje no seu mapa",
    texto:
      "Marte está em alinhamento direto com o seu nascimento hoje, entregando combustível extra, pressa e coragem de ação. Ele lidera o seu dia para você cortar o que trava seu caminho, vencer a hesitação e executar decisões práticas sem ficar ensaiando.",
  },
};

const AJUDA_PRAZO_POR_PLANETA: Record<string, { titulo: string; texto: string }> = {
  Moon: {
    titulo: "Ritmo rápido da Lua",
    texto:
      "A Lua muda de área a cada dois dias e meio. Esse clima emocional passa depressa: aproveite a percepção de hoje, mas evite decisões impulsivas no calor do momento.",
  },
  Sun: {
    titulo: "Temporada do Sol",
    texto:
      "O Sol fica cerca de um mês em cada área do seu mapa. Até essa data, este é o palco principal onde vale colocar a sua presença e a sua atenção.",
  },
  Mercury: {
    titulo: "Janela de conversa e estratégia",
    texto:
      "Mercúrio mantém sua mente ligada neste assunto até essa data. Aproveite para negociar, organizar ideias, fazer contas e fechar combinados por escrito.",
  },
  Venus: {
    titulo: "Janela de acordos e ganhos",
    texto:
      "Até essa data, Vênus facilita o bom trato, as vendas e as parcerias nesta área da sua vida. É o melhor prazo para negociar valores e destravar conversas.",
  },
  Mars: {
    titulo: "Ciclo de força e execução",
    texto:
      "Marte entrega combustível extra para esta área até essa data. Use esse prazo para atacar o trabalho pesado, cortar o que trava o seu caminho e agir com firmeza.",
  },
};

function limpaTracos(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/,\s*,+/g, ",")
    .replace(/:\s*,+/g, ":")
    .replace(/^[—–\-\s]+/, "")
    .trim();
}

const ETAPAS_LOADING = [
  "Localizando as coordenadas exatas do seu mapa de nascimento...",
  "Calculando o movimento dos astros para o período que você escolheu...",
  "Cruzando os encontros do céu com os pontos que existem só no seu mapa...",
  "Aprofundando a leitura personalizada no modelo 5.6 Sol para o seu momento...",
  "Costurando sua previsão completa e o passo prático, já, já aparece na tela...",
];

interface Aspecto {
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

interface Posicao {
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

interface MovimentoPeriodo {
  tipo: "mudanca_casa" | "pico_aspecto";
  data: string;
  planeta: string;
  planeta_pt: string;
  titulo: string;
  descricao: string;
  area_nova?: string;
  ponto_significa?: string;
}

interface Analise {
  id: string;
  data: string;
  data_fim?: string | null;
  movimentos_periodo?: MovimentoPeriodo[];
  posicoes: Posicao[];
  sintese: string;
  svg: string;
  status: string;
  hora_de_nascimento_conhecida: boolean;
  contexto?: {
    area?: string | null;
    pergunta?: string | null;
    data_fim?: string | null;
  };
}

interface ItemHistorico {
  id: string;
  data: string;
  data_fim?: string | null;
  status: string;
  tem_sintese: boolean;
  contexto?: {
    area?: string | null;
    pergunta?: string | null;
    data_fim?: string | null;
  };
}

function hoje(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function somaDias(dias: number, baseIso?: string): string {
  const d = baseIso ? new Date(`${baseIso}T12:00:00`) : new Date();
  d.setDate(d.getDate() + dias);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function porExtenso(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d} de ${meses[m - 1]} de ${a}`;
}

function curta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function AnaliseDoDia({
  nome,
  analiseIdInicial,
  dataInicial,
}: {
  nome?: string;
  analiseIdInicial?: string | null;
  dataInicial?: string | null;
}) {
  const [modo, setModo] = useState<"dia" | "periodo">("dia");
  const [data, setData] = useState(dataInicial || hoje());
  const [dataFim, setDataFim] = useState(() => somaDias(7, dataInicial || hoje()));
  const [areas, setAreas] = useState<{ id: string; rotulo: string }[]>([]);
  const [area, setArea] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [etapaLoading, setEtapaLoading] = useState(0);
  const [erro, setErro] = useState("");
  const [zoom, setZoom] = useState(false);

  const carregarHistorico = useCallback(async () => {
    try {
      setHistorico(await api.get<ItemHistorico[]>("/members/analises"));
    } catch {
      // Histórico é conveniência.
    }
  }, []);

  useEffect(() => {
    carregarHistorico();
    api.get<{ id: string; rotulo: string }[]>("/members/areas")
      .then(setAreas)
      .catch(() => setAreas([]));
  }, [carregarHistorico]);

  // Carrega análise específica quando solicitado via histórico / Diário de bordo
  useEffect(() => {
    if (!analiseIdInicial) return;
    let ativo = true;
    (async () => {
      try {
        setCarregando(true);
        const a = await api.get<Analise>(`/members/analises/${analiseIdInicial}`);
        if (ativo && a) {
          setAnalise(a);
          setData(a.data);
          if (a.data_fim) {
            setDataFim(a.data_fim);
            setModo("periodo");
          } else {
            setModo("dia");
          }
          if (a.contexto?.area) setArea(a.contexto.area);
          if (a.contexto?.pergunta) setPergunta(a.contexto.pergunta);
        }
      } catch {
        // Silencioso se não carregar
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [analiseIdInicial]);

  useEffect(() => {
    if (!carregando) {
      setEtapaLoading(0);
      return;
    }
    const timer = setInterval(() => {
      setEtapaLoading((atual) => (atual < ETAPAS_LOADING.length - 1 ? atual + 1 : atual));
    }, 3500);
    return () => clearInterval(timer);
  }, [carregando]);

  const gerar = useCallback(async (dia: string, fimOpcional?: string | null) => {
    setCarregando(true);
    setErro("");
    try {
      const payload: Record<string, unknown> = {
        data: dia,
        area: area || undefined,
        pergunta: pergunta.trim() || undefined,
      };
      const fimEfetivo = fimOpcional !== undefined ? fimOpcional : (modo === "periodo" ? dataFim : undefined);
      if (fimEfetivo && fimEfetivo > dia) {
        payload.data_fim = fimEfetivo;
      }

      const r = await api.post<Analise>("/members/analise", payload);
      setAnalise(r);
      setData(dia);
      if (r.data_fim) {
        setDataFim(r.data_fim);
        setModo("periodo");
      }
      carregarHistorico();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler essa data.");
    } finally {
      setCarregando(false);
    }
  }, [carregarHistorico, area, pergunta, modo, dataFim]);

  const aplicarAtalhoPeriodo = (dias: number) => {
    const base = data || hoje();
    setModo("periodo");
    setDataFim(somaDias(dias, base));
  };

  const primeiroNome = nome?.split(" ")[0] || "";

  // Ordenação do Bento Grid: O planeta em destaque fica em 1º lugar
  const posicoesOrdenadas = analise?.posicoes
    ? [...analise.posicoes].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0))
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Top Header Editorial ────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E2B857]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: T.gold }}>
            Bússola Astrológica · Sistema de Decisão & Timing
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Análise do Dia & Previsão de Período
          </h1>
          <Ajuda titulo="Como funciona a Bússola">
            Escolha um único dia ou um período inteiro (como os próximos 7, 15 ou 30 dias). O sistema cruza os 5 astros rápidos ativos no céu com os pontos exclusivos do seu nascimento para entregar um mapa de terreno prático, tático e sem rodeios.
          </Ajuda>
        </div>
        <p className="mt-2 text-sm leading-relaxed max-w-2xl" style={{ color: T.textMuted }}>
          Mapeamento cirúrgico de terreno: o que está a favor, onde o atrito exige postura e o passo concreto que você deve executar.
        </p>
      </div>

      {/* ── Painel de Controle Executivo (Selector) ──────────────────────── */}
      <div
        className="p-5 sm:p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm transition-all"
        style={{
          background: T.surface1,
          border: `1px solid ${T.border}`,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Toggle de Modo: Dia Único vs Período */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/[0.06]">
          <div
            className="inline-flex p-1 rounded-xl"
            style={{ background: T.surface2, border: `1px solid ${T.border}` }}
          >
            <button
              type="button"
              onClick={() => setModo("dia")}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
              style={{
                background: modo === "dia" ? T.surface3 : "transparent",
                color: modo === "dia" ? "#ffffff" : T.textMuted,
                border: modo === "dia" ? `1px solid ${T.border}` : "1px solid transparent",
              }}
            >
              Leitura de 1 Dia
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("periodo");
                if (!dataFim || dataFim <= data) {
                  setDataFim(somaDias(7, data));
                }
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
              style={{
                background: modo === "periodo" ? T.surface3 : "transparent",
                color: modo === "periodo" ? "#ffffff" : T.textMuted,
                border: modo === "periodo" ? `1px solid ${T.border}` : "1px solid transparent",
              }}
            >
              Previsão de Período
            </button>
          </div>

          {modo === "periodo" && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono mr-1 hidden sm:inline" style={{ color: T.textMuted }}>
                Atalhos:
              </span>
              {[
                { label: "+7 dias", dias: 7 },
                { label: "+15 dias", dias: 15 },
                { label: "+30 dias", dias: 30 },
              ].map((atalho) => (
                <button
                  key={atalho.dias}
                  type="button"
                  onClick={() => aplicarAtalhoPeriodo(atalho.dias)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono transition-all hover:bg-white/[0.08]"
                  style={{
                    background: T.surface2,
                    color: T.textLight,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  {atalho.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div className={modo === "dia" ? "sm:col-span-2" : ""}>
            <label
              htmlFor="data-analise"
              className="block text-[11px] font-mono uppercase tracking-wider mb-2"
              style={{ color: T.textLight }}
            >
              Data Inicial / Alvo
            </label>
            <input
              id="data-analise"
              type="date"
              value={data}
              min={somaDias(-730)}
              max={somaDias(365)}
              onChange={(e) => {
                const nova = e.target.value;
                setData(nova);
                if (modo === "periodo" && dataFim <= nova) {
                  setDataFim(somaDias(7, nova));
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-all focus:border-[#E2B857]/50"
              style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>

          {modo === "periodo" && (
            <div>
              <label
                htmlFor="data-fim-analise"
                className="block text-[11px] font-mono uppercase tracking-wider mb-2"
                style={{ color: T.textLight }}
              >
                Data Final <span style={{ color: T.textMuted, textTransform: "none" }}>(fechamento do ciclo)</span>
              </label>
              <input
                id="data-fim-analise"
                type="date"
                value={dataFim}
                min={somaDias(1, data)}
                max={somaDias(90, data)}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-all focus:border-[#E2B857]/50"
                style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
              />
            </div>
          )}
        </div>

        {/* Inputs de Contexto: Área e Pergunta */}
        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <label
              htmlFor="area-analise"
              className="block text-[11px] font-mono uppercase tracking-wider mb-2"
              style={{ color: T.textLight }}
            >
              Área em Foco <span style={{ color: T.textMuted, textTransform: "none" }}>(opcional)</span>
            </label>
            <select
              id="area-analise"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:border-[#E2B857]/50"
              style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
            >
              <option value="">Panorama geral de todas as áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.rotulo}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="pergunta-analise"
                className="block text-[11px] font-mono uppercase tracking-wider"
                style={{ color: T.textLight }}
              >
                Contexto Real / Pergunta do Momento <span style={{ color: T.textMuted, textTransform: "none" }}>(opcional)</span>
              </label>
              <span className="text-[11px] font-mono" style={{ color: T.textMuted }}>
                {pergunta.length}/300
              </span>
            </div>
            <textarea
              id="pergunta-analise"
              rows={2}
              value={pergunta}
              maxLength={300}
              placeholder="Ex.: Tenho uma reunião com cliente para fechar proposta e preciso saber como conduzir o preço..."
              onChange={(e) => setPergunta(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-y transition-all focus:border-[#E2B857]/50"
              style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              const hj = hoje();
              setData(hj);
              if (modo === "periodo") {
                setDataFim(somaDias(7, hj));
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all hover:bg-white/[0.05]"
            style={{ color: T.textMuted, border: `1px solid ${T.border}` }}
          >
            Voltar para Hoje
          </button>

          <button
            type="button"
            onClick={() => gerar(data, modo === "periodo" ? dataFim : null)}
            disabled={carregando || !data}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${T.gold}, #b88628)`,
              color: "#08090c",
              boxShadow: "0 4px 20px rgba(226, 184, 87, 0.25)",
            }}
          >
            {carregando
              ? "Calculando céu..."
              : modo === "periodo"
              ? "Ver Previsão do Período"
              : "Ver Leitura do Dia"}
          </button>
        </div>
      </div>

      {/* ── Loading State de Precisão ────────────────────────────────────── */}
      {carregando && (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 p-6 sm:p-8 rounded-2xl relative overflow-hidden"
          style={{
            background: T.surface1,
            border: `1px solid ${T.borderGold}`,
            boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
          }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full border border-dashed border-white/20 animate-spin"
                style={{ animationDuration: "10s" }}
              />
              <div
                className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#E2B857] animate-spin"
                style={{ animationDuration: "3s" }}
              />
              <span className="text-xl" style={{ color: T.gold }}>
                ☉
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E2B857] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: T.gold }}>
                  Processamento Tático em Tempo Real
                </span>
              </div>
              <p className="text-base font-semibold text-white">
                {ETAPAS_LOADING[etapaLoading]}
              </p>
              <div className="mt-3.5 h-1 w-full rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(95, ((etapaLoading + 1) / ETAPAS_LOADING.length) * 95)}%`,
                    background: `linear-gradient(90deg, #6366F1, ${T.gold})`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div
          className="mt-4 px-4 py-3 rounded-xl text-xs font-mono"
          style={{ color: "#ff9999", background: "rgba(255, 60, 60, 0.08)", border: "1px solid rgba(255, 60, 60, 0.2)" }}
        >
          {erro}
        </div>
      )}

      {/* ── Histórico em Micro-Chips ────────────────────────────────────── */}
      {historico.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-mono uppercase tracking-wider mb-2.5" style={{ color: T.textMuted }}>
            Histórico de Consultas
          </p>
          <div className="flex flex-wrap gap-2">
            {historico.map((h) => {
              const fimHist = h.data_fim || h.contexto?.data_fim || null;
              const ativo = analise?.data === h.data && (analise?.data_fim || null) === fimHist;
              return (
                <button
                  key={h.id}
                  onClick={() => gerar(h.data, fimHist)}
                  className="px-3 py-1 rounded-lg text-xs font-mono transition-all hover:border-white/30"
                  style={{
                    background: ativo ? T.surface3 : T.surface1,
                    color: ativo ? "#ffffff" : T.textMuted,
                    border: `1px solid ${ativo ? T.gold : T.border}`,
                  }}
                >
                  {fimHist ? `${curta(h.data)} → ${curta(fimHist)}` : curta(h.data)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Resultado / Conteúdo Tático ──────────────────────────────────── */}
      {analise && !carregando && (
        <div className="mt-10 space-y-8">
          {/* 1. Bloco Hero: A Síntese Profunda */}
          <section
            className="p-6 sm:p-8 rounded-2xl relative overflow-hidden"
            style={{
              background: `linear-gradient(180deg, ${T.surface1} 0%, #0b0c12 100%)`,
              border: `1px solid ${T.borderGold}`,
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06] mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  ✦ {analise.data_fim
                    ? `Previsão do Período · ${porExtenso(analise.data)} até ${porExtenso(analise.data_fim)}`
                    : `Síntese do Dia · ${porExtenso(analise.data)}`}
                </span>
                <Ajuda titulo="Sobre a Síntese Profunda">
                  Esta é a costura principal da sua leitura: cruzamos os 5 planetas ativos no céu com os pontos exclusivos do seu nascimento para entregar um direcionamento prático, cirúrgico e personalizado para a sua pergunta e momento, sem jargões técnicos.
                </Ajuda>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full" style={{ background: T.surface2, color: T.textMuted, border: `1px solid ${T.border}` }}>
                Leitura Estratégica
              </span>
            </div>

            {analise.sintese ? (
              <div className="space-y-4">
                {analise.sintese
                  .split("\n\n")
                  .map((p) => p.trim())
                  .filter((p) => (
                    p.length > 0 &&
                    !p.startsWith("===") &&
                    !p.startsWith("---") &&
                    !p.startsWith("###") &&
                    !p.toUpperCase().startsWith("SÍNTESE") &&
                    !p.toUpperCase().startsWith("SINTESE") &&
                    !p.toUpperCase().includes("CARTOES") &&
                    !p.toUpperCase().includes("CARTÕES") &&
                    !p.startsWith("[Moon]") &&
                    !p.startsWith("[Sun]") &&
                    !p.startsWith("[Mercury]") &&
                    !p.startsWith("[Venus]") &&
                    !p.startsWith("[Mars]") &&
                    !p.startsWith("[Lua]") &&
                    !p.startsWith("[Sol]")
                  ))
                  .map((paragrafo, idx, arr) => {
                    const textoLimpo = limpaTracos(paragrafo);
                    const isUltimo = idx === arr.length - 1;
                    return (
                      <p
                        key={idx}
                        className={`leading-relaxed text-sm sm:text-base ${
                          isUltimo
                            ? "p-4 rounded-xl font-medium border-l-2"
                            : "text-[#E6E8EE]"
                        }`}
                        style={
                          isUltimo
                            ? {
                                background: "rgba(226, 184, 87, 0.05)",
                                borderColor: T.gold,
                                color: "#FFFFFF",
                              }
                            : {}
                        }
                      >
                        {textoLimpo}
                      </p>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>
                As cinco posições do dia estão calculadas abaixo. Caso queira nova costura da síntese, aperte novamente para atualizar.
              </p>
            )}
          </section>

          {/* 2. Timeline de Marcos Cronológicos (quando for período) */}
          {analise.data_fim && (analise.movimentos_periodo ?? []).length > 0 && (
            <section
              className="p-6 rounded-2xl"
              style={{ background: T.surface1, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  ✦ Marcos Cronológicos do Período
                </p>
                <span className="text-xs" style={{ color: T.textMuted }}>
                  Picos e viradas de foco
                </span>
              </div>
              <div className="space-y-3">
                {(analise.movimentos_periodo ?? []).map((ev, idx) => (
                  <div
                    key={`${ev.data}-${ev.planeta}-${idx}`}
                    className="p-3.5 rounded-xl flex items-start gap-3 transition-all hover:bg-white/[0.02]"
                    style={{ background: T.surface2, border: `1px solid ${T.border}` }}
                  >
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-bold whitespace-nowrap mt-0.5"
                      style={{ background: T.goldMuted, color: T.gold }}
                    >
                      {curta(ev.data)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {ICONE[ev.planeta] || "✦"} {limpaTracos(ev.titulo)}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: T.textLight }}>
                        {limpaTracos(ev.descricao)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!analise.hora_de_nascimento_conhecida && (
            <div
              className="p-3.5 rounded-xl text-xs font-mono flex items-center gap-2"
              style={{ color: T.textMuted, background: T.surface1, border: `1px solid ${T.border}` }}
            >
              <span>ℹ</span>
              <span>
                Hora de nascimento não informada: usamos meio-dia padrão. As casas podem ter pequeno deslocamento.
              </span>
            </div>
          )}

          {/* 3. Bento Grid: As 5 Forças Ativas */}
          <section>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  ✦ As 5 Forças Ativas do Seu Momento
                </p>
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                  Cruzamento direto com os pontos únicos do seu mapa natal
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg" style={{ background: T.surface1, color: T.textMuted, border: `1px solid ${T.border}` }}>
                {analise.posicoes.length} energias mapeadas
              </span>
            </div>

            {/* Grid Layout Bento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {posicoesOrdenadas.map((p) => {
                const isHero = p.destaque === true;
                const ajudaDestaque = AJUDA_DESTAQUE_POR_PLANETA[p.planeta] || {
                  titulo: `Por que ${p.planeta_pt} é o mais forte de hoje no seu mapa`,
                  texto: `Entre todos os movimentos do céu, ${p.planeta_pt} é o que faz o contato mais exato e apertado com o seu nascimento agora. Ele é o fio condutor principal da sua leitura: é onde a sua atenção e suas decisões precisam estar focadas hoje para destravar o resto da sua rotina.`,
                };
                const ajudaMapa = AJUDA_MAPA_POR_PLANETA[p.planeta] || {
                  titulo: `Como chegamos à leitura de ${p.planeta_pt}`,
                  texto:
                    `Nós cruzamos o movimento atual de ${p.planeta_pt} com os pontos de nascimento do seu mapa. Quando este astro ativa as áreas listadas abaixo, ele desperta essa dinâmica direta na sua vida prática.`,
                };
                const ajudaPrazo = AJUDA_PRAZO_POR_PLANETA[p.planeta] || {
                  titulo: `Prazo de ${p.planeta_pt}`,
                  texto: "Esta posição continua ativa nessa área da sua vida até essa data.",
                };

                return (
                  <div
                    key={p.planeta}
                    className={`p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition-all ${
                      isHero ? "lg:col-span-2" : ""
                    }`}
                    style={{
                      background: isHero
                        ? `linear-gradient(135deg, ${T.surface1} 0%, #15141d 100%)`
                        : T.surface1,
                      border: isHero
                        ? `1px solid ${T.borderGold}`
                        : `1px solid ${T.border}`,
                      boxShadow: isHero
                        ? "0 12px 36px rgba(226, 184, 87, 0.08)"
                        : "0 4px 20px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div>
                      {/* Top Bar do Card */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" style={{ color: T.gold }}>
                            {ICONE[p.planeta] || "✦"}
                          </span>
                          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                            {p.planeta_pt}
                          </span>
                          {p.retrogrado && (
                            <span
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(255, 180, 50, 0.12)", color: "#FFB432", border: "1px solid rgba(255, 180, 50, 0.25)" }}
                            >
                              retrógrado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {p.ate && (
                            <span
                              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full"
                              style={{ background: T.surface2, color: T.textLight, border: `1px solid ${T.border}` }}
                            >
                              até {curta(p.ate)}
                            </span>
                          )}
                          {p.ate && (
                            <Ajuda titulo={ajudaPrazo.titulo} alinhar="direita">
                              {ajudaPrazo.texto}
                            </Ajuda>
                          )}
                        </div>
                      </div>

                      {/* Badge Hero "O mais forte de hoje" */}
                      {isHero && (
                        <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-md" style={{ background: T.goldMuted, border: `1px solid ${T.borderGold}` }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E2B857] animate-ping" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: T.gold }}>
                            O Mais Forte de Hoje
                          </span>
                          <Ajuda titulo={ajudaDestaque.titulo}>
                            {ajudaDestaque.texto}
                          </Ajuda>
                        </div>
                      )}

                      {/* Título da Área da Vida */}
                      <h3 className="text-lg font-bold text-white tracking-tight mb-1">
                        {AREA_DA_CASA[p.casa] || `casa ${p.casa}`}
                      </h3>

                      {/* Coordenadas Técnicas */}
                      <p className="text-xs font-mono mb-3" style={{ color: T.textMuted }}>
                        {p.grau !== undefined ? `${p.grau}° de ` : ""}{p.signo}, casa {p.casa}
                      </p>

                      {/* Texto de Direcionamento Tático */}
                      <p className="text-sm leading-relaxed text-[#D6D9E0] mb-5">
                        {limpaTracos(p.texto)}
                      </p>
                    </div>

                    {/* Rodapé: Toques no Mapa Natal */}
                    <div>
                      {(p.aspectos ?? []).length > 0 && (
                        <div
                          className="pt-3.5 border-t border-white/[0.06] space-y-2.5 mb-3.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: T.textMuted }}>
                              No seu mapa, isso bate em
                            </span>
                            <Ajuda titulo={ajudaMapa.titulo}>
                              {ajudaMapa.texto}
                            </Ajuda>
                          </div>

                          {(p.aspectos ?? []).slice(0, 3).map((a) => (
                            <div key={a.ponto} className="flex items-start gap-2.5 text-xs">
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                style={{ background: a.aplicando || a.exato ? T.gold : T.textMuted }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="leading-snug text-[#E2E4EA]">
                                  <span className="font-semibold text-white">
                                    {limpaTracos(a.ponto_significa)}:
                                  </span>{" "}
                                  {limpaTracos(a.faz)}
                                </p>
                                <p className="text-[10px] font-mono mt-0.5" style={{ color: T.textMuted }}>
                                  {a.aspecto_pt} {a.ponto_pt} · {a.exato ? "no pico exato" : a.aplicando ? "apertando" : "já afrouxando"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Atalho de Aula */}
                      {AULA_BUSSOLA[p.planeta] && (
                        <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                          <span className="text-[10px] font-mono" style={{ color: T.textMuted }}>
                            Aprofundamento
                          </span>
                          <a
                            href={`/dashboard?tab=${AULA_BUSSOLA[p.planeta].tab}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-medium hover:text-[#E2B857] transition-colors"
                            style={{ color: T.textLight }}
                          >
                            <span>{AULA_BUSSOLA[p.planeta].titulo}</span>
                            <span>→</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. A Roda Dupla do Desenho do Céu */}
          {analise.svg && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="w-full p-4 rounded-2xl flex items-center justify-between transition-all hover:border-[#E2B857]/40 text-left"
                style={{ background: T.surface1, border: `1px solid ${T.border}` }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    ✦ Visualizar Mapa Técnico & Desenho do Céu
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                    O seu mapa natal por dentro e o trânsito de {curta(analise.data)} por fora
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                  Abrir Roda ↗
                </span>
              </button>
              <ChartZoomModal
                isOpen={zoom}
                onClose={() => setZoom(false)}
                title={`${primeiroNome ? primeiroNome + " · " : ""}${porExtenso(analise.data)}`}
                svgContent={analise.svg}
              />
            </div>
          )}
        </div>
      )}

      {!analise && !carregando && !erro && (
        <div className="mt-8 p-6 rounded-2xl text-center border border-white/[0.06] bg-[#0c0d12]">
          <p className="text-xs font-mono uppercase tracking-widest text-[#E2B857] mb-1">
            ✦ Comece Agora
          </p>
          <p className="text-sm text-gray-400">
            Selecione uma data acima e clique em &ldquo;Ver Leitura do Dia&rdquo; ou configure um período para planejar seus próximos passos.
          </p>
        </div>
      )}
    </div>
  );
}
