"use client";

/**
 * O tour de primeiro acesso.
 *
 * Quem entra aqui acabou de comprar e não sabe ler mapa. Se a primeira tela
 * for um desenho cheio de símbolo sem explicação, a pessoa fecha e não volta.
 * Este tour existe para que ela saia da primeira sessão sabendo três coisas:
 * o que é cada tela, o que a plataforma faz por ela, e o que ela faz amanhã.
 *
 * Decisões que valem manutenção:
 *   - O conteúdo é DADO (a lista PASSOS), não JSX espalhado. Mexer no texto,
 *     acrescentar ou remover um passo é editar uma entrada da lista.
 *   - Abre sozinho só na primeira vez, e fica acessível pelo menu depois.
 *     Tour que reabre todo dia vira obstáculo.
 *   - O "já vi" fica no navegador. Se a pessoa trocar de aparelho ela vê de
 *     novo, e isso é melhor que gravar no banco um dado que não vale nada.
 */

import { useCallback, useEffect, useState } from "react";

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

const CHAVE = "bussola_tutorial_visto";

interface Passo {
  etiqueta: string;
  titulo: string;
  corpo: string[];
  lista?: { marca: string; texto: string }[];
  rodape?: string;
}

const PASSOS: Passo[] = [
  {
    etiqueta: "O que é isso aqui",
    titulo: "Não é horóscopo. É um relógio.",
    corpo: [
      "Horóscopo de revista pega uma data de nascimento e chuta uma frase para um doze avos da humanidade. Aqui é outra coisa.",
      "A sua Bússola é o céu do minuto exato em que você nasceu, calculado com a mesma astronomia que a NASA usa, e um jeito de ler o que o céu de qualquer data faz nesse mapa.",
      "Serve para uma coisa prática: escolher a hora. Não é adivinhar o que vai acontecer, é parar de remar contra a maré sem perceber.",
    ],
  },
  {
    etiqueta: "Minha Bússola",
    titulo: "O ponto de partida é o seu nascimento",
    corpo: [
      "Data, hora e cidade. Com esses três dados a ferramenta desenha o seu mapa e passa a calcular tudo contra ele.",
      "A hora é o dado que mais importa e o que mais gente erra. Ela move as áreas da vida umas quinze vezes mais rápido que a data: errar duas horas troca a área sobre a qual a leitura fala.",
    ],
    lista: [
      { marca: "☉", texto: "Sol — quem você é quando ninguém está pedindo nada" },
      { marca: "☽", texto: "Lua — o que você sente antes de pensar" },
      { marca: "↑", texto: "Ascendente — como você chega nos lugares" },
    ],
    rodape: "Se não souber a hora exata, procure na certidão de nascimento. Vale o esforço uma vez só.",
  },
  {
    etiqueta: "A leitura",
    titulo: "Escolha a data. E, se quiser, traga a pergunta.",
    corpo: [
      "Essa é a tela que você vai usar sempre. Escolha qualquer dia — hoje, a semana que vem, o dia daquela reunião — e o sistema calcula onde os cinco planetas rápidos estão passando nas casas do SEU mapa naquele dia.",
      "Embaixo da data tem dois campos opcionais: a área que está em jogo e a sua pergunta. Preenchendo, a leitura deixa de ser sobre o dia e passa a ser sobre o que você trouxe.",
      "Sem eles você recebe o retrato do dia. Com eles você recebe uma resposta.",
    ],
  },
  {
    etiqueta: "Como ler",
    titulo: "Cada cartão tem quatro informações",
    corpo: ["Vale aprender uma vez. Depois você lê em dez segundos:"],
    lista: [
      { marca: "1", texto: "O título é a área da vida que acendeu: carreira, dinheiro, casa, parcerias" },
      { marca: "2", texto: "A linha pequena é o dado técnico, para quem quiser conferir" },
      { marca: "3", texto: "\"No seu mapa, isso bate em\" é a parte que é só sua, e não existe no mapa de mais ninguém" },
      { marca: "4", texto: "O selo \"até tal dia\" é o prazo: depois disso essa porta fecha" },
    ],
    rodape: "O cartão com a borda dourada é o que mais pesa naquele dia. Se você só tiver dois minutos, leia esse.",
  },
  {
    etiqueta: "A síntese",
    titulo: "Um parágrafo que responde, não que enrola",
    corpo: [
      "Acima dos cartões vem um texto curto costurando os cinco numa leitura só. Ele não repete os cartões: procura o fio comum, ou o atrito entre dois deles.",
      "Se você trouxe uma pergunta, é ela que o texto responde. E se o céu não estiver falando do seu assunto naquele dia, ele diz isso com todas as letras em vez de forçar uma ligação que não existe.",
      "Termina sempre em algo que dá para fazer no mesmo dia, sem depender de ninguém.",
    ],
  },
  {
    etiqueta: "Diário de bordo",
    titulo: "O valor aparece na terceira leitura",
    corpo: [
      "Toda data que você lê fica guardada no diário, com a pergunta que você fez naquele dia.",
      "A primeira leitura é interessante. A quinta é outra coisa: você começa a ver o próprio padrão, e a reconhecer o tipo de semana antes dela acontecer.",
    ],
    rodape: "Este tutorial fica no menu da esquerda. Pode voltar aqui quando quiser.",
  },
];

export default function Tutorial({
  aberto,
  onFechar,
  nome,
}: {
  aberto: boolean;
  onFechar: () => void;
  nome?: string;
}) {
  const [passo, setPasso] = useState(0);

  const fechar = useCallback(() => {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      // Janela anônima ou storage bloqueado: o tour reabre na próxima visita.
      // Chato, mas muito melhor que a tela não abrir.
    }
    setPasso(0);
    onFechar();
  }, [onFechar]);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
      if (e.key === "ArrowLeft") setPasso((p) => Math.max(p - 1, 0));
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aberto, fechar]);

  if (!aberto) return null;

  const atual = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;
  // O cadastro aceita o nome como a pessoa digitou, e muita gente digita tudo
  // minúsculo. A primeira linha que ela lê não pode começar com "jordão".
  const bruto = nome?.trim().split(" ")[0] || "";
  const primeiroNome = bruto ? bruto.charAt(0).toUpperCase() + bruto.slice(1) : "";

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm"
        onClick={fechar}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial da plataforma"
        className="fixed z-[210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-2xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(145deg, #1b1540 0%, #120d2a 100%)",
          border: `1px solid ${C.primary}44`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          maxHeight: "88vh",
        }}
      >
        {/* Barra de progresso: a pessoa precisa saber que isso acaba */}
        <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="h-1 transition-all duration-300"
            style={{
              width: `${((passo + 1) / PASSOS.length) * 100}%`,
              background: `linear-gradient(90deg, ${C.primary}, ${C.gold})`,
            }}
          />
        </div>

        <div className="px-7 sm:px-10 pt-8 pb-6 overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: C.gold }}>
              {atual.etiqueta}
            </p>
            <p className="text-[11px] font-medium tabular-nums" style={{ color: C.muted }}>
              {passo + 1} de {PASSOS.length}
            </p>
          </div>

          <h2
            className="mt-4 text-2xl sm:text-[32px] font-bold leading-tight"
            style={{ color: "#ffffff" }}
          >
            {passo === 0 && primeiroNome ? `${primeiroNome}, ` : ""}
            {passo === 0 && primeiroNome
              ? atual.titulo.charAt(0).toLowerCase() + atual.titulo.slice(1)
              : atual.titulo}
          </h2>

          <div className="mt-5 space-y-4">
            {atual.corpo.map((p, i) => (
              <p key={i} className="text-[15px] sm:text-base leading-relaxed" style={{ color: C.text }}>
                {p}
              </p>
            ))}
          </div>

          {atual.lista && (
            <div className="mt-6 space-y-3">
              {atual.lista.map((item) => (
                <div key={item.texto} className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 flex items-center justify-center rounded-lg text-sm font-bold"
                    style={{
                      width: 32,
                      height: 32,
                      background: C.dark,
                      color: C.gold,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {item.marca}
                  </span>
                  <p className="text-[15px] leading-relaxed pt-1" style={{ color: C.text }}>
                    {item.texto}
                  </p>
                </div>
              ))}
            </div>
          )}

          {atual.rodape && (
            <p
              className="mt-6 text-[13px] leading-relaxed px-4 py-3 rounded-xl"
              style={{ color: C.light, background: "rgba(127,119,221,0.08)" }}
            >
              {atual.rodape}
            </p>
          )}
        </div>

        <div
          className="px-7 sm:px-10 py-5 flex items-center justify-between gap-4"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <button
            onClick={fechar}
            className="text-[13px] font-medium transition-all hover:opacity-70"
            style={{ color: C.muted }}
          >
            Pular
          </button>

          <div className="flex items-center gap-2">
            {PASSOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setPasso(i)}
                aria-label={`Ir para o passo ${i + 1}`}
                className="rounded-full transition-all"
                style={{
                  width: i === passo ? 22 : 7,
                  height: 7,
                  background: i === passo ? C.gold : "rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {passo > 0 && (
              <button
                onClick={() => setPasso((p) => p - 1)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80"
                style={{ color: C.light, border: `1px solid ${C.border}` }}
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => (ultimo ? fechar() : setPasso((p) => p + 1))}
              className="px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${C.gold}, #c67c13)`,
                color: "#120b24",
              }}
            >
              {ultimo ? "Começar" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Se esta pessoa ainda não viu o tour neste navegador. */
export function tutorialPendente(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== "1";
  } catch {
    return false; // storage bloqueado: não insiste, para não abrir toda visita
  }
}
