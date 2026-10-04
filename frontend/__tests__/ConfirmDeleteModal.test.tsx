import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

describe("ConfirmDeleteModal Component", () => {
  it("não renderiza quando isOpen for false", () => {
    const { container } = render(
      <ConfirmDeleteModal
        isOpen={false}
        title="Excluir Usuários"
        message="Tem certeza?"
        count={2}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza o modal centralizado com backdrop e botões quando isOpen for true", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDeleteModal
        isOpen={true}
        title="Excluir Usuários Selecionados"
        message="Esta ação é irreversível."
        count={3}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId("confirm-delete-modal-backdrop")).toBeDefined();
    expect(screen.getByText("Excluir Usuários Selecionados")).toBeDefined();
    expect(screen.getByText("Esta ação é irreversível.")).toBeDefined();
    expect(screen.getByText(/3/)).toBeDefined();

    // Clicar em Cancelar
    const cancelBtn = screen.getByTestId("cancel-delete-btn");
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();

    // Clicar em Confirmar
    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("desativa botões e exibe estado de carregamento quando loading for true", () => {
    render(
      <ConfirmDeleteModal
        isOpen={true}
        title="Excluir Usuários"
        message="Aguarde..."
        count={1}
        loading={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const confirmBtn = screen.getByTestId("confirm-delete-btn") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    expect(screen.getByText("Excluindo...")).toBeDefined();
  });
});
