import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RedefinirSenhaPage from "@/app/(public)/redefinir-senha/page";
import { api } from "@/lib/api";

const mockGet = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RedefinirSenhaPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe aviso quando nenhum token é fornecido na URL", async () => {
    mockGet.mockReturnValue(null);

    render(<RedefinirSenhaPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum token de redefinição de senha foi encontrado na URL.")
      ).toBeDefined();
    });
  });

  it("valida o token e renderiza formulário para redefinir senha", async () => {
    mockGet.mockReturnValue("valid-token-123");
    (api.get as any).mockResolvedValue({
      valid: true,
      name: "Roberta Alves",
      email: "roberta@exemplo.com",
    });

    render(<RedefinirSenhaPage />);

    await waitFor(() => {
      expect(screen.getByText("Roberta Alves")).toBeDefined();
      expect(screen.getByText("roberta@exemplo.com")).toBeDefined();
    });

    expect(screen.getByTestId("new-password-input")).toBeDefined();
    expect(screen.getByTestId("confirm-new-password-input")).toBeDefined();
    expect(screen.getByTestId("password-requirements-box")).toBeDefined();
    expect(screen.getByText("Mínimo de 12 caracteres")).toBeDefined();
    expect(screen.getByText("Pelo menos uma letra maiúscula (A-Z)")).toBeDefined();
    expect(screen.getByText("Pelo menos uma letra minúscula (a-z)")).toBeDefined();
    expect(screen.getByText("Pelo menos um número (0-9)")).toBeDefined();
    expect(screen.getByText("Pelo menos um caractere especial (!@#$%^&*...)")).toBeDefined();
  });

  it("bloqueia o envio se a senha não atender aos 5 requisitos de segurança", async () => {
    const { toast } = await import("@/components/Toast");
    mockGet.mockReturnValue("valid-token-123");
    (api.get as any).mockResolvedValue({
      valid: true,
      name: "Roberta Alves",
      email: "roberta@exemplo.com",
    });

    render(<RedefinirSenhaPage />);

    await waitFor(() => {
      expect(screen.getByTestId("new-password-input")).toBeDefined();
    });

    // Senha com menos de 12 caracteres
    fireEvent.change(screen.getByTestId("new-password-input"), {
      target: { value: "Fraca@1" },
    });
    fireEvent.change(screen.getByTestId("confirm-new-password-input"), {
      target: { value: "Fraca@1" },
    });

    fireEvent.click(screen.getByTestId("submit-new-password-btn"));

    expect(toast.error).toHaveBeenCalledWith(
      "A senha deve atender a todos os 5 requisitos de segurança."
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it("permite preencher e salvar a nova senha com sucesso quando atende a todos os requisitos", async () => {
    mockGet.mockReturnValue("valid-token-123");
    (api.get as any).mockResolvedValue({
      valid: true,
      name: "Roberta Alves",
      email: "roberta@exemplo.com",
    });
    (api.post as any).mockResolvedValue({
      success: true,
      message: "Senha redefinida com sucesso!",
    });

    render(<RedefinirSenhaPage />);

    await waitFor(() => {
      expect(screen.getByTestId("new-password-input")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("new-password-input"), {
      target: { value: "NovaSenhaForte@2026" },
    });
    fireEvent.change(screen.getByTestId("confirm-new-password-input"), {
      target: { value: "NovaSenhaForte@2026" },
    });

    fireEvent.click(screen.getByTestId("submit-new-password-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "valid-token-123",
        password: "NovaSenhaForte@2026",
      });
      expect(screen.getByText("Senha redefinida com sucesso!")).toBeDefined();
      expect(screen.getByTestId("go-to-login-btn")).toBeDefined();
    });
  });
});
