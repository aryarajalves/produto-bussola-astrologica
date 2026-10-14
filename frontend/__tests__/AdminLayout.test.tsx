import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminPage from "@/app/(admin)/admin/page";
import { api } from "@/lib/api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/components/PesquisaClientes", () => ({
  default: () => null,
}));

vi.mock("@/components/ClientDrawer", () => ({
  default: () => null,
}));

vi.mock("@/components/backup/BackupAutomatico", () => ({
  default: () => <div data-testid="backup-automatico-mock">Conteúdo Backup Automático</div>,
}));

vi.mock("@/components/GerenciamentoLogs", () => ({
  default: () => <div data-testid="gerenciamento-logs-mock">Conteúdo Sistema de Logs</div>,
}));

describe("AdminLayout Navegação e Painel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("sirius_token", "fake-admin-token");
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/dashboard")) {
        return Promise.resolve({
          total_clients: 12,
          new_today: 3,
          this_week: 8,
          pending: 2,
          ready: 10,
          conversion_rate: 83,
          distribution_by_sign: [{ sign: "Áries", count: 4 }],
        });
      }
      if (url.includes("/auth/me")) {
        // O papel passou a decidir o painel inteiro: sem ele nada de gestão
        // é desenhado, que é exatamente a proteção contra o vazamento antigo.
        return Promise.resolve({
          name: "Aryaraj Fernandes",
          email: "aryarajunity@gmail.com",
          role: "admin",
        });
      }
      return Promise.resolve({});
    });
  });

  it("renderiza a barra lateral com a marca Bussola Astrologica, os botões Home, Pesquisa, Histórico, Backup Automático, Sistema de Logs, Gestão de Usuários e Sair", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Bussola Astrologica").length).toBeGreaterThan(0);
      expect(screen.getByText("Aryaraj Fernandes")).toBeDefined();
      expect(screen.getByText("aryarajunity@gmail.com")).toBeDefined();
    });

    expect(screen.getByText("Painel de Gestão Cósmica")).toBeDefined();
    expect(screen.getByText("Geral")).toBeDefined();
    expect(screen.getByText("Segurança")).toBeDefined();
    expect(screen.getByRole("button", { name: /home/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /pesquisa/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /histórico/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /backup automático/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sistema de logs/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /gestão de usuários/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sair/i })).toBeDefined();
  });

  it("renderiza o cabeçalho principal com Visão Geral (Home) e Bussola Astrologica", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Visão Geral (Home)")).toBeDefined();
    });

    expect(screen.getAllByText("Bussola Astrologica").length).toBeGreaterThan(0);
  });

  it("não exibe os cards de métricas na aba Home, priorizando o formulário de coleta", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Dados de nascimento do cliente/i)).toBeDefined();
    });

    expect(screen.queryByText("Total de Leads")).toBeNull();
    expect(screen.queryByText("Novos Hoje")).toBeNull();
    expect(screen.queryByText("Esta Semana")).toBeNull();
    expect(screen.queryByText("Taxa de Conversão")).toBeNull();
    expect(screen.queryByText("Distribuição por Signo Solar")).toBeNull();
  });

  it("permite navegar para a aba Pesquisa ao clicar no botão da barra lateral", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pesquisa/i })).toBeDefined();
    });

    const pesquisaBtn = screen.getByRole("button", { name: /pesquisa/i });
    fireEvent.click(pesquisaBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Pesquisa" })).toBeDefined();
    });
  });

  it("permite navegar para a aba Histórico ao clicar no botão da barra lateral", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /histórico/i })).toBeDefined();
    });

    const histBtn = screen.getByRole("button", { name: /histórico/i });
    fireEvent.click(histBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Histórico de Pesquisas" })).toBeDefined();
    });
  });

  it("permite navegar para a aba Backup Automático ao clicar no botão da barra lateral", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /backup automático/i })).toBeDefined();
    });

    const backupBtn = screen.getByRole("button", { name: /backup automático/i });
    fireEvent.click(backupBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Backup Automático" })).toBeDefined();
      expect(screen.getByTestId("backup-automatico-mock")).toBeDefined();
    });
  });

  it("permite navegar para a aba Sistema de Logs ao clicar no botão da barra lateral", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sistema de logs/i })).toBeDefined();
    });

    const logsBtn = screen.getByRole("button", { name: /sistema de logs/i });
    fireEvent.click(logsBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sistema de Logs" })).toBeDefined();
      expect(screen.getByTestId("gerenciamento-logs-mock")).toBeDefined();
    });
  });

  it("permite navegar para a aba Gestão de Usuários ao clicar no botão da barra lateral", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /gestão de usuários/i })).toBeDefined();
    });

    const gestaoBtn = screen.getByRole("button", { name: /gestão de usuários/i });
    fireEvent.click(gestaoBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Gestão de Usuários" })).toBeDefined();
    });
  });

  it("exibe o formulário de coleta de informações do usuário na aba Home", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Dados de nascimento do cliente/i)).toBeDefined();
    });

    expect(screen.getByPlaceholderText(/Ex: Gabriel Moreira Silva/i)).toBeDefined();
    expect(screen.getByText(/Salvar Informações do Lead/i)).toBeDefined();
  });

  it("abre o popup de confirmação ao clicar em Sair e desloga apenas ao confirmar", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sair/i })).toBeDefined();
    });

    // Modal de confirmação não deve estar presente inicialmente
    expect(screen.queryByText("Encerrar Sessão")).toBeNull();

    // Clica em Sair na barra lateral
    fireEvent.click(screen.getByRole("button", { name: /sair/i }));

    // Popup deve aparecer centralizado
    expect(screen.getByText("Encerrar Sessão")).toBeDefined();
    expect(
      screen.getByText(/Tem certeza de que deseja sair do painel administrativo/i)
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /confirmar saída/i })).toBeDefined();

    // Clica em Cancelar: modal fecha e token continua presente
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByText("Encerrar Sessão")).toBeNull();
    expect(localStorage.getItem("sirius_token")).toBe("fake-admin-token");
    expect(mockPush).not.toHaveBeenCalled();

    // Clica em Sair novamente e depois em Confirmar Saída
    fireEvent.click(screen.getByRole("button", { name: /sair/i }));
    expect(screen.getByText("Encerrar Sessão")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /confirmar saída/i }));
    expect(screen.queryByText("Encerrar Sessão")).toBeNull();
    expect(localStorage.getItem("sirius_token")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/admin/login");
  });
});
