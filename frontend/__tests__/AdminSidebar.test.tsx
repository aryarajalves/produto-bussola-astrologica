import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminSidebar from "@/components/AdminSidebar";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  it("renderiza o logo, título Bussola Astrologica e subtítulo do painel", () => {
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText("Bussola Astrologica")).toBeDefined();
    expect(screen.getByText("Painel de Gestão Cósmica")).toBeDefined();
  });

  it("renderiza os títulos de categoria Geral e Segurança", () => {
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText("Geral")).toBeDefined();
    expect(screen.getByText("Segurança")).toBeDefined();
  });

  it("renderiza os botões Home, Pesquisa, Histórico, Backup Automático, Sistema de Logs, Gestão de Usuários e Sair", () => {
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /home/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /pesquisa/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /histórico/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /backup automático/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sistema de logs/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /gestão de usuários/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sair/i })).toBeDefined();
  });

  it("chama onSelectTab ao clicar no botão Pesquisa", () => {
    const handleSelect = vi.fn();
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={handleSelect}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /pesquisa/i }));
    expect(handleSelect).toHaveBeenCalledWith("pesquisa");
  });

  it("chama onSelectTab ao clicar no botão Histórico", () => {
    const handleSelect = vi.fn();
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={handleSelect}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /histórico/i }));
    expect(handleSelect).toHaveBeenCalledWith("historico");
  });

  it("chama onSelectTab ao clicar no botão Backup Automático", () => {
    const handleSelect = vi.fn();
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={handleSelect}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /backup automático/i }));
    expect(handleSelect).toHaveBeenCalledWith("backup_automatico");
  });

  it("chama onSelectTab ao clicar no botão Sistema de Logs", () => {
    const handleSelect = vi.fn();
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={handleSelect}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /sistema de logs/i }));
    expect(handleSelect).toHaveBeenCalledWith("sistema_logs");
  });

  it("chama onSelectTab ao clicar no botão Gestão de Usuários", () => {
    const handleSelect = vi.fn();
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={handleSelect}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /gestão de usuários/i }));
    expect(handleSelect).toHaveBeenCalledWith("gestao_usuarios");
  });

  it("chama onLogout ao clicar no botão Sair", () => {
    const handleLogout = vi.fn();
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={vi.fn()}
        onLogout={handleLogout}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /sair/i }));
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it("renderiza o nome e email do usuário logado fornecido via prop currentUser acima do botão Sair", () => {
    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={vi.fn()}
        onLogout={vi.fn()}
        currentUser={{ name: "Aryaraj Fernandes", email: "aryarajunity@gmail.com" }}
      />
    );

    expect(screen.getByText("Aryaraj Fernandes")).toBeDefined();
    expect(screen.getByText("aryarajunity@gmail.com")).toBeDefined();
    expect(screen.getByTestId("current-user-card")).toBeDefined();
  });

  it("busca e exibe o nome e email do usuário logado via /auth/me se currentUser não for passado", async () => {
    localStorage.setItem("sirius_token", "test-token");
    (api.get as any).mockResolvedValueOnce({
      name: "Aryaraj Fernandes",
      email: "aryarajunity@gmail.com",
    });

    render(
      <AdminSidebar
        activeTab="home"
        onSelectTab={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Aryaraj Fernandes")).toBeDefined();
      expect(screen.getByText("aryarajunity@gmail.com")).toBeDefined();
    });
  });
});
