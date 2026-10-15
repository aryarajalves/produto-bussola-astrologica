"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken } from "@/lib/api";
import AnaliseDoDia from "@/components/AnaliseDoDia";

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

const SIDEBAR_ITEMS = [
  { key: "inicio",          label: "Início",               icon: "♀"  },
  { key: "essencia",        label: "Essência",              icon: "☽"  },
  { key: "ferida_e_dom",    label: "A Ferida e o Dom",      icon: "⚷"  },
  { key: "dons_esquecidos", label: "Dons Esquecidos",       icon: "✦"  },
  { key: "luz_e_sombra",    label: "Luz e Sombra",          icon: "◑"  },
  { key: "reencontro",      label: "O Reencontro",          icon: "𓂀" },
  { key: "rituais",         label: "Rituais de Integração", icon: "⊕"  },
  { key: "afirmagias",      label: "Afirmagias",            icon: "☉"  },
];

interface User {
  id: string;
  name: string;
  email: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  role?: string;
}

interface Chart {
  svg: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  status: string;
  created_at: string;
}

interface Section {
  section_key: string;
  content: string;
}

const GLOSSARY = [
  {
    term: "Casa 1",
    keys: ["casa 1", "casa i", "casa 01", "casas 1", "casas i"],
    explanation: "A Casa da Identidade e da Personalidade. Ela representa o seu temperamento, a primeira impressão que você causa nos outros, seu corpo físico e a forma como você inicia projetos e ciclos na sua vida."
  },
  {
    term: "Casa 2",
    keys: ["casa 2", "casa ii", "casa 02", "casas 2", "casas ii"],
    explanation: "A Casa dos Recursos e Valores. Ela rege suas finanças, seus bens materiais, seus talentos práticos e, principalmente, a sua autoestima e valor próprio (o quanto você se valoriza)."
  },
  {
    term: "Casa 3",
    keys: ["casa 3", "casa iii", "casa 03", "casas 3", "casas iii"],
    explanation: "A Casa da Mente Prática e Comunicação. Ela comanda como você pensa, estuda, escreve e se expressa. Também rege viagens curtas, o ambiente ao seu redor e sua relação com irmãos e vizinhos."
  },
  {
    term: "Casa 4",
    keys: ["casa 4", "casa iv", "casa 04", "casas 4", "casas iv"],
    explanation: "A Casa do Lar, Raízes e Família. Fica na base do seu mapa e representa suas origens, seu ambiente doméstico, sua infância e sua intimidade emocional mais profunda. É o seu porto seguro interno."
  },
  {
    term: "Casa 5",
    keys: ["casa 5", "casa v", "casa 05", "casas 5", "casas v"],
    explanation: "A Casa da Criatividade, Prazer e Expressão. Ela rege os seus hobbies, namoros, diversão, projetos autorais e os filhos. Representa a sua energia vital criativa e a sua alegria espontânea."
  },
  {
    term: "Casa 6",
    keys: ["casa 6", "casa vi", "casa 06", "casas 6", "casas vi"],
    explanation: "A Casa da Rotina, Saúde e Trabalho Diário. Ela comanda as tarefas cotidianas, sua relação com o corpo, hábitos alimentares, disciplina e a prestação de serviços práticos."
  },
  {
    term: "Casa 7",
    keys: ["casa 7", "casa vii", "casa 07", "casas 7", "casas vii"],
    explanation: "A Casa dos Relacionamentos e Parcerias. Ela rege casamentos, sociedades de negócios e qualquer parceria séria de um para um. Mostra o que você busca nos outros e como se relaciona."
  },
  {
    term: "Casa 8",
    keys: ["casa 8", "casa viii", "casa 08", "casas 8", "casas viii"],
    explanation: "A Casa da Transformação, Sexualidade e Recursos Compartilhados. Ela rege crises profundas, processos de cura, intuição, renascimento emocional e também o dinheiro dos outros (heranças, empréstimos, finanças do parceiro)."
  },
  {
    term: "Casa 9",
    keys: ["casa 9", "casa ix", "casa 09", "casas 9", "casas ix"],
    explanation: "A Casa da Filosofia, Sabedoria e Longos Horizontes. Ela comanda o ensino superior, grandes viagens ao exterior, espiritualidade, ética e a sua busca incessante pelo significado da vida."
  },
  {
    term: "Casa 10",
    keys: ["casa 10", "casa x", "casas 10", "casas x"],
    explanation: "A Casa da Carreira e Status Público (Meio do Céu). Ela representa sua vocação profissional, sua reputação, as suas maiores conquistas públicas e o legado que você deseja deixar no mundo."
  },
  {
    term: "Casa 11",
    keys: ["casa 11", "casa xi", "casas 11", "casas xi"],
    explanation: "A Casa dos Grupos, Amigos e Projetos de Futuro. Ela rege suas amizades, os grupos aos quais você pertence, causas coletivas/humanitárias e as suas esperanças de longo prazo."
  },
  {
    term: "Casa 12",
    keys: ["casa 12", "casa xii", "casas 12", "casas xii"],
    explanation: "A Casa do Subconsciente e Espiritualidade. A casa mais mística do mapa: rege a meditação, sonhos, intuição profunda, isolamento curativo e a conexão direta com o divino, além de medos e padrões ocultos."
  },
  {
    term: "Cúspide",
    keys: ["cúspide", "cúspides"],
    explanation: "A linha divisória que separa uma casa astrológica da outra. Pense nela como a 'fronteira' entre diferentes áreas da sua vida."
  },
  {
    term: "Ascendente",
    keys: ["ascendente", "ascendentes"],
    explanation: "O signo que estava surgindo no horizonte leste no exato minuto do seu nascimento. Representa sua máscara social, a primeira impressão que você passa e como você inicia novas jornadas."
  },
  {
    term: "Meio do Céu",
    keys: ["meio do céu", "meio-do-céu"],
    explanation: "O ponto mais alto do céu no momento do seu nascimento. Indica sua carreira, reputação, vocação pública e onde você quer chegar na vida."
  },
  {
    term: "Conjunção",
    keys: ["conjunção", "conjunções", "conjunto a", "conjunta a", "conjunto", "conjunta"],
    explanation: "Quando dois planetas estão muito próximos no céu (no mesmo signo e grau). Isso significa que as energias deles se misturam intensamente, agindo como uma força única."
  },
  {
    term: "Oposição",
    keys: ["oposição", "oposições", "oposto a", "oposta a"],
    explanation: "Quando dois planetas estão em lados opostos do zodíaco (a 180 graus de distância). Representa uma queda de braço de energias que exige equilíbrio e integração entre forças contrárias."
  },
  {
    term: "Trígono",
    keys: ["trígono", "trígonos"],
    explanation: "Um aspecto harmonioso de 120 graus entre planetas (geralmente do mesmo elemento). Indica talentos naturais, fluidez e facilidade — áreas onde as coisas acontecem sem esforço."
  },
  {
    term: "Quadratura",
    keys: ["quadratura", "quadraturas"],
    explanation: "Um aspecto tenso de 90 graus entre planetas. Representa um desafio interno ou obstáculo que te impulsiona a crescer, agir e superar barreiras."
  },
  {
    term: "Sextil",
    keys: ["sextil", "séctil", "sextis"],
    explanation: "Um aspecto amigável de 60 graus entre planetas. Representa oportunidades e potenciais que, se você colocar um pouco de esforço, se tornam habilidades valiosas."
  },
  {
    term: "Quíron",
    keys: ["quíron", "chiron"],
    explanation: "Um asteroide que representa a 'Ferida Sagrada' na astrologia. Indica uma dor profunda ou vulnerabilidade que, ao ser curada, se torna o seu maior dom para guiar e curar os outros."
  },
  {
    term: "Nodos Lunares",
    keys: ["nodo norte", "nodos lunares", "nodo sul", "nodos"],
    explanation: "Pontos astronômicos que representam o caminho de evolução da sua alma. O Nodo Sul mostra seus talentos do passado (zona de conforto), enquanto o Nodo Norte mostra o propósito de desenvolvimento futuro."
  },
  {
    term: "Casas Astrológicas",
    keys: ["casa astrológica", "casas astrológicas", "casas", "casa"],
    explanation: "As 12 divisões do céu que representam diferentes áreas práticas da vida (como finanças, amor, carreira, família). Cada planeta atua dentro de uma delas."
  },
  {
    term: "Tríade Sagrada",
    keys: ["tríade sagrada", "tríade"],
    explanation: "O trio principal da sua identidade astrológica: Sol (sua essência e vitalidade), Lua (suas emoções e intuição) e Ascendente (sua personalidade externa e máscara)."
  },
  {
    term: "Estrela Sirius",
    keys: ["estrela sirius", "sirius"],
    explanation: "A estrela mais brilhante do céu noturno, associada à sabedoria espiritual e iluminação interior que guia a jornada da Sirius Academy."
  },
  {
    term: "Lilith",
    keys: ["lilith", "lua negra"],
    explanation: "Representa seus desejos ocultos, poder instintivo, rebeldia interna e as áreas onde você recusa ser dominada ou silenciada."
  },
  {
    term: "Retrógrado",
    keys: ["retrógrado", "retrógrados", "retrogradação"],
    explanation: "A ilusão de ótica de que um planeta está se movendo para trás no céu. Simboliza momentos de revisão, interiorização e reavaliação dos temas daquele planeta."
  }
];

const GLOSSARY_KEYS = GLOSSARY.flatMap(g => 
  g.keys.map(k => ({ key: k, term: g.term, explanation: g.explanation }))
).sort((a, b) => b.key.length - a.key.length);

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const GLOSSARY_REGEX = new RegExp(
  "(" + GLOSSARY_KEYS.map(k => `(?<![a-zA-Z0-9À-ÿ])(?:${escapeRegExp(k.key)})(?![a-zA-Z0-9À-ÿ])`).join('|') + ")",
  "gi"
);

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [activeSection, setActiveSection] = useState("inicio");
  const [sectionContent, setSectionContent] = useState<Section | null>(null);
  const [introContent, setIntroContent] = useState("");
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [podcastUrl, setPodcastUrl] = useState<string | null>(null);
  const [podcastError, setPodcastError] = useState("");
  const [glossaryTerm, setGlossaryTerm] = useState<{ term: string; explanation: string } | null>(null);
  const router = useRouter();

  const renderTextWithGlossary = (text: string) => {
    if (!text) return "";
    const parts = text.split(GLOSSARY_REGEX);
    return parts.map((part, index) => {
      if (!part) return null;
      const lowerPart = part.toLowerCase();
      const match = GLOSSARY_KEYS.find(k => k.key.toLowerCase() === lowerPart);
      if (match) {
        return (
          <button
            key={index}
            onClick={() => setGlossaryTerm({ term: match.term, explanation: match.explanation })}
            className="inline-block px-1 rounded transition-all cursor-help border-b border-dashed font-medium"
            style={{
              borderColor: C.gold,
              color: C.gold,
              background: `${C.gold}12`,
              verticalAlign: "baseline"
            }}
            title={`Clique para ver o significado de ${match.term} 🌙`}
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("sirius_token");
    if (!token) { router.push("/"); return; }

    api.get<User>("/auth/me")
      .then(u => {
        setUser(u);
        return api.get<Chart>("/members/chart")
          .then(c => {
            setChart(c);
            return api.get<Section>("/members/sections/portal").catch(() =>
              api.get<Section>("/members/sections/introducao")
            );
          })
          .then(s => {
            setIntroContent(s.content);
          })
          .catch(() => {
            // Se o mapa não foi encontrado e é admin, não redireciona
            if (u.role === "admin") {
              console.log("Admin sem mapa astral associado");
            } else {
              router.push("/");
            }
          });
      })
      .catch(() => {
        router.push("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setActiveSection(tab);
      }
    }
  }, []);

  const loadSection = useCallback(async (key: string) => {
    if (key === "inicio" || key === "podcast" || key === "analise") {
      setActiveSection(key);
      setSectionContent(null);
      return;
    }
    setSectionLoading(true);
    setActiveSection(key);
    try {
      const s = await api.get<Section>(`/members/sections/${key}`);
      setSectionContent(s);
      setReadSections(prev => new Set(Array.from(prev).concat(key)));
    } catch {
      // silently fail
    } finally {
      setSectionLoading(false);
    }
  }, []);

  const generatePodcast = async () => {
    // Libera URL anterior para evitar memory leak
    if (podcastUrl) {
      URL.revokeObjectURL(podcastUrl);
      setPodcastUrl(null);
    }
    setPodcastLoading(true);
    setPodcastError("");
    try {
      const blob = await api.download("/members/podcast", "POST");
      const url = URL.createObjectURL(blob);
      setPodcastUrl(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar podcast";
      // Se o mapa está incompleto, orienta a usuária
      if (msg.includes("Regenere o mapa") || msg.includes("não possui seções")) {
        setPodcastError("Seu mapa precisa ser regenerado antes de gerar o podcast. Entre em contato com o suporte.");
      } else {
        setPodcastError(msg);
      }
      setTimeout(() => setPodcastError(""), 12000);
    } finally {
      setPodcastLoading(false);
    }
  };

  const downloadPodcast = () => {
    if (!podcastUrl) return;
    const a = document.createElement("a");
    a.href = podcastUrl;
    a.download = "podcast-da-alma.mp3";
    a.click();
  };

  const logout = () => {
    clearToken();
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="text-3xl animate-spin" style={{ color: C.primary }}>✦</div>
    </div>
  );

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const sidebarContent = (
    <>
      <div className="p-6 border-b" style={{ borderColor: C.border }}>
        <h1 className="text-xl font-bold" style={{ color: "#ffffff" }}>Sirius Academy</h1>
        <div className="mt-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: C.dark, color: C.light }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-semibold" style={{ color: "#ffffff" }}>{user?.name?.split(" ")[0]}</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Itens de seção normais */}
        {SIDEBAR_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => { loadSection(item.key); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left hover:text-white"
            style={{
              background: activeSection === item.key ? C.dark : "transparent",
              color: activeSection === item.key ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
              border: activeSection === item.key ? `1px solid ${C.border}` : "1px solid transparent",
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.key !== "inicio" && readSections.has(item.key) && (
              <span className="ml-auto text-xs" style={{ color: C.primary }}>✓</span>
            )}
          </button>
        ))}

        {/* ── Separador ── */}
        <div className="pt-2 pb-1">
          <div className="h-px" style={{ background: C.border }} />
        </div>

        {/* ── Análise do dia — a parte que se usa toda semana ── */}
        <button
          onClick={() => { loadSection("analise"); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left hover:opacity-90"
          style={{
            background: activeSection === "analise" ? C.dark : "transparent",
            color: "#ffffff",
            border: `1px solid ${activeSection === "analise" ? C.gold + "66" : C.border}`,
          }}
        >
          <span className="text-base" style={{ color: C.gold }}>☽</span>
          <div className="flex-1 min-w-0">
            <p className="leading-tight">Análise do dia</p>
            <p className="text-xs font-normal leading-tight mt-0.5" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
              Escolha uma data
            </p>
          </div>
        </button>

        {/* ── Separador ── */}
        <div className="pt-2 pb-1">
          <div className="h-px" style={{ background: C.border }} />
        </div>

        {/* ── Podcast da Alma — destaque especial ── */}
        <button
          onClick={() => { loadSection("podcast"); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left relative overflow-hidden hover:opacity-90"
          style={{
            background: activeSection === "podcast"
              ? "linear-gradient(135deg, #2a1060, #1a0a3e)"
              : "linear-gradient(135deg, #1e0a50 0%, #120630 100%)",
            color: "#ffffff",
            border: `1px solid ${activeSection === "podcast" ? C.primary + "88" : C.primary + "44"}`,
            boxShadow: activeSection === "podcast" ? `0 0 20px rgba(127,119,221,0.3)` : `0 0 10px rgba(127,119,221,0.1)`,
          }}
        >
          <span className="text-base">🎙️</span>
          <div className="flex-1 min-w-0">
            <p className="leading-tight" style={{ color: "#ffffff" }}>Podcast da Minha Alma</p>
            <p className="text-xs font-normal leading-tight mt-0.5" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
              {podcastUrl ? "Pronto para ouvir ✓" : "Lunna & Apollo · ~6 min"}
            </p>
          </div>
          {podcastUrl && (
            <span className="text-xs" style={{ color: "#4ade80" }}>🎧</span>
          )}
          {podcastLoading && (
            <span className="text-xs animate-pulse" style={{ color: C.primary }}>⏳</span>
          )}
        </button>
      </nav>

      <div className="p-4 space-y-2 border-t" style={{ borderColor: C.border }}>
        <div className="mb-2 px-2">
          <div className="h-1 rounded-full" style={{ background: C.border }}>
            <div
              className="h-1 rounded-full transition-all"
              style={{ width: `${(readSections.size / 7) * 100}%`, background: C.primary }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "rgba(255, 255, 255, 0.6)" }}>{readSections.size}/7 seções lidas</p>
        </div>


        {user?.role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 mb-2"
            style={{ background: C.dark, color: C.gold, border: `1px solid ${C.border}` }}
          >
            ⚙️ Painel Admin
          </button>
        )}

        <button
          onClick={logout}
          className="w-full text-xs px-4 py-2 rounded-xl transition-all hover:text-white"
          style={{ color: "rgba(255, 255, 255, 0.6)" }}
        >
          Sair
        </button>
      </div>
    </>
  );

  // ── Página de Podcast ────────────────────────────────────────────────────
  const podcastPage = () => (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Título */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎙️</div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: C.light }}>Podcast da Minha Alma</h2>
        <p className="text-sm" style={{ color: C.muted }}>
          Lunna e Apollo revelam os segredos do seu Mapa da Alma em uma conversa profunda e exclusiva
        </p>
      </div>

      {/* Narradores */}
      <div className="flex gap-4 mb-8 justify-center">
        {[
          { name: "Lunna", desc: "Intuição & Emoções", icon: "🌙", color: "#9b8fd4" },
          { name: "Apollo", desc: "Revelações & Insights", icon: "☀️", color: "#c4a84f" },
        ].map(n => (
          <div
            key={n.name}
            className="flex-1 max-w-[180px] rounded-2xl p-4 text-center"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="text-3xl mb-2">{n.icon}</div>
            <p className="font-bold text-sm mb-1" style={{ color: n.color }}>{n.name}</p>
            <p className="text-xs" style={{ color: C.muted }}>{n.desc}</p>
          </div>
        ))}
      </div>

      {/* Estado: não gerado */}
      {!podcastUrl && !podcastLoading && (
        <div className="text-center">
          <button
            onClick={generatePodcast}
            className="px-10 py-5 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, #5b4fd4, #3C3489)`,
              color: "#f0eeff",
              border: `1px solid ${C.primary}66`,
              boxShadow: `0 0 40px rgba(127,119,221,0.35)`,
            }}
          >
            🎙️ Gerar Meu Podcast Agora
          </button>
          <p className="text-xs mt-3" style={{ color: C.muted }}>
            Geração única e personalizada · pode levar até 2 minutos
          </p>

          {podcastError && (
            <p className="mt-4 text-sm" style={{ color: "#ff8080" }}>{podcastError}</p>
          )}
        </div>
      )}

      {/* Estado: gerando */}
      {podcastLoading && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <div className="text-4xl mb-4 animate-pulse">🎙️</div>
          <p className="font-semibold text-lg mb-1" style={{ color: C.light }}>
            Lunna e Apollo estão preparando...
          </p>
          <p className="text-sm mb-6" style={{ color: C.muted }}>
            Gerando roteiro e áudio exclusivo do seu mapa da alma
          </p>
          <div className="flex gap-1 justify-center mb-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-1.5 rounded-full animate-bounce"
                style={{
                  height: 20 + (i % 3) * 10,
                  background: C.primary,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: C.muted }}>Isso pode levar até 2 minutos ✨</p>
        </div>
      )}

      {/* Estado: pronto */}
      {podcastUrl && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0f0b2e, #1a0a3e)`,
            border: `1px solid ${C.primary}55`,
            boxShadow: `0 0 50px rgba(127,119,221,0.2)`,
          }}
        >
          <div className="px-6 pt-6 pb-4 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.dark})` }}
            >
              🎙️
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: C.light }}>Podcast da Alma</p>
              <p className="text-sm" style={{ color: C.muted }}>
                {user?.name?.split(" ")[0]} · com Lunna & Apollo
              </p>
            </div>
            <div className="ml-auto">
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: "#4ade8022", color: "#4ade80", border: "1px solid #4ade8044" }}>
                ✓ Pronto
              </span>
            </div>
          </div>

          <div className="px-6 pb-3">
            <audio
              controls
              autoPlay
              src={podcastUrl}
              className="w-full"
              style={{ borderRadius: 12, accentColor: C.primary }}
            />
          </div>

          <div className="px-6 pb-6 pt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={downloadPodcast}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
              style={{ background: C.dark, color: C.light, border: `1px solid ${C.border}` }}
            >
              ⬇️ Baixar MP3
            </button>
            <button
              onClick={generatePodcast}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
              style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
              title="Gera uma nova versão do podcast"
            >
              🔄 Regenerar
            </button>
          </div>

          {podcastError && (
            <div className="px-6 pb-4">
              <p className="text-sm" style={{ color: "#ff8080" }}>{podcastError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Página inicial ───────────────────────────────────────────────────────
  const inicioPage = () => (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <p className="text-3xl font-bold mb-2" style={{ color: C.text }}>
        Seja bem-vinda,{" "}
        <span style={{ color: C.primary }}>{user?.name?.split(" ")[0]}</span>.
      </p>

      {user?.role === "admin" && !chart && (
        <div className="mb-6 p-4 rounded-xl border text-sm" style={{ background: "#2a1b0d", borderColor: "#EF9F27", color: "#EF9F27" }}>
          <strong>Aviso de Administrador:</strong> Esta conta admin não possui um mapa natal gerado no banco de dados. 
          Para visualizar os dados reais, preencha o funil ou acesse a aba <strong>&quot;Gerar Manual&quot;</strong> no Painel Admin para gerar seu mapa.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4 mb-8">
        {[
          { label: "Sol", value: chart?.sun_sign, icon: "☀️" },
          { label: "Lua", value: chart?.moon_sign, icon: "🌙" },
          { label: "Ascendente", value: chart?.rising_sign, icon: "⬆️" },
        ].map(b => (
          <div key={b.label} className="px-4 py-2 rounded-full text-sm" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.light }}>
            {b.icon} {b.label}: <strong>{b.value}</strong>
          </div>
        ))}
      </div>

      {/* ── Card de destaque da Análise do Dia & Previsão ── */}
      <button
        onClick={() => loadSection("analise")}
        className="w-full mb-8 rounded-2xl p-5 sm:p-6 flex items-center gap-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: "linear-gradient(135deg, #121420 0%, #0c0e17 100%)",
          border: "1px solid rgba(226, 184, 87, 0.45)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(226, 184, 87, 0.08)",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "rgba(226, 184, 87, 0.12)", border: "1px solid rgba(226, 184, 87, 0.3)", color: "#E2B857" }}
        >
          ☽
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: "rgba(226, 184, 87, 0.15)", color: "#E2B857" }}>
              ✦ Decisão & Timing
            </span>
            <span className="text-xs" style={{ color: "#8A8F9E" }}>
              Atualizado hoje
            </span>
          </div>
          <p className="font-extrabold text-base sm:text-lg text-white">
            Análise do Dia & Previsão de Período
          </p>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "#C5C8D4" }}>
            Acesse as 5 forças ativas no seu céu, o planeta líder e a síntese prática para seus negócios e rotina.
          </p>
        </div>
        <div className="flex-shrink-0 text-xl font-bold" style={{ color: "#E2B857" }}>›</div>
      </button>

      {chart?.svg && (
        <div
          className="w-full mb-8 rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
          dangerouslySetInnerHTML={{ __html: chart.svg }}
        />
      )}

      {/* ── Card de destaque do Podcast ── */}
      <button
        onClick={() => loadSection("podcast")}
        className="w-full mb-8 rounded-2xl p-5 flex items-center gap-4 text-left transition-all hover:scale-[1.02] active:scale-[0.99]"
        style={{
          background: `linear-gradient(135deg, #1e0a50, #2d1060, #1a0a3e)`,
          border: `1px solid ${C.primary}55`,
          boxShadow: `0 0 30px rgba(127,119,221,0.2)`,
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${C.primary}55, ${C.dark}88)`, border: `1px solid ${C.primary}44` }}
        >
          🎙️
        </div>
        <div className="flex-1">
          <p className="font-bold text-base mb-0.5" style={{ color: C.light }}>
            Podcast da Minha Alma
          </p>
          <p className="text-sm" style={{ color: C.muted }}>
            Lunna & Apollo revelam seus padrões, feridas e dons · ~6 min de áudio exclusivo
          </p>
        </div>
        <div className="flex-shrink-0" style={{ color: C.primary }}>›</div>
      </button>

      {introContent && (
        <div className="prose max-w-none">
          {introContent.split("\n\n").map((p, i) => (
            <p key={i} className="leading-relaxed mb-4" style={{ color: C.text }}>{renderTextWithGlossary(p)}</p>
          ))}
        </div>
      )}
    </div>
  );

  // ── Conteúdo principal ───────────────────────────────────────────────────
  const mainContent = () => {
    if (activeSection === "analise") return <AnaliseDoDia nome={user?.name} />;
    if (activeSection === "podcast") return podcastPage();
    if (activeSection === "inicio") return inicioPage();

    if (sectionLoading) return (
      <div className="flex items-center justify-center h-64">
        <div className="text-3xl animate-spin" style={{ color: C.primary }}>✦</div>
      </div>
    );

    const sidebarItem = SIDEBAR_ITEMS.find(s => s.key === activeSection);
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: "#ffffff" }}>
          {sidebarItem?.icon} {sidebarItem?.label}
        </h2>
        <div className="h-px mb-8" style={{ background: C.border }} />
        {sectionContent?.content.split("\n\n").map((p, i) => (
          <p key={i} className="leading-relaxed mb-5 text-base" style={{ color: C.text }}>{renderTextWithGlossary(p)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ background: C.bg }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300
          lg:relative lg:translate-x-0 lg:flex
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 260, background: C.card, borderRight: `1px solid ${C.border}` }}
      >
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 px-6 py-4 lg:hidden" style={{ borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: C.light }}>☰</button>
          <span className="font-bold" style={{ color: C.light }}>Sirius Academy</span>
        </header>
        <main className="flex-1 overflow-auto">
          {mainContent()}
        </main>
      </div>

      {/* Glossary Modal */}
      {glossaryTerm && (
        <>
          <div 
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-all"
            onClick={() => setGlossaryTerm(null)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-[90%] max-w-md rounded-2xl p-6 border transition-all"
            style={{
              background: `linear-gradient(135deg, #161033 0%, #0d0922 100%)`,
              borderColor: C.gold + "55",
              boxShadow: `0 0 40px rgba(239,159,39,0.15), inset 0 0 20px rgba(127,119,221,0.1)`
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.gold }}>
                  📖 Astrologuês da Sirius
                </p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: C.light }}>
                  {glossaryTerm.term}
                </h3>
              </div>
              <button 
                onClick={() => setGlossaryTerm(null)}
                className="text-xl w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
                style={{ color: C.muted }}
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#c8c0f0" }}>
              {glossaryTerm.explanation}
            </p>
            
            <button
              onClick={() => setGlossaryTerm(null)}
              className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${C.gold}, #c67c13)`,
                color: "#120b24",
                boxShadow: `0 0 20px rgba(239,159,39,0.25)`
              }}
            >
              Entendi ✦
            </button>
          </div>
        </>
      )}
    </div>
  );
}
