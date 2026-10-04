import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import HistoricoPesquisas from "@/components/HistoricoPesquisas";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("HistoricoPesquisas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza mensagem amigável quando não há pesquisas registradas", async () => {
    (api.get as any).mockResolvedValueOnce([]);

    render(<HistoricoPesquisas />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum histórico registrado no momento/i)).toBeDefined();
    });

    expect(screen.getByText(/Histórico de Pesquisas e Gerações/i)).toBeDefined();
  });

  it("renderiza lista de pesquisas e mapas gerados com sucesso e horário de Brasília", async () => {
    (api.get as any).mockResolvedValueOnce([
      {
        id: "log-1",
        name: "Aryaraj Alves Fernandes",
        birth_city: "Fortaleza",
        birth_date: "1998-03-09",
        birth_time: "18:35",
        status: "success",
        model_used: "kerykeion / gemini",
        // UTC 20:27:00 -> Horário de Brasília (UTC-3) é 17:27
        created_at: "2026-10-01T20:27:00Z",
      },
    ]);

    render(<HistoricoPesquisas />);

    await waitFor(() => {
      expect(screen.getByText(/Aryaraj Alves Fernandes/i)).toBeDefined();
    });

    expect(screen.getByText(/✅ Mapa Gerado/i)).toBeDefined();
    expect(screen.getByText(/📍 Fortaleza/i)).toBeDefined();
    expect(screen.getByText(/🤖 kerykeion \/ gemini/i)).toBeDefined();
    // Confirma que a hora convertida para horário de Brasília (17:27) é exibida
    expect(screen.getByText(/17:27/)).toBeDefined();
  });

  it("aplica sistema de paginação com seletor de tamanho e navegação interativa", async () => {
    const mockLogs = Array.from({ length: 25 }, (_, i) => ({
      id: `log-${i + 1}`,
      name: `Cliente Teste ${i + 1}`,
      birth_city: "São Paulo",
      birth_date: "1990-01-01",
      birth_time: "12:00",
      status: "success",
      model_used: "kerykeion / gemini",
      created_at: "2026-10-01T15:00:00Z",
    }));

    (api.get as any).mockResolvedValueOnce(mockLogs);

    render(<HistoricoPesquisas />);

    await waitFor(() => {
      // Cliente 1 está na primeira página (padrão de 5 por página)
      expect(screen.getByText("Cliente Teste 1")).toBeDefined();
      expect(screen.getByText("Cliente Teste 5")).toBeDefined();
    });

    // Cliente 6 NÃO deve estar visível na primeira página com 5 por página
    expect(screen.queryByText("Cliente Teste 6")).toBeNull();

    // Controles de paginação presentes
    expect(screen.getByTestId("pagination-bar")).toBeDefined();
    expect(screen.getByTestId("page-indicator").textContent).toContain("Página 1 de 5");
    expect(screen.getByTestId("pagination-info").textContent).toContain("Mostrando 1 a 5 de 25 registros");

    // Testar seletor de itens por página mudando para 20
    const select = screen.getByTestId("page-size-select");
    fireEvent.change(select, { target: { value: "20" } });

    // Agora mostrando 20 itens
    expect(screen.getByText("Cliente Teste 20")).toBeDefined();
    expect(screen.queryByText("Cliente Teste 21")).toBeNull();
    expect(screen.getByTestId("page-indicator").textContent).toContain("Página 1 de 2");
    expect(screen.getByTestId("pagination-info").textContent).toContain("Mostrando 1 a 20 de 25 registros");

    // Clicar para ir para a próxima página
    const nextBtn = screen.getByRole("button", { name: /Próxima →/i });
    fireEvent.click(nextBtn);

    // Agora na página 2: Cliente 21 deve estar visível e Cliente 1 não
    expect(screen.getByText("Cliente Teste 21")).toBeDefined();
    expect(screen.queryByText("Cliente Teste 1")).toBeNull();
    expect(screen.getByTestId("page-indicator").textContent).toContain("Página 2 de 2");
  });

  it("permite selecionar múltiplos registros e exclui em massa após confirmação no modal", async () => {
    (api.get as any).mockResolvedValue([
      { id: "log-1", name: "Cliente Log 1", status: "success" },
      { id: "log-2", name: "Cliente Log 2", status: "failed" },
    ]);
    (api.delete as any).mockResolvedValue({ success: true, deleted_count: 2 });

    render(<HistoricoPesquisas />);

    await waitFor(() => {
      expect(screen.getByText("Cliente Log 1")).toBeDefined();
      expect(screen.getByText("Cliente Log 2")).toBeDefined();
    });

    // Clica no checkbox "Selecionar todos da página"
    const selectAllCheckbox = screen.getByTestId("select-all-logs-checkbox");
    fireEvent.click(selectAllCheckbox);

    // Deve exibir o contador de selecionados e o botão de exclusão em massa
    await waitFor(() => {
      expect(screen.getByTestId("selected-logs-count").textContent).toContain("2 selecionado(s)");
      expect(screen.getByTestId("batch-delete-logs-btn")).toBeDefined();
    });

    // Clica para abrir o modal de confirmação
    fireEvent.click(screen.getByTestId("batch-delete-logs-btn"));

    // O modal deve estar aberto com a pergunta de confirmação
    await waitFor(() => {
      expect(screen.getByText("Excluir Histórico em Massa")).toBeDefined();
      expect(screen.getByText(/Tem certeza que deseja excluir os 2 registros/i)).toBeDefined();
    });

    // Confirma a exclusão no botão do modal
    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/generation-logs/batch", {
        ids: ["log-1", "log-2"],
      });
    });
  });

  it("permite excluir um registro individual pelo botão de lixeira", async () => {
    (api.get as any).mockResolvedValue([
      { id: "log-individual", name: "Cliente Individual", status: "success" },
    ]);
    (api.delete as any).mockResolvedValue({ success: true });

    render(<HistoricoPesquisas />);

    await waitFor(() => {
      expect(screen.getByText("Cliente Individual")).toBeDefined();
    });

    // Clica no botão de excluir individual
    const deleteBtn = screen.getByTestId("delete-log-btn-log-individual");
    fireEvent.click(deleteBtn);

    // Modal individual deve abrir
    await waitFor(() => {
      expect(screen.getByText("Excluir Histórico de Pesquisa")).toBeDefined();
      expect(screen.getByText(/Tem certeza que deseja excluir o histórico de "Cliente Individual"/i)).toBeDefined();
    });

    // Confirma a exclusão
    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/generation-logs/log-individual");
    });
  });

  it("não renderiza mais o botão Ver Detalhes nos itens do histórico", async () => {
    (api.get as any).mockResolvedValue([
      {
        id: "log-uuid-1",
        client_id: "user-uuid-1",
        name: "Cliente Sem Detalhes",
        status: "success",
      },
    ]);

    render(<HistoricoPesquisas onOpenClient={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Cliente Sem Detalhes")).toBeDefined();
    });

    expect(screen.queryByRole("button", { name: /Ver Detalhes/i })).toBeNull();
  });
});
