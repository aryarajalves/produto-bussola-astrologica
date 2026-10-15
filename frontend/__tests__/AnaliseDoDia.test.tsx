import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnaliseDoDia from "@/components/AnaliseDoDia";

// A api é mockada: aqui testamos a tela, não o cálculo de trânsitos (esse tem
// teste próprio no backend, em tests/test_transitos.py).
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "@/lib/api";

const ANALISE = {
  id: "a1",
  data: "2026-10-06",
  sintese: "O dia junta duas coisas que costumam brigar.",
  svg: '<svg data-testid="roda"><circle cx="5" cy="5" r="4" /></svg>',
  status: "ok",
  hora_de_nascimento_conhecida: true,
  posicoes: [
    {
      planeta: "Moon", planeta_pt: "Lua", casa: 5, signo: "Leão",
      retrogrado: false, ate: "2026-10-07",
      texto: "O sentimento pede saída criativa.",
    },
    {
      planeta: "Venus", planeta_pt: "Vênus", casa: 7, signo: "Escorpião",
      retrogrado: true, ate: null,
      texto: "Facilita o encontro com o outro.",
    },
  ],
};

describe("AnaliseDoDia", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue([]);
    vi.mocked(api.post).mockReset().mockResolvedValue(ANALISE);
  });

  it("abre com o seletor de data e sem leitura nenhuma", async () => {
    render(<AnaliseDoDia nome="Jordão Silva" />);
    expect(screen.getByLabelText("Data")).toBeDefined();
    expect(screen.getByText("Ver esse dia")).toBeDefined();
    expect(screen.queryByText(/sentimento pede/)).toBeNull();
  });

  it("pede a análise da data escolhida e mostra as posições", async () => {
    render(<AnaliseDoDia nome="Jordão Silva" />);

    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-10-06" } });
    fireEvent.click(screen.getByText("Ver esse dia"));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/members/analise", { data: "2026-10-06" },
    ));

    expect(await screen.findByText(/O dia junta duas coisas/)).toBeDefined();
    expect(screen.getByText("O sentimento pede saída criativa.")).toBeDefined();
    expect(screen.getByText("Facilita o encontro com o outro.")).toBeDefined();
  });

  it("mostra a área da vida, e o termo técnico só como legenda", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    // O título do bloco é a área da vida, não "casa 5"
    expect(await screen.findByText("criar e se expor")).toBeDefined();
    expect(screen.getByText("o outro e parcerias")).toBeDefined();
    // A linha técnica existe, mas em letra pequena, abaixo. O nome do planeta
    // vem num <span> próprio (é o que separa dois cartões da mesma casa), então
    // a linha inteira se lê pelo textContent.
    const legenda = screen.getByText(/em Leão, casa 5/);
    expect(legenda.textContent).toContain("Lua em Leão, casa 5");
  });

  it("escreve por extenso a data lida e a validade de cada posição", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    expect(await screen.findByText("6 de outubro de 2026")).toBeDefined();
    expect(screen.getByText("até 07/10")).toBeDefined();
  });

  it("explica o retrógrado sem usar a palavra no lugar da explicação", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    expect(await screen.findByText(/voltando sobre o próprio caminho/)).toBeDefined();
  });

  it("avisa quando a hora de nascimento não é conhecida", async () => {
    vi.mocked(api.post).mockResolvedValue({ ...ANALISE, hora_de_nascimento_conhecida: false });
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    expect(await screen.findByText(/usamos meio-dia para calcular/)).toBeDefined();
  });

  it("mostra as posições mesmo quando a síntese não foi escrita", async () => {
    vi.mocked(api.post).mockResolvedValue({ ...ANALISE, sintese: "", status: "sem_ia" });
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    expect(await screen.findByText("O sentimento pede saída criativa.")).toBeDefined();
    expect(screen.getByText(/resumo não foi/)).toBeDefined();
  });

  it("mostra o erro do servidor em vez de uma tela vazia", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Faltam dados de nascimento para calcular: latitude."));
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    expect(await screen.findByText(/Faltam dados de nascimento/)).toBeDefined();
  });

  it("lista o histórico e reabre uma data ao clicar", async () => {
    vi.mocked(api.get).mockResolvedValue([
      { id: "h1", data: "2026-10-06", status: "ok", tem_sintese: true },
      { id: "h2", data: "2026-09-30", status: "ok", tem_sintese: true },
    ]);
    render(<AnaliseDoDia />);

    const botao = await screen.findByText("30/09");
    fireEvent.click(botao);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/members/analise", { data: "2026-09-30" },
    ));
  });

  it("o desenho fica atrás de um clique, não aberto na cara da pessoa", async () => {
    render(<AnaliseDoDia nome="Jordão" />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    const abrir = await screen.findByText("Ver o desenho do dia");
    expect(screen.queryByTestId("roda")).toBeNull();

    fireEvent.click(abrir);
    expect(screen.getByTestId("roda")).toBeDefined();
  });
});

describe("AnaliseDoDia — os aspectos ao mapa da pessoa", () => {
  const COM_ASPECTOS = {
    ...ANALISE,
    posicoes: [
      {
        planeta: "Venus", planeta_pt: "Vênus", casa: 10, signo: "Escorpião",
        grau: 6, retrogrado: true, ate: "2026-10-19",
        texto: "Seu trabalho é bem visto agora.",
        prioridade: 19.6, destaque: true,
        aspectos: [
          {
            aspecto: "square", aspecto_pt: "em atrito com", faz: "cria atrito, e atrito obriga a decidir",
            ponto: "Ascendant", ponto_pt: "seu Ascendente",
            ponto_significa: "como você se apresenta e o seu corpo",
            orbe: 0.8, aplicando: true, exato: true, forca: 19.6,
          },
        ],
      },
      {
        planeta: "Mars", planeta_pt: "Marte", casa: 7, signo: "Leão",
        grau: 8, retrogrado: false, ate: null,
        texto: "O atrito é com o outro.",
        prioridade: 0, destaque: false, aspectos: [],
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue([]);
    vi.mocked(api.post).mockReset().mockResolvedValue(COM_ASPECTOS);
  });

  it("mostra o que o trânsito bate no mapa dela, em linguagem de vida", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    expect(await screen.findByText(/No seu mapa, isso bate em/i)).toBeDefined();
    expect(screen.getByText(/como você se apresenta e o seu corpo/)).toBeDefined();
    expect(screen.getByText(/em atrito com seu Ascendente/)).toBeDefined();
  });

  it("marca o planeta mais forte do dia", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));
    expect(await screen.findByText(/O mais forte de hoje/i)).toBeDefined();
  });

  it("diz se o aspecto está no pico, apertando ou afrouxando", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));
    expect(await screen.findByText(/no pico agora/)).toBeDefined();
  });

  it("mostra o grau exato do planeta", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));
    expect(await screen.findByText(/a 6° de Escorpião, casa 10/)).toBeDefined();
  });

  it("não quebra numa análise gravada antes dos aspectos existirem", async () => {
    // O banco tem linhas antigas, e a rota serve essas do cache.
    const antiga = {
      ...ANALISE,
      posicoes: [{
        planeta: "Moon", planeta_pt: "Lua", casa: 5, signo: "Leão",
        retrogrado: false, ate: null, texto: "O sentimento pede saída criativa.",
      }],
    };
    vi.mocked(api.post).mockResolvedValue(antiga);
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByText("Ver esse dia"));

    expect(await screen.findByText("O sentimento pede saída criativa.")).toBeDefined();
    expect(screen.queryByText(/No seu mapa, isso bate em/i)).toBeNull();
  });
});
