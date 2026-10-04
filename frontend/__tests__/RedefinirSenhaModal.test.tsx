import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RedefinirSenhaModal from "@/components/RedefinirSenhaModal";
import { toast } from "@/components/Toast";

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RedefinirSenhaModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("não renderiza quando isOpen é false", () => {
    const { container } = render(
      <RedefinirSenhaModal
        isOpen={false}
        userName="Maria Antônia"
        userEmail="maria@exemplo.com"
        resetUrl="/redefinir-senha?token=abc-123"
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza corretamente com dados do usuário e link", () => {
    render(
      <RedefinirSenhaModal
        isOpen={true}
        userName="Maria Antônia"
        userEmail="maria@exemplo.com"
        resetUrl="/redefinir-senha?token=abc-123"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Maria Antônia")).toBeDefined();
    expect(screen.getByText("maria@exemplo.com")).toBeDefined();
    const input = screen.getByTestId("reset-password-url-input") as HTMLInputElement;
    expect(input.value).toContain("/redefinir-senha?token=abc-123");
  });

  it("copia o link de redefinição para a área de transferência ao clicar no botão copiar", async () => {
    render(
      <RedefinirSenhaModal
        isOpen={true}
        userName="Maria Antônia"
        userEmail="maria@exemplo.com"
        resetUrl="/redefinir-senha?token=abc-123"
        onClose={vi.fn()}
      />
    );

    const copyBtn = screen.getByTestId("copy-reset-url-btn");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/redefinir-senha?token=abc-123")
      );
      expect(toast.success).toHaveBeenCalledWith("Link de redefinição copiado com sucesso!");
    });
  });

  it("chama onClose ao clicar nos botões de fechar", () => {
    const onCloseMock = vi.fn();
    render(
      <RedefinirSenhaModal
        isOpen={true}
        userName="Maria Antônia"
        userEmail="maria@exemplo.com"
        resetUrl="/redefinir-senha?token=abc-123"
        onClose={onCloseMock}
      />
    );

    fireEvent.click(screen.getByTestId("close-reset-modal-btn"));
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("finish-reset-modal-btn"));
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });
});
