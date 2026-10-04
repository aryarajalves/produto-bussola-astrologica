import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ListaConvites from "@/components/ListaConvites";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock do navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("ListaConvites Component", () => {
  const mockInvitesResponse = {
    total: 3,
    items: [
      {
        id: "inv-1",
        token: "tok-1",
        role: "client",
        validity_type: "24h",
        created_at: "2026-03-20T10:00:00Z",
        expires_at: "2026-03-21T10:00:00Z",
        is_used: false,
        used_at: null,
        status: "active",
        invite_path: "/cadastro?token=tok-1",
      },
      {
        id: "inv-2",
        token: "tok-2",
        role: "admin",
        validity_type: "never",
        created_at: "2026-03-10T10:00:00Z",
        expires_at: null,
        is_used: true,
        used_at: "2026-03-11T12:00:00Z",
        status: "used",
        invite_path: "/cadastro?token=tok-2",
      },
      {
        id: "inv-3",
        token: "tok-3",
        role: "client",
        validity_type: "48h",
        created_at: "2026-03-01T10:00:00Z",
        expires_at: "2026-03-03T10:00:00Z",
        is_used: false,
        used_at: null,
        status: "expired",
        invite_path: "/cadastro?token=tok-3",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue(mockInvitesResponse);
  });

  it("carrega e renderiza os cards de métricas de convites", async () => {
    render(<ListaConvites />);

    await waitFor(() => {
      expect(screen.getByText("Total de Convites")).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith("/admin/invites");
    expect(screen.getByText("Disponíveis (Ativos)")).toBeDefined();
    expect(screen.getByText("Utilizados")).toBeDefined();
    expect(screen.getByText("Expirados")).toBeDefined();
  });

  it("renderiza a listagem com badges de status de cada convite", async () => {
    render(<ListaConvites />);

    await waitFor(() => {
      expect(screen.getByText("● Disponível")).toBeDefined();
      expect(screen.getByText("✓ Utilizado")).toBeDefined();
      expect(screen.getByText("✕ Expirado")).toBeDefined();
    });

    expect(screen.getAllByText("🎓 Aluno").length).toBe(2);
    expect(screen.getByText("🛡️ Administrador")).toBeDefined();
  });

  it("permite filtrar convites por status localmente", async () => {
    render(<ListaConvites />);

    await waitFor(() => {
      expect(screen.getByTestId("status-filter-select")).toBeDefined();
    });

    const statusFilter = screen.getByTestId("status-filter-select");
    fireEvent.change(statusFilter, { target: { value: "active" } });

    // Apenas o ativo deve estar visível
    expect(screen.getByText("● Disponível")).toBeDefined();
    expect(screen.queryByText("✓ Utilizado")).toBeNull();
    expect(screen.queryByText("✕ Expirado")).toBeNull();
  });

  it("permite copiar o link do convite para a área de transferência", async () => {
    render(<ListaConvites />);

    await waitFor(() => {
      expect(screen.getAllByTestId("copy-invite-url-btn").length).toBe(3);
    });

    const copyButtons = screen.getAllByTestId("copy-invite-url-btn");
    fireEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("permite selecionar múltiplos convites e exclui em massa após confirmação", async () => {
    (api.delete as any).mockResolvedValue({
      data: { success: true, deleted_count: 2 },
    });

    render(<ListaConvites />);

    await waitFor(() => {
      expect(screen.getByTestId("select-invite-inv-1")).toBeDefined();
    });

    const chk1 = screen.getByTestId("select-invite-inv-1") as HTMLInputElement;
    const chk2 = screen.getByTestId("select-invite-inv-2") as HTMLInputElement;
    expect(chk1.checked).toBe(false);
    expect(chk2.checked).toBe(false);

    // Selecionar convite 1
    fireEvent.click(chk1);
    expect(chk1.checked).toBe(true);

    // Barra de ações em lote deve aparecer com contador
    await waitFor(() => {
      expect(screen.getByTestId("batch-delete-invites-btn")).toBeDefined();
      expect(screen.getByText(/1 selecionado/)).toBeDefined();
    });

    // Selecionar convite 2 também
    fireEvent.click(chk2);
    await waitFor(() => {
      expect(screen.getByText(/2 selecionado/)).toBeDefined();
    });

    // Clicar para excluir selecionados
    const deleteBatchBtn = screen.getByTestId("batch-delete-invites-btn");
    fireEvent.click(deleteBatchBtn);

    // Modal de confirmação deve aparecer
    await waitFor(() => {
      expect(screen.getByTestId("confirm-delete-modal-backdrop")).toBeDefined();
      expect(screen.getByText("Excluir Convites Selecionados")).toBeDefined();
    });

    // Confirmar a exclusão
    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/invites/batch", {
        ids: ["inv-1", "inv-2"],
      });
    });
  });

  it("permite selecionar e desmarcar todos os convites da página via checkbox mestre", async () => {
    render(<ListaConvites />);

    await waitFor(() => {
      expect(screen.getByTestId("select-all-invites-btn")).toBeDefined();
    });

    const masterCheckbox = screen.getByTestId("select-all-invites-btn") as HTMLInputElement;
    expect(masterCheckbox.checked).toBe(false);

    // Selecionar todos
    fireEvent.click(masterCheckbox);

    const chk1 = screen.getByTestId("select-invite-inv-1") as HTMLInputElement;
    const chk2 = screen.getByTestId("select-invite-inv-2") as HTMLInputElement;
    const chk3 = screen.getByTestId("select-invite-inv-3") as HTMLInputElement;
    expect(chk1.checked).toBe(true);
    expect(chk2.checked).toBe(true);
    expect(chk3.checked).toBe(true);

    // Desmarcar todos
    fireEvent.click(masterCheckbox);
    expect(chk1.checked).toBe(false);
    expect(chk2.checked).toBe(false);
    expect(chk3.checked).toBe(false);
  });

  it("permite excluir um convite individualmente pelo botão de excluir", async () => {
    render(<ListaConvites />);

    await waitFor(() => {
      expect(screen.getByTestId("delete-invite-btn-inv-1")).toBeDefined();
    });

    // Clicar no botão excluir do convite 1
    fireEvent.click(screen.getByTestId("delete-invite-btn-inv-1"));

    // Modal de confirmação deve abrir
    await waitFor(() => {
      expect(screen.getByTestId("confirm-delete-modal-backdrop")).toBeDefined();
      expect(screen.getByText("Excluir Convite")).toBeDefined();
    });

    // Confirmar exclusão
    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/invites/batch", {
        ids: ["inv-1"],
      });
    });
  });
});

